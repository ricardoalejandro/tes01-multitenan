import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { attendanceRecords } from '../db/schema';
import { eq } from 'drizzle-orm';

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { sessionId } = request.query as { sessionId: string };
    const records = await db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId));
    return records;
  });

  fastify.put('/', async (request, reply) => {
    const { sessionId, records: attendanceData } = request.body as any;
    
    // Delete existing records for this session
    await db.delete(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId));
    
    // Insert new records
    if (attendanceData && attendanceData.length > 0) {
      await db.insert(attendanceRecords).values(
        attendanceData.map((record: any) => ({
          sessionId,
          studentId: record.studentId,
          status: record.status,
          notes: record.notes,
        }))
      );
    }
    
    return { success: true };
  });

  fastify.get('/stats', async (request, reply) => {
    const { groupId } = request.query as { groupId: string };
    
    // This would calculate attendance statistics
    // Simplified implementation
    return { groupId, stats: {} };
  });
};
