import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { students } from '../db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { redisClient } from '../index';

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
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(students.branchId, branchId)];
    if (search) {
      conditions.push(
        sql`(${students.firstName} ILIKE ${`%${search}%`} OR ${students.dni} ILIKE ${`%${search}%`} OR ${students.email} ILIKE ${`%${search}%`})`
      );
    }
    
    const [studentList, [{ count }]] = await Promise.all([
      db.select().from(students).where(and(...conditions)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(students).where(eq(students.branchId, branchId)),
    ]);
    
    const result = {
      data: studentList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
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

  // Create student
  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    const [student] = await db.insert(students).values(data).returning();
    
    // Invalidate cache - Delete all keys matching the pattern
    const keys = await redisClient.keys(`students:${data.branchId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    
    return student;
  });

  // Update student
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    
    const [student] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }
    
    return student;
  });

  // Delete student
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(students).where(eq(students.id, id));
    return { success: true };
  });
};
