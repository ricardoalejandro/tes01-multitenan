import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { departments, provinces, districts, branches } from '../db/schema';
import { eq, sql, asc } from 'drizzle-orm';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Interface para los datos de UBIGEO
interface UbigeoData {
  departments: Array<{ code: string; name: string }>;
  provinces: Array<{ code: string; name: string; departmentCode: string }>;
  districts: Array<{ code: string; name: string; provinceCode: string }>;
}

// Validation schemas
const departmentSchema = z.object({
  code: z.string().max(10).optional(),
  name: z.string().min(1).max(100),
});

// Helper function to generate unique code from name
function generateCode(name: string, maxLength: number = 10): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Only alphanumeric
    .substring(0, maxLength - 3); // Leave space for numbers
  
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  return (normalized + timestamp).substring(0, maxLength);
}

const provinceSchema = z.object({
  departmentId: z.string().uuid(),
  code: z.string().max(10).optional(),
  name: z.string().min(1).max(100),
});

const districtSchema = z.object({
  provinceId: z.string().uuid(),
  code: z.string().max(10).optional(),
  name: z.string().min(1).max(100),
});

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  
  // =====================================================
  // DEPARTAMENTOS
  // =====================================================

  // GET /api/departments - Listar todos los departamentos
  fastify.get('/departments', async (request, reply) => {
    const allDepartments = await db
      .select()
      .from(departments)
      .orderBy(asc(departments.name));
    
    return { data: allDepartments };
  });

  // POST /api/departments - Crear departamento
  fastify.post('/departments', async (request, reply) => {
    try {
      const validatedData = departmentSchema.parse(request.body);
      
      // Autogenerar código si no se proporciona
      const dataToInsert = {
        ...validatedData,
        code: validatedData.code || generateCode(validatedData.name),
      };
      
      const [newDepartment] = await db
        .insert(departments)
        .values(dataToInsert)
        .returning();
      
      return { success: true, data: newDepartment };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'Ya existe un departamento con ese código' });
      }
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/departments/:id - Editar departamento
  fastify.put('/departments/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = departmentSchema.partial().parse(request.body);
      
      const [updated] = await db
        .update(departments)
        .set(validatedData)
        .where(eq(departments.id, id))
        .returning();
      
      if (!updated) {
        return reply.code(404).send({ error: 'Departamento no encontrado' });
      }
      
      return { success: true, data: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/departments/:id - Eliminar departamento (con verificación de cascada)
  fastify.delete('/departments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { force } = request.query as { force?: string };
    
    // Verificar si tiene provincias asociadas
    const [provinceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(provinces)
      .where(eq(provinces.departmentId, id));
    
    // Verificar si tiene filiales asociadas
    const [branchCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(branches)
      .where(eq(branches.departmentId, id));
    
    if ((provinceCount.count > 0 || branchCount.count > 0) && force !== 'true') {
      return reply.code(409).send({
        error: 'Este departamento tiene datos asociados',
        details: {
          provinces: provinceCount.count,
          branches: branchCount.count,
        },
        message: `Se eliminarán ${provinceCount.count} provincias (con sus distritos) y se desvinculará de ${branchCount.count} filiales. ¿Desea continuar?`,
      });
    }
    
    // Desvincular branches primero
    await db
      .update(branches)
      .set({ departmentId: null, provinceId: null, districtId: null })
      .where(eq(branches.departmentId, id));
    
    // Eliminar departamento (cascade eliminará provincias y distritos)
    await db.delete(departments).where(eq(departments.id, id));
    
    return { success: true };
  });

  // =====================================================
  // PROVINCIAS
  // =====================================================

  // GET /api/provinces - Listar provincias (filtro opcional por departamento)
  fastify.get('/provinces', async (request, reply) => {
    const { departmentId } = request.query as { departmentId?: string };
    
    let query = db
      .select({
        id: provinces.id,
        departmentId: provinces.departmentId,
        departmentName: departments.name,
        code: provinces.code,
        name: provinces.name,
        createdAt: provinces.createdAt,
      })
      .from(provinces)
      .innerJoin(departments, eq(provinces.departmentId, departments.id))
      .orderBy(asc(provinces.name));
    
    if (departmentId) {
      query = query.where(eq(provinces.departmentId, departmentId)) as typeof query;
    }
    
    const allProvinces = await query;
    return { data: allProvinces };
  });

  // POST /api/provinces - Crear provincia
  fastify.post('/provinces', async (request, reply) => {
    try {
      const validatedData = provinceSchema.parse(request.body);
      
      const [newProvince] = await db
        .insert(provinces)
        .values(validatedData)
        .returning();
      
      return { success: true, data: newProvince };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/provinces/:id - Editar provincia
  fastify.put('/provinces/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = provinceSchema.partial().parse(request.body);
      
      const [updated] = await db
        .update(provinces)
        .set(validatedData)
        .where(eq(provinces.id, id))
        .returning();
      
      if (!updated) {
        return reply.code(404).send({ error: 'Provincia no encontrada' });
      }
      
      return { success: true, data: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/provinces/:id - Eliminar provincia (con verificación de cascada)
  fastify.delete('/provinces/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { force } = request.query as { force?: string };
    
    // Verificar si tiene distritos asociados
    const [districtCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(districts)
      .where(eq(districts.provinceId, id));
    
    // Verificar si tiene filiales asociadas
    const [branchCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(branches)
      .where(eq(branches.provinceId, id));
    
    if ((districtCount.count > 0 || branchCount.count > 0) && force !== 'true') {
      return reply.code(409).send({
        error: 'Esta provincia tiene datos asociados',
        details: {
          districts: districtCount.count,
          branches: branchCount.count,
        },
        message: `Se eliminarán ${districtCount.count} distritos y se desvinculará de ${branchCount.count} filiales. ¿Desea continuar?`,
      });
    }
    
    // Desvincular branches primero
    await db
      .update(branches)
      .set({ provinceId: null, districtId: null })
      .where(eq(branches.provinceId, id));
    
    // Eliminar provincia (cascade eliminará distritos)
    await db.delete(provinces).where(eq(provinces.id, id));
    
    return { success: true };
  });

  // =====================================================
  // DISTRITOS
  // =====================================================

  // GET /api/districts - Listar distritos (filtro opcional por provincia)
  fastify.get('/districts', async (request, reply) => {
    const { provinceId } = request.query as { provinceId?: string };
    
    let query = db
      .select({
        id: districts.id,
        provinceId: districts.provinceId,
        provinceName: provinces.name,
        code: districts.code,
        name: districts.name,
        createdAt: districts.createdAt,
      })
      .from(districts)
      .innerJoin(provinces, eq(districts.provinceId, provinces.id))
      .orderBy(asc(districts.name));
    
    if (provinceId) {
      query = query.where(eq(districts.provinceId, provinceId)) as typeof query;
    }
    
    const allDistricts = await query;
    return { data: allDistricts };
  });

  // POST /api/districts - Crear distrito
  fastify.post('/districts', async (request, reply) => {
    try {
      const validatedData = districtSchema.parse(request.body);
      
      const [newDistrict] = await db
        .insert(districts)
        .values(validatedData)
        .returning();
      
      return { success: true, data: newDistrict };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/districts/:id - Editar distrito
  fastify.put('/districts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = districtSchema.partial().parse(request.body);
      
      const [updated] = await db
        .update(districts)
        .set(validatedData)
        .where(eq(districts.id, id))
        .returning();
      
      if (!updated) {
        return reply.code(404).send({ error: 'Distrito no encontrado' });
      }
      
      return { success: true, data: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/districts/:id - Eliminar distrito
  fastify.delete('/districts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { force } = request.query as { force?: string };
    
    // Verificar si tiene filiales asociadas
    const [branchCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(branches)
      .where(eq(branches.districtId, id));
    
    if (branchCount.count > 0 && force !== 'true') {
      return reply.code(409).send({
        error: 'Este distrito tiene filiales asociadas',
        details: {
          branches: branchCount.count,
        },
        message: `Se desvinculará de ${branchCount.count} filiales. ¿Desea continuar?`,
      });
    }
    
    // Desvincular branches primero
    await db
      .update(branches)
      .set({ districtId: null })
      .where(eq(branches.districtId, id));
    
    // Eliminar distrito
    await db.delete(districts).where(eq(districts.id, id));
    
    return { success: true };
  });

  // =====================================================
  // CARGA MASIVA IDEMPOTENTE DE UBIGEO PERÚ
  // =====================================================

  // POST /api/locations/seed-peru - Cargar datos de UBIGEO Perú (idempotente)
  fastify.post('/locations/seed-peru', async (request, reply) => {
    try {
      // Leer archivo de datos (ubicado en src/data, copiado durante build)
      const dataPath = path.join(process.cwd(), 'src/data/ubigeo-peru.json');
      
      if (!fs.existsSync(dataPath)) {
        return reply.code(500).send({ 
          error: 'Archivo de datos no encontrado',
          path: dataPath 
        });
      }
      
      const ubigeoData: UbigeoData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      
      let stats = {
        departments: { inserted: 0, skipped: 0 },
        provinces: { inserted: 0, skipped: 0 },
        districts: { inserted: 0, skipped: 0 },
      };
      
      // Mapas para guardar IDs
      const departmentMap = new Map<string, string>();
      const provinceMap = new Map<string, string>();
      
      // 1. Procesar Departamentos (idempotente por código)
      for (const dept of ubigeoData.departments) {
        // Verificar si ya existe
        const existing = await db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.code, dept.code))
          .limit(1);
        
        if (existing.length > 0) {
          departmentMap.set(dept.code, existing[0].id);
          stats.departments.skipped++;
        } else {
          const [inserted] = await db
            .insert(departments)
            .values({ code: dept.code, name: dept.name })
            .returning({ id: departments.id });
          departmentMap.set(dept.code, inserted.id);
          stats.departments.inserted++;
        }
      }
      
      // 2. Procesar Provincias (idempotente por código)
      for (const prov of ubigeoData.provinces) {
        const departmentId = departmentMap.get(prov.departmentCode);
        if (!departmentId) continue;
        
        const existing = await db
          .select({ id: provinces.id })
          .from(provinces)
          .where(eq(provinces.code, prov.code))
          .limit(1);
        
        if (existing.length > 0) {
          provinceMap.set(prov.code, existing[0].id);
          stats.provinces.skipped++;
        } else {
          const [inserted] = await db
            .insert(provinces)
            .values({ code: prov.code, name: prov.name, departmentId })
            .returning({ id: provinces.id });
          provinceMap.set(prov.code, inserted.id);
          stats.provinces.inserted++;
        }
      }
      
      // 3. Procesar Distritos (idempotente por código)
      for (const dist of ubigeoData.districts) {
        const provinceId = provinceMap.get(dist.provinceCode);
        if (!provinceId) continue;
        
        const existing = await db
          .select({ id: districts.id })
          .from(districts)
          .where(eq(districts.code, dist.code))
          .limit(1);
        
        if (existing.length > 0) {
          stats.districts.skipped++;
        } else {
          await db
            .insert(districts)
            .values({ code: dist.code, name: dist.name, provinceId });
          stats.districts.inserted++;
        }
      }
      
      return {
        success: true,
        message: 'Datos de UBIGEO Perú cargados exitosamente',
        stats,
        totals: {
          departments: stats.departments.inserted + stats.departments.skipped,
          provinces: stats.provinces.inserted + stats.provinces.skipped,
          districts: stats.districts.inserted + stats.districts.skipped,
        }
      };
      
    } catch (error: any) {
      console.error('Error en seed-peru:', error);
      return reply.code(500).send({ 
        error: 'Error al cargar datos de UBIGEO',
        details: error.message 
      });
    }
  });

  // GET /api/locations/stats - Obtener estadísticas de ubicaciones
  fastify.get('/locations/stats', async (request, reply) => {
    const [deptCount] = await db.select({ count: sql<number>`count(*)::int` }).from(departments);
    const [provCount] = await db.select({ count: sql<number>`count(*)::int` }).from(provinces);
    const [distCount] = await db.select({ count: sql<number>`count(*)::int` }).from(districts);
    
    return {
      departments: deptCount.count,
      provinces: provCount.count,
      districts: distCount.count,
      isEmpty: deptCount.count === 0 && provCount.count === 0 && distCount.count === 0,
    };
  });
};
