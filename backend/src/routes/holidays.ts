import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { holidays, departments } from '../db/schema';
import { eq, sql, and, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const holidaySchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['national', 'provincial']),
  departmentId: z.string().uuid().optional().nullable(),
});

const replicateSchema = z.object({
  sourceYear: z.number().int().min(2000).max(2100),
  targetYear: z.number().int().min(2000).max(2100),
  type: z.enum(['national', 'provincial', 'all']).optional(),
});

export const holidayRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /api/holidays - Listar feriados con filtros
  fastify.get('/', async (request, reply) => {
    const { year, type } = request.query as { year?: string; type?: string };
    
    let conditions = [eq(holidays.isActive, true)];
    
    if (year) {
      conditions.push(eq(holidays.year, parseInt(year)));
    }
    
    if (type && (type === 'national' || type === 'provincial')) {
      conditions.push(eq(holidays.type, type));
    }
    
    const allHolidays = await db
      .select({
        id: holidays.id,
        name: holidays.name,
        description: holidays.description,
        date: holidays.date,
        year: holidays.year,
        type: holidays.type,
        departmentId: holidays.departmentId,
        departmentName: departments.name,
        isActive: holidays.isActive,
        createdAt: holidays.createdAt,
      })
      .from(holidays)
      .leftJoin(departments, eq(holidays.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(asc(holidays.date));
    
    return { data: allHolidays };
  });

  // GET /api/holidays/years - Obtener años disponibles
  fastify.get('/years', async (request, reply) => {
    const years = await db
      .selectDistinct({ year: holidays.year })
      .from(holidays)
      .where(eq(holidays.isActive, true))
      .orderBy(desc(holidays.year));
    
    return { data: years.map(y => y.year) };
  });

  // GET /api/holidays/:id - Obtener un feriado
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [holiday] = await db
      .select({
        id: holidays.id,
        name: holidays.name,
        description: holidays.description,
        date: holidays.date,
        year: holidays.year,
        type: holidays.type,
        departmentId: holidays.departmentId,
        departmentName: departments.name,
        isActive: holidays.isActive,
        createdAt: holidays.createdAt,
      })
      .from(holidays)
      .leftJoin(departments, eq(holidays.departmentId, departments.id))
      .where(eq(holidays.id, id))
      .limit(1);
    
    if (!holiday) {
      return reply.code(404).send({ error: 'Feriado no encontrado' });
    }
    
    return holiday;
  });

  // POST /api/holidays - Crear feriado
  fastify.post('/', async (request, reply) => {
    try {
      const validatedData = holidaySchema.parse(request.body);
      
      // Validar que los feriados provinciales tengan departamento
      if (validatedData.type === 'provincial' && !validatedData.departmentId) {
        return reply.code(400).send({ 
          error: 'Los feriados provinciales requieren seleccionar un departamento' 
        });
      }
      
      // Extraer año de la fecha
      const year = parseInt(validatedData.date.split('-')[0]);
      
      const [newHoliday] = await db
        .insert(holidays)
        .values({
          name: validatedData.name,
          description: validatedData.description || null,
          date: validatedData.date,
          year,
          type: validatedData.type,
          departmentId: validatedData.type === 'national' ? null : validatedData.departmentId,
        })
        .returning();
      
      return { success: true, data: newHoliday };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/holidays/:id - Editar feriado
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = holidaySchema.partial().parse(request.body);
      
      // Si se actualiza la fecha, actualizar también el año
      let year: number | undefined;
      if (validatedData.date) {
        year = parseInt(validatedData.date.split('-')[0]);
      }
      
      const [updated] = await db
        .update(holidays)
        .set({
          ...validatedData,
          ...(year && { year }),
          departmentId: validatedData.type === 'national' ? null : validatedData.departmentId,
        })
        .where(eq(holidays.id, id))
        .returning();
      
      if (!updated) {
        return reply.code(404).send({ error: 'Feriado no encontrado' });
      }
      
      return { success: true, data: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/holidays/:id - Eliminar feriado (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [updated] = await db
      .update(holidays)
      .set({ isActive: false })
      .where(eq(holidays.id, id))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Feriado no encontrado' });
    }
    
    return { success: true };
  });

  // POST /api/holidays/replicate - Replicar feriados del año anterior
  fastify.post('/replicate', async (request, reply) => {
    try {
      const validatedData = replicateSchema.parse(request.body);
      const { sourceYear, targetYear, type } = validatedData;
      
      // Verificar que no sea el mismo año
      if (sourceYear === targetYear) {
        return reply.code(400).send({ error: 'El año origen y destino no pueden ser iguales' });
      }
      
      // Obtener feriados del año origen
      let conditions = [
        eq(holidays.year, sourceYear),
        eq(holidays.isActive, true),
      ];
      
      if (type && type !== 'all') {
        conditions.push(eq(holidays.type, type));
      }
      
      const sourceHolidays = await db
        .select()
        .from(holidays)
        .where(and(...conditions));
      
      if (sourceHolidays.length === 0) {
        return reply.code(404).send({ 
          error: `No se encontraron feriados en el año ${sourceYear}` 
        });
      }
      
      // Verificar cuántos ya existen en el año destino
      const [existingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(holidays)
        .where(and(
          eq(holidays.year, targetYear),
          eq(holidays.isActive, true)
        ));
      
      // Crear feriados para el nuevo año
      const newHolidays = sourceHolidays.map(h => {
        // Actualizar solo el año en la fecha
        const newDate = h.date.replace(/^\d{4}/, targetYear.toString());
        
        return {
          name: h.name,
          description: h.description,
          date: newDate,
          year: targetYear,
          type: h.type,
          departmentId: h.departmentId,
        };
      });
      
      await db.insert(holidays).values(newHolidays);
      
      return { 
        success: true, 
        message: `Se replicaron ${newHolidays.length} feriados de ${sourceYear} a ${targetYear}`,
        count: newHolidays.length,
        previousCount: existingCount.count,
      };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/holidays/by-date-range - Obtener feriados por rango de fechas
  // Útil para la generación de calendarios
  fastify.get('/by-date-range', async (request, reply) => {
    const { startDate, endDate, departmentId } = request.query as { 
      startDate: string; 
      endDate: string;
      departmentId?: string;
    };
    
    if (!startDate || !endDate) {
      return reply.code(400).send({ error: 'Se requieren startDate y endDate' });
    }
    
    // Obtener feriados nacionales + provinciales del departamento
    const holidayList = await db
      .select({
        id: holidays.id,
        name: holidays.name,
        date: holidays.date,
        type: holidays.type,
        departmentId: holidays.departmentId,
      })
      .from(holidays)
      .where(and(
        eq(holidays.isActive, true),
        sql`${holidays.date} >= ${startDate}::date`,
        sql`${holidays.date} <= ${endDate}::date`,
        departmentId 
          ? sql`(${holidays.type} = 'national' OR ${holidays.departmentId} = ${departmentId}::uuid)`
          : eq(holidays.type, 'national')
      ))
      .orderBy(asc(holidays.date));
    
    return { data: holidayList };
  });
};
