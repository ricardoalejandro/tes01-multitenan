import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { instructors, instructorSpecialties } from '../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { checkPermission } from '../middleware/checkPermission';

// Base validation schema (reusable)
const instructorBaseSchema = z.object({
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
  hireDate: z.string().min(1, 'Fecha de contratación es requerida'),
  status: z.enum(['Activo', 'Inactivo', 'Licencia', 'Eliminado']).optional(),
  specialties: z.array(z.string()).optional(),
});

// Schema for creating (all fields required)
const instructorCreateSchema = instructorBaseSchema;

// Schema for updating (all fields optional)
const instructorUpdateSchema = instructorBaseSchema.partial();

export const instructorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions (exclude deleted)
    let whereCondition = sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado'`;
    if (search) {
      whereCondition = sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado' AND (
        ${instructors.dni} ILIKE ${`%${search}%`} OR
        ${instructors.firstName} ILIKE ${`%${search}%`} OR
        ${instructors.paternalLastName} ILIKE ${`%${search}%`} OR
        ${instructors.maternalLastName} ILIKE ${`%${search}%`} OR
        ${instructors.email} ILIKE ${`%${search}%`} OR
        CONCAT(${instructors.firstName}, ' ', ${instructors.paternalLastName}, ' ', COALESCE(${instructors.maternalLastName}, '')) ILIKE ${`%${search}%`}
      )`;
    }

    const [instructorList, [{ count }]] = await Promise.all([
      db.select().from(instructors)
        .where(whereCondition)
        .orderBy(desc(instructors.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(instructors).where(sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado'`),
    ]);

    // Fetch specialties for all instructors
    const instructorsWithSpecialties = await Promise.all(
      instructorList.map(async (instructor) => {
        const specialties = await db
          .select()
          .from(instructorSpecialties)
          .where(eq(instructorSpecialties.instructorId, instructor.id));
        return { ...instructor, specialties };
      })
    );

    return {
      data: instructorsWithSpecialties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [instructor] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);

    if (!instructor) {
      return reply.code(404).send({ error: 'Instructor not found' });
    }

    const specialties = await db.select().from(instructorSpecialties).where(eq(instructorSpecialties.instructorId, id));
    return { ...instructor, specialties: specialties.map(s => s.specialty) };
  });

  fastify.post('/', {
    preHandler: [fastify.authenticate, checkPermission('instructors', 'create')]
  }, async (request, reply) => {
    try {
      const validatedData = instructorCreateSchema.parse(request.body);
      const { specialties, ...instructorData } = validatedData;

      // Check for duplicate (documentType, dni)
      const [existing] = await db
        .select()
        .from(instructors)
        .where(
          and(
            eq(instructors.documentType, instructorData.documentType),
            eq(instructors.dni, instructorData.dni),
            sql`${instructors.status} != 'Eliminado'`
          )
        )
        .limit(1);

      if (existing) {
        return reply.code(409).send({
          error: 'Ya existe un instructor con este tipo y número de documento',
          field: 'dni',
          type: 'validation'
        });
      }

      const [instructor] = await db.insert(instructors).values(instructorData as any).returning();

      if (specialties && specialties.length > 0) {
        await db.insert(instructorSpecialties).values(
          specialties.map((specialty: string) => ({
            instructorId: instructor.id,
            specialty,
          }))
        );
      }

      return instructor;
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

  fastify.put('/:id', {
    preHandler: [fastify.authenticate, checkPermission('instructors', 'edit')]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = instructorUpdateSchema.parse(request.body);
      const { specialties, ...instructorData } = validatedData;

      // Check for duplicate (documentType, dni) if these fields are being updated
      if (instructorData.documentType || instructorData.dni) {
        const currentInstructor = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (currentInstructor.length === 0) {
          return reply.code(404).send({ error: 'Instructor not found' });
        }

        const docType = instructorData.documentType || currentInstructor[0].documentType;
        const dniValue = instructorData.dni || currentInstructor[0].dni;

        const [existing] = await db
          .select()
          .from(instructors)
          .where(
            and(
              eq(instructors.documentType, docType),
              eq(instructors.dni, dniValue),
              sql`${instructors.id} != ${id}`,
              sql`${instructors.status} != 'Eliminado'`
            )
          )
          .limit(1);

        if (existing) {
          return reply.code(409).send({
            error: 'Ya existe otro instructor con este tipo y número de documento',
            field: 'dni',
            type: 'validation'
          });
        }
      }

      const [instructor] = await db
        .update(instructors)
        .set({ ...instructorData, updatedAt: new Date() })
        .where(eq(instructors.id, id))
        .returning();

      if (!instructor) {
        return reply.code(404).send({ error: 'Instructor not found' });
      }

      if (specialties) {
        await db.delete(instructorSpecialties).where(eq(instructorSpecialties.instructorId, id));
        if (specialties.length > 0) {
          await db.insert(instructorSpecialties).values(
            specialties.map((specialty: string) => ({
              instructorId: id,
              specialty,
            }))
          );
        }
      }

      return instructor;
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

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, checkPermission('instructors', 'delete')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(instructors)
      .set({ status: 'Eliminado', updatedAt: new Date() })
      .where(eq(instructors.id, id));
    return { success: true, message: 'Instructor marcado como eliminado' };
  });
};
