import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { roles, rolePermissions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema para crear/actualizar rol
const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  canManageTransfers: z.boolean().optional().default(false),
  permissions: z.array(z.object({
    module: z.enum(['students', 'courses', 'instructors', 'groups', 'attendance', 'counseling', 'enrollments']),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
  })).optional(),
});

export const roleRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/roles - Listar todos los roles
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para ver roles' });
    }

    const rolesList = await db
      .select()
      .from(roles)
      .orderBy(sql`${roles.isSystemRole} DESC, ${roles.name} ASC`);

    return { data: rolesList };
  });

  // GET /api/roles/:id - Obtener rol específico
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso' });
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (!role) {
      return reply.code(404).send({ error: 'Rol no encontrado' });
    }

    return role;
  });

  // GET /api/roles/:id/permissions - Obtener permisos de un rol
  fastify.get('/:id/permissions', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso' });
    }

    const permissions = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));

    return { data: permissions };
  });

  // POST /api/roles - Crear nuevo rol
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para crear roles' });
    }

    try {
      const data = roleSchema.parse(request.body);

      // Verificar que el nombre no exista
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, data.name))
        .limit(1);

      if (existing) {
        return reply.code(409).send({ error: 'Ya existe un rol con ese nombre' });
      }

      // Crear rol
      const [newRole] = await db
        .insert(roles)
        .values({
          name: data.name,
          description: data.description,
          isSystemRole: false,
          canManageTransfers: data.canManageTransfers || false,
        })
        .returning();

      // Insertar permisos si se proveen
      if (data.permissions && data.permissions.length > 0) {
        const permissionInserts = data.permissions.map(perm => ({
          roleId: newRole.id,
          module: perm.module,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
        }));

        await db.insert(rolePermissions).values(permissionInserts);
      }

      return {
        ...newRole,
        message: 'Rol creado correctamente',
      };

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      console.error('Error al crear rol:', error);
      return reply.code(500).send({ error: 'Error al crear rol' });
    }
  });

  // PUT /api/roles/:id - Actualizar rol
  fastify.put('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para editar roles' });
    }

    try {
      const data = roleSchema.parse(request.body);

      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

      if (!role) {
        return reply.code(404).send({ error: 'Rol no encontrado' });
      }

      // No permitir editar roles del sistema
      if (role.isSystemRole && role.name === 'Administrador') {
        return reply.code(400).send({ error: 'No se puede editar el rol Administrador del sistema' });
      }

      // Verificar nombre único (si cambió)
      if (data.name !== role.name) {
        const [existing] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, data.name))
          .limit(1);

        if (existing) {
          return reply.code(409).send({ error: 'Ya existe un rol con ese nombre' });
        }
      }

      // Actualizar rol
      await db
        .update(roles)
        .set({
          name: data.name,
          description: data.description,
          canManageTransfers: data.canManageTransfers || false,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id));

      // Actualizar permisos si se proveen
      if (data.permissions) {
        // Eliminar permisos anteriores
        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, id));

        // Insertar nuevos permisos
        if (data.permissions.length > 0) {
          const permissionInserts = data.permissions.map(perm => ({
            roleId: id,
            module: perm.module,
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
          }));

          await db.insert(rolePermissions).values(permissionInserts);
        }
      }

      return { message: 'Rol actualizado correctamente' };

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      console.error('Error al actualizar rol:', error);
      return reply.code(500).send({ error: 'Error al actualizar rol' });
    }
  });

  // DELETE /api/roles/:id - Eliminar rol
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para eliminar roles' });
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (!role) {
      return reply.code(404).send({ error: 'Rol no encontrado' });
    }

    // No permitir eliminar roles del sistema
    if (role.isSystemRole) {
      return reply.code(400).send({ error: 'No se pueden eliminar roles del sistema' });
    }

    // Verificar si hay usuarios usando este rol
    // La FK con ON DELETE RESTRICT impedirá la eliminación si hay usuarios asignados
    try {
      await db.delete(roles).where(eq(roles.id, id));
      return { message: 'Rol eliminado correctamente' };
    } catch (error: any) {
      if (error.code === '23503') { // FK violation
        return reply.code(400).send({
          error: 'No se puede eliminar el rol porque hay usuarios asignados a él',
          details: 'Reasigna los usuarios a otro rol antes de eliminar'
        });
      }
      console.error('Error al eliminar rol:', error);
      return reply.code(500).send({ error: 'Error al eliminar rol' });
    }
  });
};
