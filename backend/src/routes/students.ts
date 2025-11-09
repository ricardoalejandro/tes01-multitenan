import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { students, studentBranches, studentTransactions, branches, users } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

// Base validation schema (sin branchId ni status, solo datos globales del probacionista)
const studentBaseSchema = z.object({
  documentType: z.enum(['DNI', 'CNE', 'Pasaporte']),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos numéricos'),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  firstName: z.string().min(1, 'Nombre es requerido'),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform(val => val === '' ? null : val),
  phone: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  birthDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  address: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  department: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  province: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  district: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
});

// Schema para creación (incluye branchId y admissionDate)
const studentCreateSchema = studentBaseSchema.extend({
  branchId: z.string().uuid(),
  admissionDate: z.string().optional(),
}).refine(
  (data) => {
    if (!data.birthDate) return true;
    return new Date(data.birthDate) < new Date();
  },
  { message: 'La fecha de nacimiento debe ser anterior a hoy' }
);

// Schema para actualización (parcial)
const studentUpdateSchema = studentBaseSchema.partial();

// Schema para importar estudiante a otra filial
const studentImportSchema = z.object({
  branchId: z.string().uuid(),
  admissionDate: z.string().optional(),
  observation: z.string().optional(),
});

// Schema para cambiar estado
const studentStatusChangeSchema = z.object({
  branchId: z.string().uuid(),
  status: z.enum(['Alta', 'Baja']),
  observation: z.string().min(5, 'La observación debe tener al menos 5 caracteres'),
});

