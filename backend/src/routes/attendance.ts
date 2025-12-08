import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import {
  groupSessions, groupSessionTopics, sessionAttendance, attendanceObservations,
  sessionExecution, classGroups, groupEnrollments, students, instructors,
  groupAssistants, courses, users
} from '../db/schema';
import { eq, sql, desc, and, asc, lte, gte, SQL } from 'drizzle-orm';
import { z } from 'zod';
import { checkPermission } from '../middleware/checkPermission';

// Validation schemas
const updateAttendanceSchema = z.object({
  status: z.enum(['pendiente', 'asistio', 'no_asistio', 'tarde', 'justificado', 'permiso']),
  courseId: z.string().optional().nullable(), // UUID or '_all_'
  courseIds: z.array(z.string().uuid()).optional(), // Array of course IDs when applying to all courses
});

const addObservationSchema = z.object({
  content: z.string().min(1),
  userId: z.string().uuid().optional(),
});

const updateExecutionSchema = z.object({
  actualInstructorId: z.string().uuid().optional().nullable(),
  actualAssistantId: z.string().uuid().optional().nullable(),
  actualTopic: z.string().optional().nullable(),
  actualDate: z.string(),
  notes: z.string().optional().nullable(),
  executedBy: z.string().uuid().optional(),
});

