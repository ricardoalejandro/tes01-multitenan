import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { philosophicalCounseling, students, instructors, branches } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export default async function counselingRoutes(fastify: FastifyInstance) {
  
  // GET /api/counseling/:studentId - Listar asesorías de un estudiante
  fastify.get('/:studentId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const user = (request.user as any);
    
    try {
      // Verificar que el estudiante existe
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return reply.code(404).send({ error: 'Estudiante no encontrado' });
      }

      // Obtener todas las asesorías del estudiante
      const counselings = await db
        .select({
          id: philosophicalCounseling.id,
          studentId: philosophicalCounseling.studentId,
          instructorId: philosophicalCounseling.instructorId,
          branchId: philosophicalCounseling.branchId,
          groupName: philosophicalCounseling.groupName,
          groupCode: philosophicalCounseling.groupCode,
          counselingDate: philosophicalCounseling.counselingDate,
          indicator: philosophicalCounseling.indicator,
          observations: philosophicalCounseling.observations,
          createdAt: philosophicalCounseling.createdAt,
          updatedAt: philosophicalCounseling.updatedAt,
          // instructorName: instructors.name,
          // branchName: branches.name,
        })
        .from(philosophicalCounseling)
        .leftJoin(instructors, eq(philosophicalCounseling.instructorId, instructors.id))
        .leftJoin(branches, eq(philosophicalCounseling.branchId, branches.id))
        .where(eq(philosophicalCounseling.studentId, studentId))
        .orderBy(desc(philosophicalCounseling.counselingDate));

      return reply.send({ counselings });
    } catch (error) {
      console.error('Error fetching counselings:', error);
      return reply.code(500).send({ error: 'Error al obtener asesorías' });
    }
  });

  // POST /api/counseling/:studentId - Crear nueva asesoría
  fastify.post('/:studentId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const { 
      instructorId, 
      branchId, 
      groupName, 
      groupCode,
      counselingDate, 
      indicator, 
      observations 
    } = request.body as {
      instructorId: string;
      branchId: string;
      groupName: string;
      groupCode?: string;
      counselingDate: string;
      indicator: 'frio' | 'tibio' | 'caliente';
      observations: string;
    };

    try {
      // Validaciones
      if (!instructorId || !branchId || !groupName || !indicator || !observations) {
        return reply.code(400).send({ 
          error: 'Faltan campos requeridos: instructorId, branchId, groupName, indicator, observations' 
        });
      }

      if (!['frio', 'tibio', 'caliente'].includes(indicator)) {
        return reply.code(400).send({ 
          error: 'Indicador debe ser: frio, tibio o caliente' 
        });
      }

      // Verificar que el estudiante existe
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return reply.code(404).send({ error: 'Estudiante no encontrado' });
      }

      // Verificar que el instructor existe
      const instructor = await db.select().from(instructors).where(eq(instructors.id, instructorId)).limit(1);
      if (instructor.length === 0) {
        return reply.code(404).send({ error: 'Instructor no encontrado' });
      }

      // Verificar que la filial existe
      const branch = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      if (branch.length === 0) {
        return reply.code(404).send({ error: 'Filial no encontrada' });
      }

      // Crear asesoría
      const [newCounseling] = await db.insert(philosophicalCounseling).values({
        studentId,
        instructorId,
        branchId,
        groupName, // HISTÓRICO: guardamos el nombre del grupo como texto
        groupCode: groupCode || null, // HISTÓRICO: guardamos el código del grupo como texto
        counselingDate: counselingDate || new Date().toISOString().split('T')[0],
        indicator,
        observations,
      }).returning();

      return reply.code(201).send({ 
        message: 'Asesoría filosófica creada exitosamente',
        counseling: newCounseling 
      });
    } catch (error) {
      console.error('Error creating counseling:', error);
      return reply.code(500).send({ error: 'Error al crear asesoría' });
    }
  });

  // PUT /api/counseling/:studentId/:counselingId - Actualizar asesoría
  fastify.put('/:studentId/:counselingId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { studentId, counselingId } = request.params as { studentId: string; counselingId: string };
    const { 
      instructorId, 
      branchId, 
      groupName, 
      groupCode,
      counselingDate, 
      indicator, 
      observations 
    } = request.body as {
      instructorId?: string;
      branchId?: string;
      groupName?: string;
      groupCode?: string;
      counselingDate?: string;
      indicator?: 'frio' | 'tibio' | 'caliente';
      observations?: string;
    };

    try {
      // Verificar que la asesoría existe y pertenece al estudiante
      const existing = await db
        .select()
        .from(philosophicalCounseling)
        .where(
          and(
            eq(philosophicalCounseling.id, counselingId),
            eq(philosophicalCounseling.studentId, studentId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Asesoría no encontrada' });
      }

      // Validar indicador si se proporciona
      if (indicator && !['frio', 'tibio', 'caliente'].includes(indicator)) {
        return reply.code(400).send({ 
          error: 'Indicador debe ser: frio, tibio o caliente' 
        });
      }

      // Construir objeto de actualización
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (instructorId) updateData.instructorId = instructorId;
      if (branchId) updateData.branchId = branchId;
      if (groupName) updateData.groupName = groupName;
      if (groupCode !== undefined) updateData.groupCode = groupCode || null;
      if (counselingDate) updateData.counselingDate = counselingDate;
      if (indicator) updateData.indicator = indicator;
      if (observations) updateData.observations = observations;

      // Actualizar asesoría
      const [updatedCounseling] = await db
        .update(philosophicalCounseling)
        .set(updateData)
        .where(eq(philosophicalCounseling.id, counselingId))
        .returning();

      return reply.send({ 
        message: 'Asesoría actualizada exitosamente',
        counseling: updatedCounseling 
      });
    } catch (error) {
      console.error('Error updating counseling:', error);
      return reply.code(500).send({ error: 'Error al actualizar asesoría' });
    }
  });

  // DELETE /api/counseling/:studentId/:counselingId - Eliminar asesoría
  fastify.delete('/:studentId/:counselingId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { studentId, counselingId } = request.params as { studentId: string; counselingId: string };

    try {
      // Verificar que la asesoría existe y pertenece al estudiante
      const existing = await db
        .select()
        .from(philosophicalCounseling)
        .where(
          and(
            eq(philosophicalCounseling.id, counselingId),
            eq(philosophicalCounseling.studentId, studentId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Asesoría no encontrada' });
      }

      // Eliminar asesoría
      await db
        .delete(philosophicalCounseling)
        .where(eq(philosophicalCounseling.id, counselingId));

      return reply.send({ 
        message: 'Asesoría eliminada exitosamente' 
      });
    } catch (error) {
      console.error('Error deleting counseling:', error);
      return reply.code(500).send({ error: 'Error al eliminar asesoría' });
    }
  });

  // GET /api/counseling/:studentId/:counselingId - Obtener una asesoría específica
  fastify.get('/:studentId/:counselingId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { studentId, counselingId } = request.params as { studentId: string; counselingId: string };

    try {
      const counseling = await db
        .select({
          id: philosophicalCounseling.id,
          studentId: philosophicalCounseling.studentId,
          instructorId: philosophicalCounseling.instructorId,
          branchId: philosophicalCounseling.branchId,
          groupName: philosophicalCounseling.groupName,
          groupCode: philosophicalCounseling.groupCode,
          counselingDate: philosophicalCounseling.counselingDate,
          indicator: philosophicalCounseling.indicator,
          observations: philosophicalCounseling.observations,
          createdAt: philosophicalCounseling.createdAt,
          updatedAt: philosophicalCounseling.updatedAt,
          // instructorName: instructors.name,
          // branchName: branches.name,
        })
        .from(philosophicalCounseling)
        .leftJoin(instructors, eq(philosophicalCounseling.instructorId, instructors.id))
        .leftJoin(branches, eq(philosophicalCounseling.branchId, branches.id))
        .where(
          and(
            eq(philosophicalCounseling.id, counselingId),
            eq(philosophicalCounseling.studentId, studentId)
          )
        )
        .limit(1);

      if (counseling.length === 0) {
        return reply.code(404).send({ error: 'Asesoría no encontrada' });
      }

      return reply.send({ counseling: counseling[0] });
    } catch (error) {
      console.error('Error fetching counseling:', error);
      return reply.code(500).send({ error: 'Error al obtener asesoría' });
    }
  });
}