export const studentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/students - Listar estudiantes de una filial
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // JOIN students con student_branches para obtener estudiantes de la filial
    let queryConditions = [eq(studentBranches.branchId, branchId)];
    
    // Filtro de búsqueda
    if (search) {
      queryConditions.push(
        sql`(${students.firstName} ILIKE ${`%${search}%`} OR ${students.paternalLastName} ILIKE ${`%${search}%`} OR ${students.dni} ILIKE ${`%${search}%`})`
      );
    }
    
    const [studentList, countResult] = await Promise.all([
      db
        .select({
          id: students.id,
          documentType: students.documentType,
          dni: students.dni,
          gender: students.gender,
          firstName: students.firstName,
          paternalLastName: students.paternalLastName,
          maternalLastName: students.maternalLastName,
          email: students.email,
          phone: students.phone,
          birthDate: students.birthDate,
          address: students.address,
          department: students.department,
          province: students.province,
          district: students.district,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt,
          // Desde student_branches
          status: studentBranches.status,
          admissionDate: studentBranches.admissionDate,
        })
        .from(students)
        .innerJoin(studentBranches, eq(students.id, studentBranches.studentId))
        .where(and(...queryConditions))
        .orderBy(desc(students.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(students)
        .innerJoin(studentBranches, eq(students.id, studentBranches.studentId))
        .where(eq(studentBranches.branchId, branchId)),
    ]);
    
    const count = countResult[0]?.count || 0;
    
    return {
      data: studentList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    };
  });

  // GET /api/students/:id - Obtener un estudiante específico
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { branchId } = request.query as any;
    
    const [student] = await db
      .select({
        id: students.id,
        documentType: students.documentType,
        dni: students.dni,
        gender: students.gender,
        firstName: students.firstName,
        paternalLastName: students.paternalLastName,
        maternalLastName: students.maternalLastName,
        email: students.email,
        phone: students.phone,
        birthDate: students.birthDate,
        address: students.address,
        department: students.department,
        province: students.province,
        district: students.district,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        status: studentBranches.status,
        admissionDate: studentBranches.admissionDate,
      })
      .from(students)
      .innerJoin(studentBranches, eq(students.id, studentBranches.studentId))
      .where(and(
        eq(students.id, id),
        eq(studentBranches.branchId, branchId)
      ))
      .limit(1);
    
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }
    
    return student;
  });

  // POST /api/students - Crear nuevo estudiante
  fastify.post('/', async (request, reply) => {
    try {
      const validatedData = studentCreateSchema.parse(request.body);
      const { branchId, admissionDate, ...studentData } = validatedData;
      
      // 1. Verificar si el DNI ya existe globalmente
      const [existing] = await db
        .select({
          id: students.id,
          firstName: students.firstName,
          paternalLastName: students.paternalLastName,
          dni: students.dni,
          email: students.email,
        })
        .from(students)
        .where(
          and(
            eq(students.documentType, studentData.documentType),
            eq(students.dni, studentData.dni)
          )
        )
        .limit(1);
      
      if (existing) {
        // Obtener las filiales donde está registrado
        const existingBranches = await db
          .select({
            branchId: studentBranches.branchId,
            branchName: branches.name,
            status: studentBranches.status,
          })
          .from(studentBranches)
          .innerJoin(branches, eq(studentBranches.branchId, branches.id))
          .where(eq(studentBranches.studentId, existing.id));
        
        return reply.code(409).send({
          error: 'Este probacionista ya está registrado en el sistema',
          type: 'duplicate_student',
          student: {
            ...existing,
            branches: existingBranches,
          },
          canImport: true,
        });
      }
      
      // 2. Crear el estudiante (datos globales)
      const [newStudent] = await db
        .insert(students)
        .values(studentData as any)
        .returning();
      
      // 3. Crear relación con la filial
      await db.insert(studentBranches).values({
        studentId: newStudent.id,
        branchId,
        status: 'Alta',
        admissionDate: admissionDate || new Date().toISOString().split('T')[0],
      });
      
      // 4. Crear transacción de Alta
      await db.insert(studentTransactions).values({
        studentId: newStudent.id,
        branchId,
        transactionType: 'Alta',
        description: 'Alta inicial del probacionista en el sistema',
        observation: null,
        userId: null, // TODO: Obtener del JWT cuando esté implementado
        transactionDate: new Date(),
      });
      
      return reply.code(201).send(newStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // POST /api/students/:id/import - Importar estudiante existente a la filial actual
  fastify.post('/:id/import', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = studentImportSchema.parse(request.body);
      const { branchId, admissionDate, observation } = validatedData;
      
      // 1. Verificar que el estudiante existe
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, id))
        .limit(1);
      
      if (!student) {
        return reply.code(404).send({ error: 'Student not found' });
      }
      
      // 2. Verificar que no esté ya vinculado a esta filial
      const [existingRelation] = await db
        .select()
        .from(studentBranches)
        .where(
          and(
            eq(studentBranches.studentId, id),
            eq(studentBranches.branchId, branchId)
          )
        )
        .limit(1);
      
      if (existingRelation) {
        return reply.code(409).send({
          error: 'El probacionista ya está vinculado a esta filial',
          type: 'validation',
        });
      }
      
      // 3. Crear vínculo con la filial
      await db.insert(studentBranches).values({
        studentId: id,
        branchId,
        status: 'Alta',
        admissionDate: admissionDate || new Date().toISOString().split('T')[0],
      });
      
      // 4. Crear transacción
      await db.insert(studentTransactions).values({
        studentId: id,
        branchId,
        transactionType: 'Alta',
        description: 'Probacionista importado desde otra filial',
        observation: observation || null,
        userId: null, // TODO: Obtener del JWT
        transactionDate: new Date(),
      });
      
      return { success: true, message: 'Probacionista importado exitosamente' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // PUT /api/students/:id - Actualizar datos del estudiante (cambios globales)
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = studentUpdateSchema.parse(request.body);
      
      // Verificar duplicados de DNI si se está cambiando
      if (validatedData.documentType || validatedData.dni) {
        const [current] = await db
          .select()
          .from(students)
          .where(eq(students.id, id))
          .limit(1);
        
        if (!current) {
          return reply.code(404).send({ error: 'Student not found' });
        }
        
        const docType = validatedData.documentType || current.documentType;
        const dniValue = validatedData.dni || current.dni;
        
        const [existing] = await db
          .select()
          .from(students)
          .where(
            and(
              eq(students.documentType, docType),
              eq(students.dni, dniValue),
              sql`${students.id} != ${id}`
            )
          )
          .limit(1);
        
        if (existing) {
          return reply.code(409).send({
            error: 'Ya existe otro probacionista con este tipo y número de documento',
            field: 'dni',
            type: 'validation',
          });
        }
      }
      
      const [updatedStudent] = await db
        .update(students)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(students.id, id))
        .returning();
      
      if (!updatedStudent) {
        return reply.code(404).send({ error: 'Student not found' });
      }
      
      return updatedStudent;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // PUT /api/students/:id/status - Cambiar estado del estudiante en la filial actual
  fastify.put('/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = studentStatusChangeSchema.parse(request.body);
      const { branchId, status, observation } = validatedData;
      
      // Actualizar estado en student_branches
      const [updated] = await db
        .update(studentBranches)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(studentBranches.studentId, id),
            eq(studentBranches.branchId, branchId)
          )
        )
        .returning();
      
      if (!updated) {
        return reply.code(404).send({
          error: 'Relación estudiante-filial no encontrada',
        });
      }
      
      // Crear transacción
      await db.insert(studentTransactions).values({
        studentId: id,
        branchId,
        transactionType: status,
        description: `Cambio de estado a ${status}`,
        observation,
        userId: null, // TODO: Obtener del JWT
        transactionDate: new Date(),
      });
      
      return { success: true, message: 'Estado actualizado correctamente' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // GET /api/students/:id/transactions - Obtener historial de transacciones
  fastify.get('/:id/transactions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { branchId, page = 1, limit = 50 } = request.query as any;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [eq(studentTransactions.studentId, id)];
    
    // Filtrar por filial si se proporciona
    if (branchId) {
      whereConditions.push(eq(studentTransactions.branchId, branchId));
    }
    
    const transactions = await db
      .select({
        id: studentTransactions.id,
        transactionType: studentTransactions.transactionType,
        description: studentTransactions.description,
        observation: studentTransactions.observation,
        transactionDate: studentTransactions.transactionDate,
        branchName: branches.name,
        userName: users.username,
      })
      .from(studentTransactions)
      .leftJoin(branches, eq(studentTransactions.branchId, branches.id))
      .leftJoin(users, eq(studentTransactions.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(studentTransactions.transactionDate))
      .limit(Number(limit))
      .offset(offset);
    
    return { data: transactions };
  });

  // DELETE /api/students/:id - Endpoint eliminado (no se permite eliminar, solo cambiar estado)
};
