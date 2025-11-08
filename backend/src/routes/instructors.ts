import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { instructors, instructorSpecialties } from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const instructorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build where conditions (exclude deleted)
    let whereCondition = sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado'`;
    if (search) {
      whereCondition = sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado' AND (${instructors.firstName} ILIKE ${`%${search}%`} OR ${instructors.paternalLastName} ILIKE ${`%${search}%`} OR ${instructors.dni} ILIKE ${`%${search}%`})`;
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

  fastify.post('/', async (request, reply) => {
    const { specialties, ...instructorData } = request.body as any;
    const [instructor] = await db.insert(instructors).values(instructorData).returning();
    
    if (specialties && specialties.length > 0) {
      await db.insert(instructorSpecialties).values(
        specialties.map((specialty: string) => ({
          instructorId: instructor.id,
          specialty,
        }))
      );
    }
    
    return instructor;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { specialties, ...instructorData } = request.body as any;
    
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
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(instructors)
      .set({ status: 'Eliminado', updatedAt: new Date() })
      .where(eq(instructors.id, id));
    return { success: true, message: 'Instructor marcado como eliminado' };
  });
};
