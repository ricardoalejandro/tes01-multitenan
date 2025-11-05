import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { groupEnrollments } from '../db/schema';
import { eq } from 'drizzle-orm';

export const enrollmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { groupId } = request.query as { groupId: string };
    const enrollments = await db.select().from(groupEnrollments).where(eq(groupEnrollments.groupId, groupId));
    return enrollments;
  });

  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    const [enrollment] = await db.insert(groupEnrollments).values(data).returning();
    return enrollment;
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(groupEnrollments).where(eq(groupEnrollments.id, id));
    return { success: true };
  });

  fastify.post('/bulk', async (request, reply) => {
    const { groupId, studentIds } = request.body as { groupId: string; studentIds: string[] };
    
    const enrollments = await db.insert(groupEnrollments).values(
      studentIds.map(studentId => ({
        groupId,
        studentId,
      }))
    ).returning();
    
    return enrollments;
  });
};
