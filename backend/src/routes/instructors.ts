import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { instructors, instructorSpecialties } from '../db/schema';
import { eq } from 'drizzle-orm';

export const instructorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId } = request.query as { branchId: string };
    const instructorList = await db.select().from(instructors).where(eq(instructors.branchId, branchId));
    
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
    
    return instructorsWithSpecialties;
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
    await db.delete(instructors).where(eq(instructors.id, id));
    return { success: true };
  });
};
