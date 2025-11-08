import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { branches } from '../db/schema';
import { eq, sql, ilike, or, desc, ne, and } from 'drizzle-orm';

export const branchRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all branches with pagination (exclude deleted)
  fastify.get('/', async (request, reply) => {
    const { page = 1, limit = 10, search = '' } = request.query as any;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build where conditions (always exclude deleted)
    const baseCondition = ne(branches.status, 'eliminado');
    let whereCondition = baseCondition;
    
    if (search) {
      whereCondition = and(
        baseCondition,
        or(
          ilike(branches.name, `%${search}%`),
          ilike(branches.code, `%${search}%`)
        )
      );
    }
    
    const [branchList, [{ count }]] = await Promise.all([
      db.select().from(branches)
        .where(whereCondition)
        .orderBy(desc(branches.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(branches).where(whereCondition),
    ]);
    
    return {
      data: branchList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    };
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

  // Create branch with auto-generated code
  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    
    // Get the maximum code_number
    const [maxCodeNumber] = await db
      .select({ max: sql<number>`COALESCE(MAX(code_number), 0)::int` })
      .from(branches);
    
    const newCodeNumber = (maxCodeNumber?.max || 0) + 1;
    const generatedCode = `FIL-${String(newCodeNumber).padStart(3, '0')}`;
    
    const [branch] = await db.insert(branches).values({
      ...data,
      code: generatedCode,
      codeNumber: newCodeNumber,
    }).returning();
    
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

  // Delete branch (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(branches)
      .set({ status: 'eliminado', updatedAt: new Date() })
      .where(eq(branches.id, id));
    return { success: true, message: 'Sucursal marcada como eliminada' };
  });
};
