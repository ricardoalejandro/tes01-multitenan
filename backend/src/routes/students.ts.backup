import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { students } from '../db/schema';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { redisClient } from '../index';
import { z } from 'zod';

// Base validation schema without refinement
const studentBaseSchema = z.object({
  branchId: z.string().uuid(),
  documentType: z.enum(['DNI', 'CNE', 'Pasaporte']),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener exactamente 8 dígitos numéricos'),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  firstName: z.string().min(1, 'Nombre es requerido'),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform(val => val === '' ? null : val),
  phone: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  birthDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  admissionDate: z.string(),
  admissionReason: z.enum(['Traslado', 'Recuperado', 'Nuevo']),
  status: z.enum(['Activo', 'Fluctuante', 'Inactivo', 'Baja']).optional(),
  monthlyFee: z.union([z.number(), z.string()]).optional().transform(val => {
    if (val === '' || val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  address: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  department: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  province: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  district: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
});

// Schema for creating with refinement
const studentCreateSchema = studentBaseSchema.refine(
  (data) => {
    if (!data.birthDate) return true;
    return new Date(data.birthDate) < new Date(data.admissionDate);
  },
  {
    message: 'La fecha de nacimiento debe ser anterior a la fecha de admisión',
    path: ['birthDate'],
  }
);

// Schema for updating (partial)
const studentUpdateSchema = studentBaseSchema.partial();

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
    
    // Build where conditions (exclude deleted)
    const conditions = [
      eq(students.branchId, branchId),
      sql`${students.status} != 'Eliminado'`
    ];
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
      db.select({ count: sql<number>`count(*)::int` }).from(students).where(and(eq(students.branchId, branchId), sql`${students.status} != 'Eliminado'`)),
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
      const validatedData = studentCreateSchema.parse(request.body);
      
      // Check for duplicate (documentType, dni)
      const [existing] = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.documentType, validatedData.documentType),
            eq(students.dni, validatedData.dni),
            sql`${students.status} != 'Eliminado'`
          )
        )
        .limit(1);
      
      if (existing) {
        return reply.code(409).send({ 
          error: 'Ya existe un probacionista con este tipo y número de documento',
          field: 'dni',
          type: 'validation'
        });
      }
      
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
      const validatedData = studentUpdateSchema.parse(request.body);
      
      // Check for duplicate (documentType, dni) if these fields are being updated
      if (validatedData.documentType || validatedData.dni) {
        const currentStudent = await db.select().from(students).where(eq(students.id, id)).limit(1);
        if (currentStudent.length === 0) {
          return reply.code(404).send({ error: 'Student not found' });
        }
        
        const docType = validatedData.documentType || currentStudent[0].documentType;
        const dniValue = validatedData.dni || currentStudent[0].dni;
        
        const [existing] = await db
          .select()
          .from(students)
          .where(
            and(
              eq(students.documentType, docType),
              eq(students.dni, dniValue),
              sql`${students.id} != ${id}`,
              sql`${students.status} != 'Eliminado'`
            )
          )
          .limit(1);
        
        if (existing) {
          return reply.code(409).send({ 
            error: 'Ya existe otro probacionista con este tipo y número de documento',
            field: 'dni',
            type: 'validation'
          });
        }
      }
      
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

  // Delete student (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(students)
      .set({ status: 'Eliminado', updatedAt: new Date() })
      .where(eq(students.id, id));
    return { success: true, message: 'Probacionista marcado como eliminado' };
  });
};
