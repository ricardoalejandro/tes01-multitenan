import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { classGroups, groupSelectedDays, groupCourses, classSessions, sessionThemes } from '../db/schema';
import { eq } from 'drizzle-orm';

export const groupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId } = request.query as { branchId: string };
    const groups = await db.select().from(classGroups).where(eq(classGroups.branchId, branchId));
    return groups;
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [group] = await db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }
    
    const [days, courses, sessions] = await Promise.all([
      db.select().from(groupSelectedDays).where(eq(groupSelectedDays.groupId, id)),
      db.select().from(groupCourses).where(eq(groupCourses.groupId, id)),
      db.select().from(classSessions).where(eq(classSessions.groupId, id)),
    ]);
    
    return {
      ...group,
      selectedDays: days.map(d => d.day),
      courses,
      sessions,
    };
  });

  fastify.post('/', async (request, reply) => {
    const { selectedDays, courses: groupCoursesData, ...groupData } = request.body as any;
    const [group] = await db.insert(classGroups).values(groupData).returning();
    
    if (selectedDays && selectedDays.length > 0) {
      await db.insert(groupSelectedDays).values(
        selectedDays.map((day: string) => ({
          groupId: group.id,
          day,
        }))
      );
    }
    
    if (groupCoursesData && groupCoursesData.length > 0) {
      await db.insert(groupCourses).values(
        groupCoursesData.map((course: any) => ({
          groupId: group.id,
          courseId: course.courseId,
          instructorId: course.instructorId,
        }))
      );
    }
    
    return group;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { selectedDays, courses: groupCoursesData, ...groupData } = request.body as any;
    
    const [group] = await db
      .update(classGroups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(classGroups.id, id))
      .returning();
    
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }
    
    return group;
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(classGroups).where(eq(classGroups.id, id));
    return { success: true };
  });

  fastify.post('/:id/generate-schedule', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Get group details
    const [group] = await db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }
    
    // Get group courses and selected days
    const [courses, days] = await Promise.all([
      db.select().from(groupCourses).where(eq(groupCourses.groupId, id)),
      db.select().from(groupSelectedDays).where(eq(groupSelectedDays.groupId, id)),
    ]);
    
    if (courses.length === 0 || days.length === 0) {
      return reply.code(400).send({ error: 'Group must have courses and selected days' });
    }
    
    // Generate basic sessions (simplified)
    // In a real implementation, this would generate sessions based on frequency and dates
    const sessionsToCreate = [];
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      // Create one session per course as a placeholder
      sessionsToCreate.push({
        groupId: id,
        sessionNumber: i + 1,
        date: new Date(group.startDate).toISOString().split('T')[0],
        courseId: course.courseId,
        instructorId: course.instructorId,
      });
    }
    
    await db.insert(classSessions).values(sessionsToCreate);
    await db.update(classGroups).set({ isScheduleGenerated: true }).where(eq(classGroups.id, id));
    
    return { success: true, message: 'Schedule generated', sessionsCreated: sessionsToCreate.length };
  });
};
