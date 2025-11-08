import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { students } from '../db/schema';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { redisClient } from '../index';
import { z } from 'zod';

// Validation schema
const studentSchema = z.object({
  branchId: z.string().uuid(),
  documentType: z.enum(['DNI', 'CNE', 'Pasaporte']),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener exactamente 8 dígitos numéricos'),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  firstName: z.string().min(1, 'Nombre es requerido'),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  admissionDate: z.string(),
  admissionReason: z.enum(['Traslado', 'Recuperado', 'Nuevo']),
  status: z.enum(['Activo', 'Fluctuante', 'Inactivo', 'Baja']).optional(),
  monthlyFee: z.string().optional(),
  address: z.string().optional().or(z.literal('')),
  department: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
}).refine(
  (data) => {
    if (!data.birthDate) return true;
    return new Date(data.birthDate) < new Date(data.admissionDate);
  },
  {
    message: 'La fecha de nacimiento debe ser anterior a la fecha de admisión',
    path: ['birthDate'],
  }
);

export const studentRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all students with pagination and search
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;
    
    const cacheKey = `students:${branchId}:${page}:${limit}:${search}`;
    
    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build where conditions
    const conditions = [eq(students.branchId, branchId)];
    if (search) {
      conditions.push(
        sql`(${students.firstName} ILIKE ${`%${search}%`} OR ${students.paternalLastName} ILIKE ${`%${search}%`} OR ${students.dni} ILIKE ${`%${search}%`} OR ${students.email} ILIKE ${`%${search}%`})`
      );
    }
    
    const [studentList, [{ count }]] = await Promise.all([
      db.select().from(students)
        .where(and(...conditions))
        .orderBy(desc(students.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(students).where(eq(students.branchId, branchId)),
    ]);
    
    const result = {
      data: studentList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    };
    
    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    
    return result;
  });

  // Get student by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [student] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }
    
    return student;
  });

  // Create student with validation
  fastify.post('/', async (request, reply) => {
    try {
      const validatedData = studentSchema.parse(request.body);
      const [student] = await db.insert(students).values(validatedData as any).returning();
      
      // Invalidate cache
      const keys = await redisClient.keys(`students:${validatedData.branchId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      return student;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      throw error;
    }
  });

  // Update student with validation
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = studentSchema.partial().parse(request.body);
      
      const [student] = await db
        .update(students)
        .set({ ...validatedData, updatedAt: new Date() } as any)
        .where(eq(students.id, id))
        .returning();
      
      if (!student) {
        return reply.code(404).send({ error: 'Student not found' });
      }
      
      // Invalidate cache
      const keys = await redisClient.keys(`students:${student.branchId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      return student;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      throw error;
    }
  });

  // Delete student
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(students).where(eq(students.id, id));
    return { success: true };
  });
};
