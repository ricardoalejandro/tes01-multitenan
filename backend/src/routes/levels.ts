import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { levels } from '../db/schema';
import { eq, sql, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const levelSchema = z.object({
  name: z.string().min(1).max(100),
  managerName: z.string().max(150).optional().nullable(),
  managerPhone: z.string().max(20).optional().nullable(),
});

// Función para generar código automático
async function generateLevelCode(): Promise<string> {
  const [result] = await db
    .select({ 
      maxCode: sql<string>`MAX(SUBSTRING(code FROM 5)::int)` 
    })
    .from(levels);
  
  const nextNumber = (parseInt(result?.maxCode || '0') || 0) + 1;
  return `NVL-${nextNumber.toString().padStart(3, '0')}`;
}

export const levelRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /api/levels - Listar todos los niveles
  fastify.get('/', async (request, reply) => {
    const allLevels = await db
      .select()
      .from(levels)
      .where(eq(levels.isActive, true))
      .orderBy(asc(levels.code));
    
    return { data: allLevels };
  });

  // GET /api/levels/:id - Obtener un nivel
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [level] = await db
      .select()
      .from(levels)
      .where(eq(levels.id, id))
      .limit(1);
    
    if (!level) {
      return reply.code(404).send({ error: 'Nivel no encontrado' });
    }
    
    return level;
  });

  // POST /api/levels - Crear nivel
  fastify.post('/', async (request, reply) => {
    try {
      const validatedData = levelSchema.parse(request.body);
      const code = await generateLevelCode();
      
      const [newLevel] = await db
        .insert(levels)
        .values({
          code,
          name: validatedData.name,
          managerName: validatedData.managerName || null,
          managerPhone: validatedData.managerPhone || null,
        })
        .returning();
      
      return { success: true, data: newLevel };
    } catch (error: any) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Ya existe un nivel con ese código' });
      }
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/levels/:id - Editar nivel
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = levelSchema.partial().parse(request.body);
      
      const [updated] = await db
        .update(levels)
        .set({
          ...validatedData,
          updatedAt: sql`NOW()`,
        })
        .where(eq(levels.id, id))
        .returning();
      
      if (!updated) {
        return reply.code(404).send({ error: 'Nivel no encontrado' });
      }
      
      return { success: true, data: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/levels/:id - Eliminar nivel (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [updated] = await db
      .update(levels)
      .set({ 
        isActive: false,
        updatedAt: sql`NOW()`,
      })
      .where(eq(levels.id, id))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Nivel no encontrado' });
    }
    
    return { success: true };
  });
};
