import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import {
  classGroups, groupCourses, groupSessions, groupSessionTopics,
  groupEnrollments, groupTransactions, courses, courseThemes,
  instructors, students, studentBranches, holidays, branches,
  groupAssistants
} from '../db/schema';
import { eq, sql, desc, and, inArray, asc } from 'drizzle-orm';
import { z } from 'zod';
import { generateRecurrenceDates, RecurrenceConfig } from '../utils/recurrence';
import { checkPermission } from '../middleware/checkPermission';

// Validation schemas
const recurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().min(1),
  days: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  maxOccurrences: z.number().optional(),
});

const courseWithInstructorSchema = z.object({
  courseId: z.string().uuid(),
  instructorId: z.string().uuid(),
  orderIndex: z.number(),
});

const assistantSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  age: z.number().min(1).max(120).optional(),
});

const generateCalendarSchema = z.object({
  recurrence: recurrenceSchema,
  courses: z.array(courseWithInstructorSchema),
  branchId: z.string().uuid().optional(), // Para filtrar feriados provinciales
});

const groupCreateSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().optional(), // HH:MM format
  endTime: z.string().optional(), // HH:MM format
  assistants: z.array(assistantSchema).optional(),
  recurrence: recurrenceSchema,
  courses: z.array(courseWithInstructorSchema),
  sessions: z.array(z.object({
    sessionNumber: z.number(),
    sessionDate: z.string(),
    topics: z.array(z.object({
      courseId: z.string().uuid(),
      topicMode: z.enum(['auto', 'selected', 'manual']),
      topicTitle: z.string(),
      topicDescription: z.string().optional(),
      instructorId: z.string().uuid(),
      orderIndex: z.number(),
    })),
  })),
});

const enrollSchema = z.object({
  studentIds: z.array(z.string().uuid()),
  enrollmentDate: z.string().optional(),
});

const statusChangeSchema = z.object({
  status: z.enum(['active', 'closed', 'finished', 'eliminado', 'merged']),
  observation: z.string().min(5),
  targetGroupId: z.string().uuid().optional(),
  transferStudentIds: z.array(z.string().uuid()).optional(),
});

