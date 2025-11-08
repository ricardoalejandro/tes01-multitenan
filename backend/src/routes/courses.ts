import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { courses, courseThemes } from '../db/schema';
import { eq, sql, ilike, or, desc } from 'drizzle-orm';

export const courseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build where conditions
    let whereCondition = eq(courses.branchId, branchId);
    if (search) {
      whereCondition = sql`${courses.branchId} = ${branchId} AND ${courses.name} ILIKE ${`%${search}%`}`;
    }
    
    const [courseList, [{ count }]] = await Promise.all([
      db.select().from(courses)
        .where(whereCondition)
        .orderBy(desc(courses.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(courses).where(eq(courses.branchId, branchId)),
    ]);
    
    // Fetch themes for all courses
    const coursesWithThemes = await Promise.all(
      courseList.map(async (course) => {
        const themes = await db
          .select()
          .from(courseThemes)
          .where(eq(courseThemes.courseId, course.id));
        return { ...course, themes };
      })
    );
    
    return {
      data: coursesWithThemes,
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
    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' });
    }
    
    const themes = await db.select().from(courseThemes).where(eq(courseThemes.courseId, id));
    return { ...course, themes };
  });

  fastify.post('/', async (request, reply) => {
    const { themes, ...courseData } = request.body as any;
    const [course] = await db.insert(courses).values(courseData).returning();
    
    if (themes && themes.length > 0) {
      await db.insert(courseThemes).values(
        themes.map((theme: any, index: number) => ({
          courseId: course.id,
          title: theme.title,
          description: theme.description,
          orderIndex: index + 1,
        }))
      );
    }
    
    return course;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { themes, ...courseData } = request.body as any;
    
    const [course] = await db
      .update(courses)
      .set({ ...courseData, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' });
    }
    
    if (themes) {
      await db.delete(courseThemes).where(eq(courseThemes.courseId, id));
      if (themes.length > 0) {
        await db.insert(courseThemes).values(
          themes.map((theme: any, index: number) => ({
            courseId: id,
            title: theme.title,
            description: theme.description,
            orderIndex: index + 1,
          }))
        );
      }
    }
    
    return course;
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(courses).where(eq(courses.id, id));
    return { success: true };
  });
};