const completeSessionSchema = z.object({
  executedBy: z.string().uuid().optional(),
});

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {

  // ============================================
  // GRUPOS - Lista de grupos para selección
  // ============================================

  // GET /api/attendance/groups - Listar grupos activos con info de sesiones
  fastify.get('/groups', async (request, reply) => {
    const { branchId } = request.query as { branchId?: string };

    if (!branchId) {
      return reply.status(400).send({ error: 'branchId es requerido' });
    }

    const groups = await db
      .select({
        id: classGroups.id,
        name: classGroups.name,
        description: classGroups.description,
        status: classGroups.status,
        startDate: classGroups.startDate,
        frequency: classGroups.frequency,
        startTime: classGroups.startTime,
        endTime: classGroups.endTime,
      })
      .from(classGroups)
      .where(and(
        eq(classGroups.branchId, branchId),
        eq(classGroups.status, 'active')
      ))
      .orderBy(asc(classGroups.name));

    // Obtener conteo de sesiones por grupo
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        const sessionsCount = await db
          .select({
            total: sql<number>`count(*)`,
            dictadas: sql<number>`count(*) filter (where ${groupSessions.status} = 'dictada')`,
            pendientes: sql<number>`count(*) filter (where ${groupSessions.status} = 'pendiente')`,
          })
          .from(groupSessions)
          .where(eq(groupSessions.groupId, group.id));

        const enrolledCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(groupEnrollments)
          .where(and(
            eq(groupEnrollments.groupId, group.id),
            eq(groupEnrollments.status, 'active')
          ));

        return {
          ...group,
          totalSessions: Number(sessionsCount[0]?.total || 0),
          dictadas: Number(sessionsCount[0]?.dictadas || 0),
          pendientes: Number(sessionsCount[0]?.pendientes || 0),
          enrolledStudents: Number(enrolledCount[0]?.count || 0),
        };
      })
    );

    return { data: groupsWithStats };
  });

  // ============================================
  // SESIONES DE UN GRUPO
  // ============================================

  // GET /api/attendance/groups/:groupId/sessions - Listar sesiones de un grupo
  fastify.get('/groups/:groupId/sessions', async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const { status } = request.query as { status?: 'pendiente' | 'dictada' | 'all' };

    let whereConditions = [eq(groupSessions.groupId, groupId)];

    if (status && status !== 'all') {
      whereConditions.push(eq(groupSessions.status, status));
    }

    const sessions = await db
      .select({
        id: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        status: groupSessions.status,
        createdAt: groupSessions.createdAt,
      })
      .from(groupSessions)
      .where(and(...whereConditions))
      .orderBy(asc(groupSessions.sessionNumber));

    // Obtener temas para cada sesión
    const sessionsWithTopics = await Promise.all(
      sessions.map(async (session) => {
        const topics = await db
          .select({
            id: groupSessionTopics.id,
            courseId: groupSessionTopics.courseId,
            topicTitle: groupSessionTopics.topicTitle,
            instructorId: groupSessionTopics.instructorId,
            courseName: courses.name,
            instructorName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}`,
          })
          .from(groupSessionTopics)
          .leftJoin(courses, eq(groupSessionTopics.courseId, courses.id))
          .leftJoin(instructors, eq(groupSessionTopics.instructorId, instructors.id))
          .where(eq(groupSessionTopics.sessionId, session.id))
          .orderBy(asc(groupSessionTopics.orderIndex));

        // Verificar si tiene ejecución
        const [execution] = await db
          .select()
          .from(sessionExecution)
          .where(eq(sessionExecution.sessionId, session.id))
          .limit(1);

        return {
          ...session,
          topics,
          hasExecution: !!execution,
        };
      })
    );

    return { data: sessionsWithTopics };
  });

  // ============================================
  // SESIONES PENDIENTES (ALERTAS)
  // ============================================

  // GET /api/attendance/pending - Sesiones pendientes de registrar
  fastify.get('/pending', async (request, reply) => {
    const { branchId } = request.query as { branchId?: string };

    if (!branchId) {
      return reply.status(400).send({ error: 'branchId es requerido' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Sesiones pendientes cuya fecha ya pasó o es hoy
    const pendingSessions = await db
      .select({
        sessionId: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        groupId: classGroups.id,
        groupName: classGroups.name,
      })
      .from(groupSessions)
      .innerJoin(classGroups, eq(groupSessions.groupId, classGroups.id))
      .where(and(
        eq(classGroups.branchId, branchId),
        eq(classGroups.status, 'active'),
        eq(groupSessions.status, 'pendiente'),
        lte(groupSessions.sessionDate, today)
      ))
      .orderBy(asc(groupSessions.sessionDate));

    // Calcular días de atraso
    const sessionsWithDelay = pendingSessions.map(session => {
      const sessionDate = new Date(session.sessionDate);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - sessionDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...session,
        daysOverdue: diffDays,
        isToday: diffDays === 0,
      };
    });

    return {
      data: sessionsWithDelay,
      total: sessionsWithDelay.length,
    };
  });

  // ============================================
  // DETALLE DE SESIÓN PARA ASISTENCIA
  // ============================================

  // GET /api/attendance/sessions/:sessionId - Detalle completo de sesión
  fastify.get('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    // Obtener sesión con datos del grupo
    const [session] = await db
      .select({
        id: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        status: groupSessions.status,
        groupId: classGroups.id,
        groupName: classGroups.name,
        startTime: classGroups.startTime,
        endTime: classGroups.endTime,
      })
      .from(groupSessions)
      .innerJoin(classGroups, eq(groupSessions.groupId, classGroups.id))
      .where(eq(groupSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return reply.status(404).send({ error: 'Sesión no encontrada' });
    }

    // Obtener temas planificados
    const topics = await db
      .select({
        id: groupSessionTopics.id,
        courseId: groupSessionTopics.courseId,
        topicTitle: groupSessionTopics.topicTitle,
        topicDescription: groupSessionTopics.topicDescription,
        instructorId: groupSessionTopics.instructorId,
        courseName: courses.name,
        instructorName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}`,
      })
      .from(groupSessionTopics)
      .leftJoin(courses, eq(groupSessionTopics.courseId, courses.id))
      .leftJoin(instructors, eq(groupSessionTopics.instructorId, instructors.id))
      .where(eq(groupSessionTopics.sessionId, sessionId))
      .orderBy(asc(groupSessionTopics.orderIndex));

    // Obtener ejecución real (si existe)
    const [execution] = await db
      .select({
        id: sessionExecution.id,
        actualInstructorId: sessionExecution.actualInstructorId,
        actualAssistantId: sessionExecution.actualAssistantId,
        actualTopic: sessionExecution.actualTopic,
        actualDate: sessionExecution.actualDate,
        notes: sessionExecution.notes,
        executedBy: sessionExecution.executedBy,
      })
      .from(sessionExecution)
      .where(eq(sessionExecution.sessionId, sessionId))
      .limit(1);

    // Obtener nombres si hay ejecución
    let executionWithNames = null;
    if (execution) {
      const [instructor] = execution.actualInstructorId
        ? await db.select({ fullName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}` }).from(instructors).where(eq(instructors.id, execution.actualInstructorId)).limit(1)
        : [null];

      const [assistant] = execution.actualAssistantId
        ? await db.select({ fullName: groupAssistants.fullName }).from(groupAssistants).where(eq(groupAssistants.id, execution.actualAssistantId)).limit(1)
        : [null];

      executionWithNames = {
        ...execution,
        actualInstructorName: instructor?.fullName || null,
        actualAssistantName: assistant?.fullName || null,
      };
    }

    // Obtener asistentes del grupo
    const assistants = await db
      .select({
        id: groupAssistants.id,
        fullName: groupAssistants.fullName,
      })
      .from(groupAssistants)
      .where(eq(groupAssistants.groupId, session.groupId));

    return {
      session,
      topics,
      execution: executionWithNames,
      assistants,
    };
  });

  // ============================================
  // ESTUDIANTES CON ASISTENCIA (POR CURSO)
  // ============================================

  // GET /api/attendance/sessions/:sessionId/students - Estudiantes con su asistencia por curso
  // Query params: courseId (opcional) - si se proporciona, retorna asistencia para ese curso específico
  fastify.get('/sessions/:sessionId/students', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { courseId } = request.query as { courseId?: string };

    // Obtener el grupo de la sesión
    const [session] = await db
      .select({ groupId: groupSessions.groupId })
      .from(groupSessions)
      .where(eq(groupSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return reply.status(404).send({ error: 'Sesión no encontrada' });
    }

    // Obtener estudiantes inscritos en el grupo
    const enrolledStudents = await db
      .select({
        enrollmentId: groupEnrollments.id,
        studentId: students.id,
        firstName: students.firstName,
        paternalLastName: students.paternalLastName,
        maternalLastName: students.maternalLastName,
        dni: students.dni,
        phone: students.phone,
        email: students.email,
      })
      .from(groupEnrollments)
      .innerJoin(students, eq(groupEnrollments.studentId, students.id))
      .where(and(
        eq(groupEnrollments.groupId, session.groupId),
        eq(groupEnrollments.status, 'active')
      ))
      .orderBy(asc(students.paternalLastName), asc(students.firstName));

    // Obtener asistencia de cada estudiante (por curso si se especifica)
    const studentsWithAttendance = await Promise.all(
      enrolledStudents.map(async (student) => {
        // Construir condiciones de búsqueda
        const whereConditions: SQL<unknown>[] = [
          eq(sessionAttendance.sessionId, sessionId),
          eq(sessionAttendance.studentId, student.studentId)
        ];

        // Si se especifica courseId, buscar por ese curso específico
        if (courseId) {
          whereConditions.push(eq(sessionAttendance.courseId, courseId));
        }

        // Buscar o crear registro de asistencia
        let [attendance] = await db
          .select({
            id: sessionAttendance.id,
            status: sessionAttendance.status,
            courseId: sessionAttendance.courseId,
          })
          .from(sessionAttendance)
          .where(and(...whereConditions))
          .limit(1);

        // Si no existe, crear uno con estado pendiente
        if (!attendance) {
          const [newAttendance] = await db
            .insert(sessionAttendance)
            .values({
              sessionId,
              studentId: student.studentId,
              courseId: courseId || null,
              status: 'pendiente',
            })
            .returning({ id: sessionAttendance.id, status: sessionAttendance.status, courseId: sessionAttendance.courseId });
          attendance = newAttendance;
        }

        // Obtener observaciones
        const observations = await db
          .select({
            id: attendanceObservations.id,
            content: attendanceObservations.content,
            createdAt: attendanceObservations.createdAt,
            userId: attendanceObservations.userId,
            userName: users.fullName,
          })
          .from(attendanceObservations)
          .leftJoin(users, eq(attendanceObservations.userId, users.id))
          .where(eq(attendanceObservations.attendanceId, attendance.id))
          .orderBy(desc(attendanceObservations.createdAt));

        return {
          ...student,
          fullName: `${student.firstName} ${student.paternalLastName} ${student.maternalLastName || ''}`.trim(),
          attendanceId: attendance.id,
          attendanceStatus: attendance.status,
          observations,
        };
      })
    );

    return { data: studentsWithAttendance };
  });

  // ============================================
  // ACTUALIZAR ASISTENCIA
  // ============================================

  // PUT /api/attendance/sessions/:sessionId/students/:studentId - Crear o actualizar asistencia individual
  // Body: { status, courseId?, courseIds? } 
  // - courseId: UUID para un curso específico, '_all_' para todos los cursos
  // - courseIds: Array de UUIDs cuando se aplica a múltiples cursos
  fastify.put('/sessions/:sessionId/students/:studentId', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId, studentId } = request.params as { sessionId: string; studentId: string };

    try {
      const validatedData = updateAttendanceSchema.parse(request.body);

      // Verificar que la sesión existe y no está dictada
      const [session] = await db
        .select({ status: groupSessions.status, groupId: groupSessions.groupId })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status === 'dictada') {
        return reply.status(403).send({ error: 'No se puede modificar una sesión ya dictada' });
      }

      // Determinar los cursos a actualizar
      let courseIdsToUpdate: string[] = [];

      if (validatedData.courseIds && validatedData.courseIds.length > 0) {
        // Se proporcionó un array de courseIds (modo "todos los cursos")
        courseIdsToUpdate = validatedData.courseIds;
      } else if (validatedData.courseId && validatedData.courseId !== '_all_') {
        // Se proporcionó un courseId específico
        courseIdsToUpdate = [validatedData.courseId];
      } else {
        // Si no hay courseId o es '_all_', necesitamos obtener los cursos del grupo
        // Este caso no debería pasar si el frontend envía courseIds correctamente
        return reply.status(400).send({
          error: 'Debe especificar courseId o courseIds. La asistencia debe estar asociada a un curso.'
        });
      }

      const results = [];

      for (const courseId of courseIdsToUpdate) {
        // Buscar si ya existe un registro de asistencia para este curso
        const [existingAttendance] = await db
          .select()
          .from(sessionAttendance)
          .where(and(
            eq(sessionAttendance.sessionId, sessionId),
            eq(sessionAttendance.studentId, studentId),
            eq(sessionAttendance.courseId, courseId)
          ))
          .limit(1);

        let result;
        if (existingAttendance) {
          // Actualizar registro existente
          [result] = await db
            .update(sessionAttendance)
            .set({
              status: validatedData.status,
              updatedAt: new Date(),
            })
            .where(eq(sessionAttendance.id, existingAttendance.id))
            .returning();
        } else {
          // Crear nuevo registro
          [result] = await db
            .insert(sessionAttendance)
            .values({
              sessionId,
              studentId,
              courseId,
              status: validatedData.status,
            })
            .returning();
        }
        results.push(result);
      }

      return { success: true, data: results.length === 1 ? results[0] : results };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // PUT /api/attendance/students/:attendanceId - Actualizar estado de asistencia
  fastify.put('/students/:attendanceId', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { attendanceId } = request.params as { attendanceId: string };

    try {
      const validatedData = updateAttendanceSchema.parse(request.body);

      // Verificar que la sesión no esté dictada
      const [attendance] = await db
        .select({ sessionId: sessionAttendance.sessionId })
        .from(sessionAttendance)
        .where(eq(sessionAttendance.id, attendanceId))
        .limit(1);

      if (!attendance) {
        return reply.status(404).send({ error: 'Registro de asistencia no encontrado' });
      }

      const [session] = await db
        .select({ status: groupSessions.status })
        .from(groupSessions)
        .where(eq(groupSessions.id, attendance.sessionId))
        .limit(1);

      if (session?.status === 'dictada') {
        return reply.status(403).send({ error: 'No se puede modificar una sesión ya dictada' });
      }

      const [updated] = await db
        .update(sessionAttendance)
        .set({
          status: validatedData.status,
          updatedAt: new Date(),
        })
        .where(eq(sessionAttendance.id, attendanceId))
        .returning();

      return { success: true, data: updated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // ============================================
  // OBSERVACIONES
  // ============================================

  // POST /api/attendance/students/:attendanceId/observations - Agregar observación
  fastify.post('/students/:attendanceId/observations', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { attendanceId } = request.params as { attendanceId: string };

    try {
      const validatedData = addObservationSchema.parse(request.body);

      // Verificar que exista el registro de asistencia
      const [attendance] = await db
        .select({ id: sessionAttendance.id })
        .from(sessionAttendance)
        .where(eq(sessionAttendance.id, attendanceId))
        .limit(1);

      if (!attendance) {
        return reply.status(404).send({ error: 'Registro de asistencia no encontrado' });
      }

      const [observation] = await db
        .insert(attendanceObservations)
        .values({
          attendanceId,
          userId: validatedData.userId || null,
          content: validatedData.content,
        })
        .returning();

      // Obtener nombre del usuario si existe
      let userName = null;
      if (observation.userId) {
        const [user] = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, observation.userId))
          .limit(1);
        userName = user?.fullName;
      }

      return {
        success: true,
        data: {
          ...observation,
          userName,
        }
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // GET /api/attendance/students/:attendanceId/observations - Historial de observaciones
  fastify.get('/students/:attendanceId/observations', async (request, reply) => {
    const { attendanceId } = request.params as { attendanceId: string };

    const observations = await db
      .select({
        id: attendanceObservations.id,
        content: attendanceObservations.content,
        createdAt: attendanceObservations.createdAt,
        userId: attendanceObservations.userId,
        userName: users.fullName,
      })
      .from(attendanceObservations)
      .leftJoin(users, eq(attendanceObservations.userId, users.id))
      .where(eq(attendanceObservations.attendanceId, attendanceId))
      .orderBy(desc(attendanceObservations.createdAt));

    return { data: observations };
  });

  // ============================================
  // EJECUCIÓN DE SESIÓN
  // ============================================

  // PUT /api/attendance/sessions/:sessionId/execution - Actualizar ejecución real
  fastify.put('/sessions/:sessionId/execution', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const validatedData = updateExecutionSchema.parse(request.body);

      // Verificar que la sesión exista y no esté dictada
      const [session] = await db
        .select({ status: groupSessions.status })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status === 'dictada') {
        return reply.status(403).send({ error: 'No se puede modificar una sesión ya dictada' });
      }

      // Buscar o crear ejecución
      const [existingExecution] = await db
        .select({ id: sessionExecution.id })
        .from(sessionExecution)
        .where(eq(sessionExecution.sessionId, sessionId))
        .limit(1);

      let execution;
      if (existingExecution) {
        [execution] = await db
          .update(sessionExecution)
          .set({
            actualInstructorId: validatedData.actualInstructorId,
            actualAssistantId: validatedData.actualAssistantId,
            actualTopic: validatedData.actualTopic,
            actualDate: validatedData.actualDate,
            notes: validatedData.notes,
            executedBy: validatedData.executedBy,
            updatedAt: new Date(),
          })
          .where(eq(sessionExecution.id, existingExecution.id))
          .returning();
      } else {
        [execution] = await db
          .insert(sessionExecution)
          .values({
            sessionId,
            actualInstructorId: validatedData.actualInstructorId,
            actualAssistantId: validatedData.actualAssistantId,
            actualTopic: validatedData.actualTopic,
            actualDate: validatedData.actualDate,
            notes: validatedData.notes,
            executedBy: validatedData.executedBy,
          })
          .returning();
      }

      return { success: true, data: execution };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // ============================================
  // COMPLETAR SESIÓN (MARCAR COMO DICTADA)
  // ============================================

  // PUT /api/attendance/sessions/:sessionId/complete - Marcar sesión como dictada
  fastify.put('/sessions/:sessionId/complete', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const validatedData = completeSessionSchema.parse(request.body);

      // Verificar que la sesión exista y no esté ya dictada
      const [session] = await db
        .select({
          status: groupSessions.status,
          sessionDate: groupSessions.sessionDate,
          groupId: groupSessions.groupId,
        })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status === 'dictada') {
        return reply.status(400).send({ error: 'La sesión ya está marcada como dictada' });
      }

      // Verificar que haya una ejecución registrada
      const [execution] = await db
        .select({ id: sessionExecution.id })
        .from(sessionExecution)
        .where(eq(sessionExecution.sessionId, sessionId))
        .limit(1);

      if (!execution) {
        // Crear ejecución por defecto si no existe
        await db.insert(sessionExecution).values({
          sessionId,
          actualDate: session.sessionDate,
          executedBy: validatedData.executedBy,
        });
      }

      // Marcar sesión como dictada
      const [updated] = await db
        .update(groupSessions)
        .set({
          status: 'dictada',
          updatedAt: new Date(),
        })
        .where(eq(groupSessions.id, sessionId))
        .returning();

      return {
        success: true,
        message: 'Sesión marcada como dictada exitosamente',
        data: updated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // PUT /api/attendance/sessions/:sessionId/reopen - Reabrir sesión (cambiar de dictada a pendiente)
  fastify.put('/sessions/:sessionId/reopen', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      // Verificar que la sesión exista y esté dictada
      const [session] = await db
        .select({
          status: groupSessions.status,
        })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status !== 'dictada') {
        return reply.status(400).send({ error: 'La sesión no está marcada como dictada' });
      }

      // Reabrir sesión (cambiar a pendiente)
      const [updated] = await db
        .update(groupSessions)
        .set({
          status: 'pendiente',
          updatedAt: new Date(),
        })
        .where(eq(groupSessions.id, sessionId))
        .returning();

      return {
        success: true,
        message: 'Sesión reabierta exitosamente. Ahora puede editar la asistencia.',
        data: updated,
      };
    } catch (error) {
      throw error;
    }
  });

  // PUT /api/attendance/sessions/:sessionId/postpone - Suspender sesión (marcar que no hubo clase)
  fastify.put('/sessions/:sessionId/postpone', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { reason } = request.body as { reason: string };

    try {
      if (!reason || reason.trim().length < 3) {
        return reply.status(400).send({ error: 'Debe especificar una razón para suspender la sesión (mínimo 3 caracteres)' });
      }

      // Verificar que la sesión exista y esté pendiente
      const [session] = await db
        .select({
          status: groupSessions.status,
        })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status === 'dictada') {
        return reply.status(400).send({ error: 'No se puede suspender una sesión que ya fue dictada. Reábrala primero.' });
      }

      if (session.status === 'suspendida') {
        return reply.status(400).send({ error: 'La sesión ya está marcada como suspendida' });
      }

      // Marcar sesión como suspendida
      const [updated] = await db
        .update(groupSessions)
        .set({
          status: 'suspendida',
          suspensionReason: reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(groupSessions.id, sessionId))
        .returning();

      return {
        success: true,
        message: 'Sesión suspendida exitosamente',
        data: updated,
      };
    } catch (error) {
      throw error;
    }
  });

  // PUT /api/attendance/sessions/:sessionId/reactivate - Reactivar sesión suspendida (volver a pendiente)
  fastify.put('/sessions/:sessionId/reactivate', {
    preHandler: [fastify.authenticate, checkPermission('attendance', 'edit')]
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      // Verificar que la sesión exista y esté suspendida
      const [session] = await db
        .select({
          status: groupSessions.status,
        })
        .from(groupSessions)
        .where(eq(groupSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return reply.status(404).send({ error: 'Sesión no encontrada' });
      }

      if (session.status !== 'suspendida') {
        return reply.status(400).send({ error: 'La sesión no está suspendida' });
      }

      // Reactivar sesión (cambiar a pendiente y limpiar razón)
      const [updated] = await db
        .update(groupSessions)
        .set({
          status: 'pendiente',
          suspensionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(groupSessions.id, sessionId))
        .returning();

      return {
        success: true,
        message: 'Sesión reactivada exitosamente',
        data: updated,
      };
    } catch (error) {
      throw error;
    }
  });

  // ============================================
  // CALENDARIO DE SESIONES
  // ============================================

  // GET /api/attendance/calendar/:groupId - Vista calendario
  fastify.get('/calendar/:groupId', async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const { month, year } = request.query as { month?: string; year?: string };

    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Obtener sesiones del mes
    const startOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endOfMonth = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const sessions = await db
      .select({
        id: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        status: groupSessions.status,
      })
      .from(groupSessions)
      .where(and(
        eq(groupSessions.groupId, groupId),
        gte(groupSessions.sessionDate, startOfMonth),
        lte(groupSessions.sessionDate, endOfMonth)
      ))
      .orderBy(asc(groupSessions.sessionDate));

    return {
      data: sessions,
      month: targetMonth,
      year: targetYear,
    };
  });

  // ============================================
  // INSTRUCTORES DISPONIBLES
  // ============================================

  // GET /api/attendance/instructors - Lista de instructores para selección
  fastify.get('/instructors', async (request, reply) => {
    const result = await db
      .select({
        id: instructors.id,
        fullName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}`,
      })
      .from(instructors)
      .where(eq(instructors.status, 'Activo'))
      .orderBy(asc(instructors.firstName));

    return { data: result };
  });

  // ============================================
  // CUADERNO DE ASISTENCIA - Vista Matricial
  // ============================================

  // GET /api/attendance/notebook/:groupId - Matriz de asistencia completa
  fastify.get('/notebook/:groupId', async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const {
      startDate,
      endDate,
      page = '1',
      sessionsPerPage = '10',
      studentFilter = 'all', // 'all' | 'critical' | 'search'
      searchTerm = '',
      sortBy = 'name', // 'name' | 'attendance' | 'absences'
      sortOrder = 'asc',
      courseId, // Nuevo: filtrar asistencia por curso
    } = request.query as {
      startDate?: string;
      endDate?: string;
      page?: string;
      sessionsPerPage?: string;
      studentFilter?: string;
      searchTerm?: string;
      sortBy?: string;
      sortOrder?: string;
      courseId?: string;
    };

    // 1. Obtener información del grupo
    const [groupInfo] = await db
      .select({
        id: classGroups.id,
        name: classGroups.name,
        startDate: classGroups.startDate,
      })
      .from(classGroups)
      .where(eq(classGroups.id, groupId))
      .limit(1);

    if (!groupInfo) {
      return reply.status(404).send({ error: 'Grupo no encontrado' });
    }

    // 2. Obtener todas las sesiones del grupo CON datos de ejecución
    const allSessions = await db
      .select({
        id: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        status: groupSessions.status,
        // Datos de ejecución (si existen)
        executionId: sessionExecution.id,
        actualInstructorId: sessionExecution.actualInstructorId,
        actualTopic: sessionExecution.actualTopic,
        actualDate: sessionExecution.actualDate,
        notes: sessionExecution.notes,
      })
      .from(groupSessions)
      .leftJoin(sessionExecution, eq(sessionExecution.sessionId, groupSessions.id))
      .where(eq(groupSessions.groupId, groupId))
      .orderBy(asc(groupSessions.sessionNumber));

    // Calcular totalSessions
    const totalSessions = allSessions.length;

    // Filtrar por rango de fechas si se especifica
    let filteredSessions = allSessions;
    if (startDate) {
      filteredSessions = filteredSessions.filter(s => s.sessionDate >= startDate);
    }
    if (endDate) {
      filteredSessions = filteredSessions.filter(s => s.sessionDate <= endDate);
    }

    // Calcular paginación de sesiones
    const pageNum = parseInt(page);
    const perPage = parseInt(sessionsPerPage);
    const totalSessionsFiltered = filteredSessions.length;
    const totalPages = Math.ceil(totalSessionsFiltered / perPage);
    const startIndex = (pageNum - 1) * perPage;
    const paginatedSessions = filteredSessions.slice(startIndex, startIndex + perPage);

    // 3. Obtener todos los estudiantes inscritos activos
    let studentsData = await db
      .select({
        enrollmentId: groupEnrollments.id,
        studentId: students.id,
        firstName: students.firstName,
        paternalLastName: students.paternalLastName,
        maternalLastName: students.maternalLastName,
        dni: students.dni,
      })
      .from(groupEnrollments)
      .innerJoin(students, eq(groupEnrollments.studentId, students.id))
      .where(and(
        eq(groupEnrollments.groupId, groupId),
        eq(groupEnrollments.status, 'active')
      ))
      .orderBy(asc(students.paternalLastName), asc(students.firstName));

    // 4. Obtener toda la asistencia para las sesiones filtradas (incluyendo id para edición)
    const sessionIds = filteredSessions.map(s => s.id);

    let attendanceRecords: { id: string; sessionId: string; studentId: string; status: string; courseId: string | null }[] = [];
    if (sessionIds.length > 0) {
      if (courseId) {
        // Filtrar por un curso específico
        attendanceRecords = await db
          .select({
            id: sessionAttendance.id,
            sessionId: sessionAttendance.sessionId,
            studentId: sessionAttendance.studentId,
            status: sessionAttendance.status,
            courseId: sessionAttendance.courseId,
          })
          .from(sessionAttendance)
          .where(sql`${sessionAttendance.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)}) AND ${sessionAttendance.courseId} = ${courseId}`);
      } else {
        // "Todos los cursos" - obtener TODOS los registros y aplicar prioridad
        attendanceRecords = await db
          .select({
            id: sessionAttendance.id,
            sessionId: sessionAttendance.sessionId,
            studentId: sessionAttendance.studentId,
            status: sessionAttendance.status,
            courseId: sessionAttendance.courseId,
          })
          .from(sessionAttendance)
          .where(sql`${sessionAttendance.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)}) AND ${sessionAttendance.courseId} IS NOT NULL`);
      }
    }

    // 4.1. Obtener conteo de observaciones por attendanceId
    const attendanceIds = attendanceRecords.map(r => r.id);
    let observationCounts: Record<string, number> = {};
    if (attendanceIds.length > 0) {
      const obsResults = await db
        .select({
          attendanceId: attendanceObservations.attendanceId,
          count: sql<number>`count(*)::int`,
        })
        .from(attendanceObservations)
        .where(sql`${attendanceObservations.attendanceId} IN (${sql.join(attendanceIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(attendanceObservations.attendanceId);

      obsResults.forEach(r => {
        observationCounts[r.attendanceId] = r.count;
      });
    }

    // Función para determinar la prioridad del estado de asistencia
    // Prioridad: asistio > tarde > justificado > permiso > no_asistio > pendiente
    const getStatusPriority = (status: string): number => {
      const priorities: Record<string, number> = {
        'asistio': 6,
        'tarde': 5,
        'justificado': 4,
        'permiso': 3,
        'no_asistio': 2,
        'pendiente': 1,
      };
      return priorities[status] || 0;
    };

    // 5. Crear mapa de asistencia por estudiante y sesión
    // Cuando hay múltiples cursos (modo "todos los cursos"), aplicar lógica de prioridad
    const attendanceMap = new Map<string, Map<string, { id: string; status: string; observationCount: number }>>();

    attendanceRecords.forEach(record => {
      if (!attendanceMap.has(record.studentId)) {
        attendanceMap.set(record.studentId, new Map());
      }

      const studentMap = attendanceMap.get(record.studentId)!;
      const existingData = studentMap.get(record.sessionId);

      if (!existingData) {
        // No hay registro previo, agregar este
        studentMap.set(record.sessionId, {
          id: record.id,
          status: record.status,
          observationCount: observationCounts[record.id] || 0,
        });
      } else {
        // Ya existe un registro, aplicar prioridad
        const existingPriority = getStatusPriority(existingData.status);
        const newPriority = getStatusPriority(record.status);

        if (newPriority > existingPriority) {
          // El nuevo registro tiene mayor prioridad, reemplazar
          studentMap.set(record.sessionId, {
            id: record.id,
            status: record.status,
            observationCount: (existingData.observationCount || 0) + (observationCounts[record.id] || 0),
          });
        } else {
          // Mantener el existente pero sumar observaciones
          existingData.observationCount += (observationCounts[record.id] || 0);
        }
      }
    });

    // 6. Calcular estadísticas por estudiante (sobre TODAS las sesiones, no solo las paginadas)
    const completedSessions = allSessions.filter(s => s.status === 'dictada');
    const totalCompleted = completedSessions.length;

    const studentsWithStats = studentsData.map(student => {
      const studentAttendance = attendanceMap.get(student.studentId) || new Map();

      // Contar asistencias sobre sesiones dictadas
      let attended = 0;
      let absences = 0;
      let late = 0;
      let justified = 0;

      completedSessions.forEach(session => {
        const attendanceData = studentAttendance.get(session.id);
        const status = attendanceData?.status || 'pendiente';
        if (status === 'asistio') attended++;
        else if (status === 'no_asistio') absences++;
        else if (status === 'tarde') { attended++; late++; }
        else if (status === 'justificado') justified++;
        else if (status === 'permiso') justified++;
      });

      const attendancePercentage = totalCompleted > 0
        ? Math.round((attended / totalCompleted) * 100)
        : 100;

      // Obtener asistencia solo para las sesiones paginadas (para mostrar en la matriz)
      // Ahora incluye attendanceId y observationCount para edición interactiva
      const sessionData: Record<string, { status: string; attendanceId: string | null; observationCount: number }> = {};
      paginatedSessions.forEach(session => {
        const attendanceData = studentAttendance.get(session.id);
        sessionData[session.id] = {
          status: attendanceData?.status || 'pendiente',
          attendanceId: attendanceData?.id || null,
          observationCount: attendanceData?.observationCount || 0,
        };
      });

      return {
        id: student.studentId,
        enrollmentId: student.enrollmentId,
        fullName: `${student.paternalLastName} ${student.maternalLastName || ''}, ${student.firstName}`.trim(),
        firstName: student.firstName,
        paternalLastName: student.paternalLastName,
        maternalLastName: student.maternalLastName,
        dni: student.dni,
        sessions: sessionData,
        stats: {
          attended,
          absences,
          late,
          justified,
          total: totalCompleted,
          percentage: attendancePercentage,
          isCritical: attendancePercentage < 70,
        }
      };
    });

    // 7. Filtrar estudiantes según criterio
    let filteredStudents = studentsWithStats;
    if (studentFilter === 'critical') {
      filteredStudents = filteredStudents.filter(s => s.stats.isCritical);
    } else if (studentFilter === 'search' && searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredStudents = filteredStudents.filter(s =>
        s.fullName.toLowerCase().includes(term) ||
        s.dni?.toLowerCase().includes(term)
      );
    }

    // 8. Ordenar estudiantes
    filteredStudents.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'attendance') {
        comparison = a.stats.percentage - b.stats.percentage;
      } else if (sortBy === 'absences') {
        comparison = a.stats.absences - b.stats.absences;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 9. Calcular estadísticas por sesión (para las paginadas)
    const sessionStats = paginatedSessions.map(session => {
      let attended = 0;
      let total = studentsData.length;

      studentsData.forEach(student => {
        const studentAttendance = attendanceMap.get(student.studentId);
        const attendanceData = studentAttendance?.get(session.id);
        const status = attendanceData?.status || 'pendiente';
        if (status === 'asistio' || status === 'tarde') attended++;
      });

      return {
        sessionId: session.id,
        attended,
        total,
        percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
      };
    });

    // 10. Estadísticas globales
    const globalStats = {
      totalStudents: studentsData.length,
      totalSessions: allSessions.length,
      completedSessions: totalCompleted,
      averageAttendance: studentsWithStats.length > 0
        ? Math.round(studentsWithStats.reduce((acc, s) => acc + s.stats.percentage, 0) / studentsWithStats.length)
        : 0,
      criticalStudents: studentsWithStats.filter(s => s.stats.isCritical).length,
    };

    return {
      group: {
        ...groupInfo,
        totalSessions,
      },
      sessions: paginatedSessions.map(s => ({
        id: s.id,
        number: s.sessionNumber,
        date: s.sessionDate,
        status: s.status,
        // Datos de ejecución (pueden ser null si no existe registro)
        execution: s.executionId ? {
          actualInstructorId: s.actualInstructorId,
          actualTopic: s.actualTopic,
          actualDate: s.actualDate,
          notes: s.notes,
        } : null,
      })),
      students: filteredStudents,
      sessionStats,
      globalStats,
      pagination: {
        currentPage: pageNum,
        totalPages,
        sessionsPerPage: perPage,
        totalSessions: totalSessionsFiltered,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        studentFilter,
        searchTerm,
        sortBy,
        sortOrder,
      }
    };
  });
};
