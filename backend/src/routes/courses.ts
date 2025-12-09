import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { courses, courseThemes } from '../db/schema';
import { eq, sql, ilike, or, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { checkPermission } from '../middleware/checkPermission';

export const courseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { branchId, page = 1, limit = 10, search = '' } = request.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions (exclude deleted)
    let whereCondition = sql`${courses.branchId} = ${branchId} AND ${courses.status} != 'eliminado'`;
    if (search) {
      whereCondition = sql`${courses.branchId} = ${branchId} AND ${courses.status} != 'eliminado' AND (
        ${courses.name} ILIKE ${`%${search}%`} OR
        ${courses.description} ILIKE ${`%${search}%`}
      )`;
    }

    const [courseList, [{ count }]] = await Promise.all([
      db.select().from(courses)
        .where(whereCondition)
        .orderBy(desc(courses.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(courses).where(sql`${courses.branchId} = ${branchId} AND ${courses.status} != 'eliminado'`),
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

  fastify.post('/', {
    preHandler: [fastify.authenticate, checkPermission('courses', 'create')]
  }, async (request, reply) => {
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

  fastify.put('/:id', {
    preHandler: [fastify.authenticate, checkPermission('courses', 'edit')]
  }, async (request, reply) => {
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

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Primero obtener el curso para conseguir el branchId
    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);

    if (!course) {
      return reply.code(404).send({ error: 'Curso no encontrado' });
    }

    // Verificar permisos manualmente con el branchId del curso
    const user = (request.user as any);
    if (user.userType !== 'admin') {
      // Inyectar branchId para la verificación de permisos
      (request.query as any).branchId = course.branchId;
      const permissionCheck = checkPermission('courses', 'delete');
      const result = await permissionCheck(request, reply);
      if (result) return result; // Si hay error, retornarlo
    }

    await db.update(courses)
      .set({ status: 'eliminado', updatedAt: new Date() })
      .where(eq(courses.id, id));
    return { success: true, message: 'Curso marcado como eliminado' };
  });

  // Get themes for a specific course
  fastify.get('/:id/themes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const themes = await db
      .select()
      .from(courseThemes)
      .where(eq(courseThemes.courseId, id))
      .orderBy(asc(courseThemes.orderIndex));
    return { data: themes };
  });

  // Export themes to CSV/Excel
  fastify.get('/:id/export', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { format = 'csv', includeData = 'true' } = request.query as any;

    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' });
    }

    let rows: any[] = [];

    if (includeData === 'true') {
      const themes = await db
        .select()
        .from(courseThemes)
        .where(eq(courseThemes.courseId, id))
        .orderBy(asc(courseThemes.orderIndex));

      rows = themes.map(t => ({
        order: t.orderIndex,
        title: t.title || '',
        description: t.description || '',
      }));
    } else {
      // Empty template with 5 example rows
      rows = [
        { order: 1, title: '', description: '' },
        { order: 2, title: '', description: '' },
        { order: 3, title: '', description: '' },
        { order: 4, title: '', description: '' },
        { order: 5, title: '', description: '' },
      ];
    }

    if (format === 'excel') {
      // Generate Excel file
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Temas');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="curso_${course.name.replace(/\s+/g, '_')}_temas.xlsx"`);
      return reply.send(buffer);
    } else {
      // Generate CSV
      const csvHeader = 'order,title,description\n';
      const csvRows = rows.map(r => `${r.order},"${(r.title || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"`).join('\n');
      const csv = csvHeader + csvRows;

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="curso_${course.name.replace(/\s+/g, '_')}_temas.csv"`);
      return reply.send('\uFEFF' + csv); // BOM for UTF-8
    }
  });

  // Import themes from CSV/Excel (preview only, not saved yet)
  fastify.post('/:id/import-preview', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const filename = data.filename.toLowerCase();

      let themes: any[] = [];

      if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        // Parse Excel
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        themes = jsonData.map((row: any) => ({
          orderIndex: parseInt(row.order) || 0,
          title: (row.title || '').toString().trim(),
          description: (row.description || '').toString().trim(),
        }));
      } else if (filename.endsWith('.csv')) {
        // Parse CSV
        const csvText = buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remove BOM
        const lines = csvText.split('\n').filter(line => line.trim());

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const match = lines[i].match(/^(\d+),"([^"]*)","([^"]*)"$/);
          if (match) {
            themes.push({
              orderIndex: parseInt(match[1]),
              title: match[2].replace(/""/g, '"').trim(),
              description: match[3].replace(/""/g, '"').trim(),
            });
          }
        }
      } else {
        return reply.code(400).send({ error: 'Formato no soportado. Use .xlsx o .csv' });
      }

      // Validate
      const themeSchema = z.object({
        orderIndex: z.number().int().min(1),
        title: z.string().min(1, 'Título es requerido').max(255),
        description: z.string().optional(),
      });

      const validatedThemes = themes
        .filter(t => t.title && t.title.length > 0)
        .map(t => themeSchema.parse(t));

      // Check for duplicate orders
      const orders = validatedThemes.map(t => t.orderIndex);
      if (new Set(orders).size !== orders.length) {
        return reply.code(400).send({ error: 'Números de orden duplicados detectados' });
      }

      return {
        success: true,
        themes: validatedThemes,
        count: validatedThemes.length
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Error de validación',
          details: error.errors
        });
      }
      return reply.code(400).send({ error: error.message || 'Error al procesar archivo' });
    }
  });
};
