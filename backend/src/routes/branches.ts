import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { branches } from '../db/schema';
import { eq } from 'drizzle-orm';

export const branchRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all branches
  fastify.get('/', async (request, reply) => {
    const branchList = await db.select().from(branches);
    return branchList;
  });

  // Get branch by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    
    if (!branch) {
      return reply.code(404).send({ error: 'Branch not found' });
    }
    
    return branch;
  });

  // Create branch
  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    const [branch] = await db.insert(branches).values(data).returning();
    return branch;
  });

  // Update branch
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    
    const [branch] = await db
      .update(branches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    
    if (!branch) {
      return reply.code(404).send({ error: 'Branch not found' });
    }
    
    return branch;
  });

  // Delete branch
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(branches).where(eq(branches.id, id));
    return { success: true };
  });
};