export const groupRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/groups - Listar grupos
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    let whereCondition = sql`${classGroups.branchId} = ${branchId} AND ${classGroups.status} != 'eliminado'`;
    if (search) {
      whereCondition = sql`${classGroups.branchId} = ${branchId} AND ${classGroups.status} != 'eliminado' AND (
        ${classGroups.name} ILIKE ${`%${search}%`} OR
        ${classGroups.description} ILIKE ${`%${search}%`}
      )`;
    }

    const [groups, [{ count }]] = await Promise.all([
      db.select().from(classGroups)
        .where(whereCondition)
        .orderBy(desc(classGroups.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(classGroups).where(whereCondition),
    ]);

    // Obtener datos adicionales para cada grupo: inscritos y progreso de sesiones
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      // Contar estudiantes inscritos activos
      const [enrolledResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(groupEnrollments)
        .where(and(
          eq(groupEnrollments.groupId, group.id),
          eq(groupEnrollments.status, 'active')
        ));

      // Contar sesiones totales y dictadas
      const sessionsStats = await db
        .select({
          total: sql<number>`count(*)::int`,
          dictated: sql<number>`count(*) filter (where status = 'dictada')::int`
        })
        .from(groupSessions)
        .where(eq(groupSessions.groupId, group.id));

      return {
        ...group,
        enrolledCount: enrolledResult?.count || 0,
        totalSessions: sessionsStats[0]?.total || 0,
        completedSessions: sessionsStats[0]?.dictated || 0,
      };
    }));

    return {
      data: groupsWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    };
  });

  // GET /api/groups/:id - Obtener grupo completo
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [group] = await db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    // Obtener cursos del grupo
    const groupCoursesData = await db
      .select({
        id: groupCourses.id,
        courseId: groupCourses.courseId,
        courseName: courses.name,
        instructorId: groupCourses.instructorId,
        instructorName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}`,
        orderIndex: groupCourses.orderIndex,
      })
      .from(groupCourses)
      .innerJoin(courses, eq(groupCourses.courseId, courses.id))
      .innerJoin(instructors, eq(groupCourses.instructorId, instructors.id))
      .where(eq(groupCourses.groupId, id))
      .orderBy(groupCourses.orderIndex);

    // Obtener sesiones con temas
    const sessionsData = await db
      .select()
      .from(groupSessions)
      .where(eq(groupSessions.groupId, id))
      .orderBy(groupSessions.sessionNumber);

    const sessionsWithTopics = await Promise.all(
      sessionsData.map(async (session) => {
        const topics = await db
          .select({
            id: groupSessionTopics.id,
            courseId: groupSessionTopics.courseId,
            courseName: courses.name,
            topicMode: groupSessionTopics.topicMode,
            topicTitle: groupSessionTopics.topicTitle,
            topicDescription: groupSessionTopics.topicDescription,
            instructorId: groupSessionTopics.instructorId,
            instructorName: sql<string>`${instructors.firstName} || ' ' || ${instructors.paternalLastName}`,
            orderIndex: groupSessionTopics.orderIndex,
          })
          .from(groupSessionTopics)
          .innerJoin(courses, eq(groupSessionTopics.courseId, courses.id))
          .innerJoin(instructors, eq(groupSessionTopics.instructorId, instructors.id))
          .where(eq(groupSessionTopics.sessionId, session.id))
          .orderBy(groupSessionTopics.orderIndex);

        return { ...session, topics };
      })
    );

    // Obtener inscripciones
    const enrollmentsData = await db
      .select({
        id: groupEnrollments.id,
        studentId: groupEnrollments.studentId,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.paternalLastName} || ' ' || COALESCE(${students.maternalLastName}, '')`,
        dni: students.dni,
        enrollmentDate: groupEnrollments.enrollmentDate,
        status: groupEnrollments.status,
      })
      .from(groupEnrollments)
      .innerJoin(students, eq(groupEnrollments.studentId, students.id))
      .where(eq(groupEnrollments.groupId, id));

    // Obtener asistentes de clase
    const assistantsData = await db
      .select()
      .from(groupAssistants)
      .where(eq(groupAssistants.groupId, id))
      .orderBy(groupAssistants.createdAt);

    // Contar sesiones dictadas
    const [sessionStats] = await db
      .select({
        totalSessions: sql<number>`count(*)::int`,
        dictatedSessions: sql<number>`count(*) filter (where ${groupSessions.status} = 'dictada')::int`,
      })
      .from(groupSessions)
      .where(eq(groupSessions.groupId, id));

    return {
      ...group,
      courses: groupCoursesData,
      sessions: sessionsWithTopics,
      enrollments: enrollmentsData,
      assistants: assistantsData,
      hasDictatedSessions: (sessionStats?.dictatedSessions || 0) > 0,
      dictatedSessionsCount: sessionStats?.dictatedSessions || 0,
      totalSessionsCount: sessionStats?.totalSessions || 0,
    };
  });

  // POST /api/groups/generate-calendar - Generar calendario en memoria
  fastify.post('/generate-calendar', async (request, reply) => {
    try {
      console.log('📅 Generate calendar request body:', JSON.stringify(request.body, null, 2));
      const validatedData = generateCalendarSchema.parse(request.body);
      const { recurrence, courses: groupCoursesInput, branchId } = validatedData;

      // Generar todas las fechas posibles según recurrencia
      const allDates = generateRecurrenceDates(recurrence as RecurrenceConfig);

      // Obtener departamento de la filial (si se proporciona branchId)
      let departmentId: string | null = null;
      if (branchId) {
        const [branch] = await db
          .select({ departmentId: branches.departmentId })
          .from(branches)
          .where(eq(branches.id, branchId))
          .limit(1);
        departmentId = branch?.departmentId || null;
      }

      // Obtener feriados en el rango de fechas
      const startDate = allDates[0];
      const endDate = allDates[allDates.length - 1];

      const holidayList = await db
        .select({
          date: holidays.date,
          name: holidays.name,
          type: holidays.type,
        })
        .from(holidays)
        .where(and(
          eq(holidays.isActive, true),
          sql`${holidays.date} >= ${startDate}::date`,
          sql`${holidays.date} <= ${endDate}::date`,
          departmentId
            ? sql`(${holidays.type} = 'national' OR ${holidays.departmentId} = ${departmentId}::uuid)`
            : eq(holidays.type, 'national')
        ))
        .orderBy(asc(holidays.date));

      // Crear set de fechas de feriados para búsqueda rápida
      const holidayDates = new Set(holidayList.map(h => h.date));
      const skippedHolidays: Array<{ date: string; name: string }> = [];

      // Filtrar fechas que no sean feriados
      const validDates = allDates.filter(date => {
        if (holidayDates.has(date)) {
          const holiday = holidayList.find(h => h.date === date);
          if (holiday) {
            skippedHolidays.push({ date, name: holiday.name });
          }
          return false;
        }
        return true;
      });

      const coursesWithThemes = await Promise.all(
        groupCoursesInput.map(async (gc) => {
          const themes = await db
            .select()
            .from(courseThemes)
            .where(eq(courseThemes.courseId, gc.courseId))
            .orderBy(courseThemes.orderIndex);

          const [course] = await db.select().from(courses).where(eq(courses.id, gc.courseId)).limit(1);

          return {
            ...gc,
            courseName: course?.name || '',
            themes,
          };
        })
      );

      const sessions = validDates.map((date, index) => {
        const topics = coursesWithThemes.map((course) => {
          // Si hay tema disponible para este índice, usarlo; si no, dejar vacío
          const theme = course.themes[index];
          const hasTheme = !!theme;

          return {
            courseId: course.courseId,
            courseName: course.courseName,
            topicMode: hasTheme ? 'auto' as const : 'manual' as const,
            topicTitle: hasTheme ? theme.title : '',
            topicDescription: hasTheme ? (theme.description || '') : '',
            instructorId: course.instructorId,
            orderIndex: course.orderIndex,
            isEmpty: !hasTheme, // Indicador para el frontend
          };
        });

        return {
          sessionNumber: index + 1,
          sessionDate: date,
          topics,
        };
      });

      return {
        sessions,
        skippedHolidays,
        message: skippedHolidays.length > 0
          ? `Se omitieron ${skippedHolidays.length} fecha(s) por ser feriado`
          : null,
      };
    } catch (error: any) {
      console.error('❌ Generate calendar error:', error);
      console.error('Error details:', error.issues || error.message);
      return reply.code(400).send({ error: error.message, details: error.issues });
    }
  });

  // POST /api/groups - Crear grupo completo
  fastify.post('/', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'create')]
  }, async (request, reply) => {
    try {
      const validatedData = groupCreateSchema.parse(request.body);
      const { branchId, name, description, startTime, endTime, assistants, recurrence, courses: coursesInput, sessions: sessionsInput } = validatedData;

      // Calcular fecha de fin a partir de las sesiones
      let calculatedEndDate = recurrence.endDate || null;
      if (!calculatedEndDate && sessionsInput && sessionsInput.length > 0) {
        const lastSession = sessionsInput[sessionsInput.length - 1];
        calculatedEndDate = lastSession.sessionDate;
      }

      const [newGroup] = await db
        .insert(classGroups)
        .values({
          branchId,
          name,
          description,
          startDate: recurrence.startDate,
          startTime: startTime || null,
          endTime: endTime || null,
          frequency: 'Semanal',
          recurrenceFrequency: recurrence.frequency,
          recurrenceInterval: recurrence.interval,
          recurrenceDays: recurrence.days ? JSON.stringify(recurrence.days) : null,
          endDate: calculatedEndDate,
          maxOccurrences: recurrence.maxOccurrences || null,
          status: 'active',
          isScheduleGenerated: true,
        })
        .returning();

      // Guardar asistentes si existen
      if (assistants && assistants.length > 0) {
        await db.insert(groupAssistants).values(
          assistants.map((a) => ({
            groupId: newGroup.id,
            fullName: a.fullName,
            phone: a.phone || null,
            gender: a.gender || null,
            age: a.age || null,
          }))
        );
      }

      await db.insert(groupCourses).values(
        coursesInput.map((c) => ({
          groupId: newGroup.id,
          courseId: c.courseId,
          instructorId: c.instructorId,
          orderIndex: c.orderIndex,
        }))
      );

      for (const session of sessionsInput) {
        const [newSession] = await db
          .insert(groupSessions)
          .values({
            groupId: newGroup.id,
            sessionNumber: session.sessionNumber,
            sessionDate: session.sessionDate,
          })
          .returning();

        await db.insert(groupSessionTopics).values(
          session.topics.map((topic) => ({
            sessionId: newSession.id,
            courseId: topic.courseId,
            topicMode: topic.topicMode,
            topicTitle: topic.topicTitle,
            topicDescription: topic.topicDescription || null,
            instructorId: topic.instructorId,
            orderIndex: topic.orderIndex,
          }))
        );
      }

      await db.insert(groupTransactions).values({
        groupId: newGroup.id,
        transactionType: 'Apertura',
        description: `Grupo ${name} creado`,
        observation: 'Grupo creado automáticamente',
      });

      return { success: true, group: newGroup };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // PUT /api/groups/:id - Actualizar grupo
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'edit')]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = groupCreateSchema.partial().parse(request.body);
      const { name, description, recurrence, courses: coursesInput, sessions: sessionsInput } = validatedData;

      if (name || description || recurrence) {
        await db
          .update(classGroups)
          .set({
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(recurrence && {
              startDate: recurrence.startDate,
              recurrenceFrequency: recurrence.frequency,
              recurrenceInterval: recurrence.interval,
              recurrenceDays: recurrence.days ? JSON.stringify(recurrence.days) : null,
              endDate: recurrence.endDate || null,
              maxOccurrences: recurrence.maxOccurrences || null,
            }),
            updatedAt: sql`NOW()`,
          })
          .where(eq(classGroups.id, id));
      }

      if (coursesInput) {
        await db.delete(groupCourses).where(eq(groupCourses.groupId, id));
        await db.insert(groupCourses).values(
          coursesInput.map((c) => ({
            groupId: id,
            courseId: c.courseId,
            instructorId: c.instructorId,
            orderIndex: c.orderIndex,
          }))
        );
      }

      if (sessionsInput) {
        await db.delete(groupSessions).where(eq(groupSessions.groupId, id));

        for (const session of sessionsInput) {
          const [newSession] = await db
            .insert(groupSessions)
            .values({
              groupId: id,
              sessionNumber: session.sessionNumber,
              sessionDate: session.sessionDate,
            })
            .returning();

          await db.insert(groupSessionTopics).values(
            session.topics.map((topic) => ({
              sessionId: newSession.id,
              courseId: topic.courseId,
              topicMode: topic.topicMode,
              topicTitle: topic.topicTitle,
              topicDescription: topic.topicDescription || null,
              instructorId: topic.instructorId,
              orderIndex: topic.orderIndex,
            }))
          );
        }
      }

      return { success: true };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // DELETE /api/groups/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'delete')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(classGroups).set({ status: 'eliminado', updatedAt: sql`NOW()` }).where(eq(classGroups.id, id));
    return { success: true };
  });

  // POST /api/groups/:id/enroll - Inscribir probacionistas
  fastify.post('/:id/enroll', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'edit')]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = enrollSchema.parse(request.body);
      const { studentIds, enrollmentDate } = validatedData;

      // Validar que el grupo esté activo
      const [group] = await db.select({ status: classGroups.status })
        .from(classGroups)
        .where(eq(classGroups.id, id))
        .limit(1);

      if (!group) {
        return reply.code(404).send({ error: 'Grupo no encontrado' });
      }

      if (group.status !== 'active') {
        return reply.code(400).send({
          error: 'Solo se pueden inscribir estudiantes a grupos activos',
          currentStatus: group.status
        });
      }

      const activeEnrollments = await db
        .select({
          studentId: groupEnrollments.studentId,
          groupName: classGroups.name,
        })
        .from(groupEnrollments)
        .innerJoin(classGroups, eq(groupEnrollments.groupId, classGroups.id))
        .where(
          and(
            inArray(groupEnrollments.studentId, studentIds),
            eq(groupEnrollments.status, 'active'),
            eq(classGroups.status, 'active'),
            sql`${classGroups.id} != ${id}`
          )
        );

      if (activeEnrollments.length > 0) {
        return reply.code(409).send({
          error: 'Algunos probacionistas ya están inscritos en otros grupos activos',
          conflicts: activeEnrollments,
        });
      }

      await db.insert(groupEnrollments).values(
        studentIds.map((studentId) => ({
          groupId: id,
          studentId,
          enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
          status: 'active',
        }))
      );

      return { success: true, enrolled: studentIds.length };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/groups/:id/students
  fastify.get('/:id/students', async (request, reply) => {
    const { id } = request.params as { id: string };

    const enrolledStudents = await db
      .select({
        id: groupEnrollments.id,
        studentId: students.id,
        dni: students.dni,
        firstName: students.firstName,
        paternalLastName: students.paternalLastName,
        maternalLastName: students.maternalLastName,
        gender: students.gender,
        email: students.email,
        phone: students.phone,
        enrollmentDate: groupEnrollments.enrollmentDate,
        status: groupEnrollments.status,
      })
      .from(groupEnrollments)
      .innerJoin(students, eq(groupEnrollments.studentId, students.id))
      .where(eq(groupEnrollments.groupId, id));

    return { data: enrolledStudents };
  });

  // GET /api/groups/:id/available-students
  fastify.get('/:id/available-students', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { branchId } = request.query as { branchId: string };

    const branchStudents = await db
      .select({ studentId: studentBranches.studentId })
      .from(studentBranches)
      .where(and(eq(studentBranches.branchId, branchId), eq(studentBranches.status, 'Alta')));

    const studentIds = branchStudents.map((s) => s.studentId);
    if (studentIds.length === 0) return { data: [] };

    const enrolledInActiveGroups = await db
      .select({ studentId: groupEnrollments.studentId })
      .from(groupEnrollments)
      .innerJoin(classGroups, eq(groupEnrollments.groupId, classGroups.id))
      .where(
        and(
          inArray(groupEnrollments.studentId, studentIds),
          eq(groupEnrollments.status, 'active'),
          eq(classGroups.status, 'active'),
          sql`${classGroups.id} != ${id}`
        )
      );

    const enrolledIds = enrolledInActiveGroups.map((e) => e.studentId);
    const availableIds = studentIds.filter((sid) => !enrolledIds.includes(sid));

    if (availableIds.length === 0) return { data: [] };

    const availableStudents = await db.select().from(students).where(inArray(students.id, availableIds));
    return { data: availableStudents };
  });

  // DELETE /api/groups/:id/enroll/:studentId
  fastify.delete('/:id/enroll/:studentId', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'edit')]
  }, async (request, reply) => {
    const { id, studentId } = request.params as { id: string; studentId: string };
    await db.delete(groupEnrollments).where(and(eq(groupEnrollments.groupId, id), eq(groupEnrollments.studentId, studentId)));
    return { success: true };
  });

  // PUT /api/groups/:id/status - Cambiar estado
  fastify.put('/:id/status', {
    preHandler: [fastify.authenticate, checkPermission('groups', 'edit')]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = statusChangeSchema.parse(request.body);
      const { status, observation, targetGroupId, transferStudentIds } = validatedData;

      await db.update(classGroups).set({ status, updatedAt: sql`NOW()` }).where(eq(classGroups.id, id));

      if (status === 'merged' && targetGroupId && transferStudentIds) {
        const enrollmentsToTransfer = await db
          .select()
          .from(groupEnrollments)
          .where(and(eq(groupEnrollments.groupId, id), inArray(groupEnrollments.studentId, transferStudentIds)));

        await db.insert(groupEnrollments).values(
          enrollmentsToTransfer.map((e) => ({
            groupId: targetGroupId,
            studentId: e.studentId,
            enrollmentDate: new Date().toISOString().split('T')[0],
            status: 'active',
          }))
        );

        await db
          .update(groupEnrollments)
          .set({ status: 'inactive' })
          .where(and(eq(groupEnrollments.groupId, id), inArray(groupEnrollments.studentId, transferStudentIds)));
      }

      const transactionTypeMap: Record<string, string> = {
        active: 'Activación',
        closed: 'Cierre',
        finished: 'Finalización',
        eliminado: 'Baja',
        merged: 'Fusión',
      };

      await db.insert(groupTransactions).values({
        groupId: id,
        transactionType: transactionTypeMap[status] || 'Cambio de Estado',
        description: `Grupo cambió a estado: ${status}`,
        observation,
        targetGroupId: targetGroupId || null,
      });

      return { success: true };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/groups/:id/transactions
  fastify.get('/:id/transactions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const transactions = await db.select().from(groupTransactions).where(eq(groupTransactions.groupId, id)).orderBy(desc(groupTransactions.transactionDate));
    return { data: transactions };
  });

  // ============================================
  // ENDPOINTS DE ASISTENTES DE CLASE
  // ============================================

  // GET /api/groups/:id/assistants - Listar asistentes
  fastify.get('/:id/assistants', async (request, reply) => {
    const { id } = request.params as { id: string };
    const assistants = await db
      .select()
      .from(groupAssistants)
      .where(eq(groupAssistants.groupId, id))
      .orderBy(groupAssistants.createdAt);
    return { data: assistants };
  });

  // POST /api/groups/:id/assistants - Agregar asistente
  fastify.post('/:id/assistants', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = assistantSchema.parse(request.body);

      const [newAssistant] = await db
        .insert(groupAssistants)
        .values({
          groupId: id,
          fullName: validatedData.fullName,
          phone: validatedData.phone || null,
          gender: validatedData.gender || null,
          age: validatedData.age || null,
        })
        .returning();

      return { success: true, assistant: newAssistant };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // PUT /api/groups/:id/assistants/:assistantId - Editar asistente
  fastify.put('/:id/assistants/:assistantId', async (request, reply) => {
    try {
      const { id, assistantId } = request.params as { id: string; assistantId: string };
      const validatedData = assistantSchema.partial().parse(request.body);

      const [updated] = await db
        .update(groupAssistants)
        .set({
          ...validatedData,
          updatedAt: sql`NOW()`,
        })
        .where(and(eq(groupAssistants.id, assistantId), eq(groupAssistants.groupId, id)))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Assistant not found' });
      }

      return { success: true, assistant: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/groups/:id/assistants/:assistantId - Eliminar asistente
  fastify.delete('/:id/assistants/:assistantId', async (request, reply) => {
    const { id, assistantId } = request.params as { id: string; assistantId: string };
    await db.delete(groupAssistants).where(and(eq(groupAssistants.id, assistantId), eq(groupAssistants.groupId, id)));
    return { success: true };
  });
};
