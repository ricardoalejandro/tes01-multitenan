import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { courseTemplates, courseTemplateTopics, users } from '../db/schema';
import { eq, desc, ilike, sql, asc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const templateTopicSchema = z.object({
  orderIndex: z.number().int().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  topics: z.array(templateTopicSchema).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  topics: z.array(templateTopicSchema).optional(),
});

export const courseTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /course-templates - Listar todas las plantillas activas
  fastify.get('/', async (request, reply) => {
    const { search = '', includeInactive = 'false' } = request.query as any;
    
    let whereCondition = sql`1=1`;
    
    if (includeInactive !== 'true') {
      whereCondition = sql`${courseTemplates.isActive} = true`;
    }
    
    if (search) {
      whereCondition = sql`${whereCondition} AND (
        ${courseTemplates.name} ILIKE ${`%${search}%`} OR
        ${courseTemplates.description} ILIKE ${`%${search}%`}
      )`;
    }
    
    const templates = await db
      .select({
        id: courseTemplates.id,
        name: courseTemplates.name,
        description: courseTemplates.description,
        isActive: courseTemplates.isActive,
        createdBy: courseTemplates.createdBy,
        createdAt: courseTemplates.createdAt,
        updatedAt: courseTemplates.updatedAt,
      })
      .from(courseTemplates)
      .where(whereCondition)
      .orderBy(desc(courseTemplates.createdAt));
    
    // Get topic count for each template
    const templatesWithCount = await Promise.all(
      templates.map(async (template) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(courseTemplateTopics)
          .where(eq(courseTemplateTopics.templateId, template.id));
        
        // Get creator name if exists
        let creatorName = null;
        if (template.createdBy) {
          const [creator] = await db
            .select({ fullName: users.fullName, username: users.username })
            .from(users)
            .where(eq(users.id, template.createdBy))
            .limit(1);
          creatorName = creator?.fullName || creator?.username || null;
        }
        
        return {
          ...template,
          topicsCount: count,
          creatorName,
        };
      })
    );
    
    return { data: templatesWithCount };
  });

  // GET /course-templates/:id - Obtener plantilla con temas
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [template] = await db
      .select()
      .from(courseTemplates)
      .where(eq(courseTemplates.id, id))
      .limit(1);
    
    if (!template) {
      return reply.code(404).send({ error: 'Plantilla no encontrada' });
    }
    
    const topics = await db
      .select()
      .from(courseTemplateTopics)
      .where(eq(courseTemplateTopics.templateId, id))
      .orderBy(asc(courseTemplateTopics.orderIndex));
    
    // Get creator name
    let creatorName = null;
    if (template.createdBy) {
      const [creator] = await db
        .select({ fullName: users.fullName, username: users.username })
        .from(users)
        .where(eq(users.id, template.createdBy))
        .limit(1);
      creatorName = creator?.fullName || creator?.username || null;
    }
    
    return {
      ...template,
      topics,
      topicsCount: topics.length,
      creatorName,
    };
  });

  // POST /course-templates - Crear plantilla
  fastify.post('/', async (request, reply) => {
    try {
      const body = createTemplateSchema.parse(request.body);
      const { topics, ...templateData } = body;
      
      // Get user from JWT if available
      let createdBy = null;
      try {
        const auth = request.headers.authorization;
        if (auth) {
          const token = auth.replace('Bearer ', '');
          const decoded = fastify.jwt.decode(token) as any;
          createdBy = decoded?.userId || null;
        }
      } catch (e) {
        // Ignore auth errors
      }
      
      const [template] = await db
        .insert(courseTemplates)
        .values({
          ...templateData,
          createdBy,
        })
        .returning();
      
      // Insert topics if provided
      if (topics && topics.length > 0) {
        await db.insert(courseTemplateTopics).values(
          topics.map((topic, index) => ({
            templateId: template.id,
            orderIndex: topic.orderIndex || index + 1,
            title: topic.title,
            description: topic.description || '',
          }))
        );
      }
      
      // Fetch complete template with topics
      const insertedTopics = await db
        .select()
        .from(courseTemplateTopics)
        .where(eq(courseTemplateTopics.templateId, template.id))
        .orderBy(asc(courseTemplateTopics.orderIndex));
      
      return {
        ...template,
        topics: insertedTopics,
        topicsCount: insertedTopics.length,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // PUT /course-templates/:id - Actualizar plantilla
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateTemplateSchema.parse(request.body);
      const { topics, ...templateData } = body;
      
      // Check if template exists
      const [existing] = await db
        .select()
        .from(courseTemplates)
        .where(eq(courseTemplates.id, id))
        .limit(1);
      
      if (!existing) {
        return reply.code(404).send({ error: 'Plantilla no encontrada' });
      }
      
      // Update template
      const [template] = await db
        .update(courseTemplates)
        .set({
          ...templateData,
          updatedAt: new Date(),
        })
        .where(eq(courseTemplates.id, id))
        .returning();
      
      // Update topics if provided
      if (topics !== undefined) {
        // Delete existing topics
        await db.delete(courseTemplateTopics).where(eq(courseTemplateTopics.templateId, id));
        
        // Insert new topics
        if (topics.length > 0) {
          await db.insert(courseTemplateTopics).values(
            topics.map((topic, index) => ({
              templateId: id,
              orderIndex: topic.orderIndex || index + 1,
              title: topic.title,
              description: topic.description || '',
            }))
          );
        }
      }
      
      // Fetch updated topics
      const updatedTopics = await db
        .select()
        .from(courseTemplateTopics)
        .where(eq(courseTemplateTopics.templateId, id))
        .orderBy(asc(courseTemplateTopics.orderIndex));
      
      return {
        ...template,
        topics: updatedTopics,
        topicsCount: updatedTopics.length,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // DELETE /course-templates/:id - Eliminar plantilla (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [existing] = await db
      .select()
      .from(courseTemplates)
      .where(eq(courseTemplates.id, id))
      .limit(1);
    
    if (!existing) {
      return reply.code(404).send({ error: 'Plantilla no encontrada' });
    }
    
    // Soft delete - mark as inactive
    await db
      .update(courseTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(courseTemplates.id, id));
    
    return { success: true, message: 'Plantilla desactivada correctamente' };
  });

  // POST /course-templates/:id/duplicate - Duplicar plantilla
  fastify.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name?: string };
    
    // Get original template
    const [original] = await db
      .select()
      .from(courseTemplates)
      .where(eq(courseTemplates.id, id))
      .limit(1);
    
    if (!original) {
      return reply.code(404).send({ error: 'Plantilla no encontrada' });
    }
    
    // Get user from JWT
    let createdBy = null;
    try {
      const auth = request.headers.authorization;
      if (auth) {
        const token = auth.replace('Bearer ', '');
        const decoded = fastify.jwt.decode(token) as any;
        createdBy = decoded?.userId || null;
      }
    } catch (e) {
      // Ignore
    }
    
    // Create duplicate
    const [newTemplate] = await db
      .insert(courseTemplates)
      .values({
        name: name || `${original.name} (Copia)`,
        description: original.description,
        isActive: true,
        createdBy,
      })
      .returning();
    
    // Copy topics
    const originalTopics = await db
      .select()
      .from(courseTemplateTopics)
      .where(eq(courseTemplateTopics.templateId, id))
      .orderBy(asc(courseTemplateTopics.orderIndex));
    
    if (originalTopics.length > 0) {
      await db.insert(courseTemplateTopics).values(
        originalTopics.map((topic) => ({
          templateId: newTemplate.id,
          orderIndex: topic.orderIndex,
          title: topic.title,
          description: topic.description,
        }))
      );
    }
    
    // Return complete new template
    const newTopics = await db
      .select()
      .from(courseTemplateTopics)
      .where(eq(courseTemplateTopics.templateId, newTemplate.id))
      .orderBy(asc(courseTemplateTopics.orderIndex));
    
    return {
      ...newTemplate,
      topics: newTopics,
      topicsCount: newTopics.length,
    };
  });
};
