import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { 
  groupSessions, groupSessionTopics, sessionAttendance, attendanceObservations,
  sessionExecution, classGroups, groupEnrollments, students, instructors,
  groupAssistants, courses, users
} from '../db/schema';
import { eq, sql, desc, and, asc, lte, gte, SQL } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const updateAttendanceSchema = z.object({
  status: z.enum(['pendiente', 'asistio', 'no_asistio', 'tarde', 'justificado', 'permiso']),
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
  // ESTUDIANTES CON ASISTENCIA
  // ============================================

  // GET /api/attendance/sessions/:sessionId/students - Estudiantes con su asistencia
  fastify.get('/sessions/:sessionId/students', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

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

    // Obtener asistencia de cada estudiante
    const studentsWithAttendance = await Promise.all(
      enrolledStudents.map(async (student) => {
        // Buscar o crear registro de asistencia
        let [attendance] = await db
          .select({
            id: sessionAttendance.id,
            status: sessionAttendance.status,
          })
          .from(sessionAttendance)
          .where(and(
            eq(sessionAttendance.sessionId, sessionId),
            eq(sessionAttendance.studentId, student.studentId)
          ))
          .limit(1);

        // Si no existe, crear uno con estado pendiente
        if (!attendance) {
          const [newAttendance] = await db
            .insert(sessionAttendance)
            .values({
              sessionId,
              studentId: student.studentId,
              status: 'pendiente',
            })
            .returning({ id: sessionAttendance.id, status: sessionAttendance.status });
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

  // PUT /api/attendance/students/:attendanceId - Actualizar estado de asistencia
  fastify.put('/students/:attendanceId', async (request, reply) => {
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
  fastify.post('/students/:attendanceId/observations', async (request, reply) => {
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
  fastify.put('/sessions/:sessionId/execution', async (request, reply) => {
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
  fastify.put('/sessions/:sessionId/complete', async (request, reply) => {
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
      sortOrder = 'asc'
    } = request.query as { 
      startDate?: string; 
      endDate?: string;
      page?: string;
      sessionsPerPage?: string;
      studentFilter?: string;
      searchTerm?: string;
      sortBy?: string;
      sortOrder?: string;
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

    // 2. Obtener todas las sesiones del grupo (con filtros de fecha opcionales)
    const allSessions = await db
      .select({
        id: groupSessions.id,
        sessionNumber: groupSessions.sessionNumber,
        sessionDate: groupSessions.sessionDate,
        status: groupSessions.status,
      })
      .from(groupSessions)
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

    // 4. Obtener toda la asistencia para las sesiones filtradas
    const sessionIds = filteredSessions.map(s => s.id);
    
    let attendanceRecords: { sessionId: string; studentId: string; status: string }[] = [];
    if (sessionIds.length > 0) {
      attendanceRecords = await db
        .select({
          sessionId: sessionAttendance.sessionId,
          studentId: sessionAttendance.studentId,
          status: sessionAttendance.status,
        })
        .from(sessionAttendance)
        .where(sql`${sessionAttendance.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // 5. Crear mapa de asistencia por estudiante y sesión
    const attendanceMap = new Map<string, Map<string, string>>();
    attendanceRecords.forEach(record => {
      if (!attendanceMap.has(record.studentId)) {
        attendanceMap.set(record.studentId, new Map());
      }
      attendanceMap.get(record.studentId)!.set(record.sessionId, record.status);
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
        const status = studentAttendance.get(session.id) || 'pendiente';
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
      const sessionData: Record<string, string> = {};
      paginatedSessions.forEach(session => {
        sessionData[session.id] = studentAttendance.get(session.id) || 'pendiente';
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
        const status = studentAttendance?.get(session.id) || 'pendiente';
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
