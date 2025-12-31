import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, userBranchRoles, branches, roles } from '../db/schema';
import { eq, like, or, sql, ne } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validación para crear usuario
const createUserSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  fullName: z.string().min(1, 'El nombre completo es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  userType: z.enum(['admin', 'normal']),
  branchRoles: z.array(z.object({
    branchId: z.string().uuid(),
    roleId: z.string().uuid(),
  })).optional(),
});

// Schema para actualizar usuario
const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  userType: z.enum(['admin', 'normal']).optional(),
  branchRoles: z.array(z.object({
    branchId: z.string().uuid(),
    roleId: z.string().uuid(),
  })).optional(),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /api/users - Listar usuarios (solo administradores)
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    
    // Solo administradores pueden listar usuarios
    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para ver usuarios' });
    }

    const { page = 1, limit = 20, search = '' } = request.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    // Construir condiciones de búsqueda
    let conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.username, `%${search}%`),
          like(users.fullName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    const whereCondition = conditions.length > 0 ? conditions[0] : undefined;

    const [usersList, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          userType: users.userType,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereCondition)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(Number(limit))
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereCondition),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data: usersList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  // GET /api/users/:id - Obtener usuario específico
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    // Solo administradores o el mismo usuario pueden ver detalles
    if (currentUser.userType !== 'admin' && currentUser.userId !== id) {
      return reply.code(403).send({ error: 'No tienes permiso para ver este usuario' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    // Obtener filiales y roles asignados
    const userBranchRolesList = await db
      .select({
        branchId: userBranchRoles.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        roleId: userBranchRoles.roleId,
        roleName: roles.name,
        assignedAt: userBranchRoles.assignedAt,
      })
      .from(userBranchRoles)
      .innerJoin(branches, eq(userBranchRoles.branchId, branches.id))
      .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
      .where(eq(userBranchRoles.userId, id));

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      branchRoles: userBranchRolesList,
    };
  });

  // POST /api/users - Crear usuario (solo administradores)
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para crear usuarios' });
    }

    try {
      const data = createUserSchema.parse(request.body);

      // Verificar que username y email no existan
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.username, data.username),
            eq(users.email, data.email)
          )
        )
        .limit(1);

      if (existingUser) {
        if (existingUser.username === data.username) {
          return reply.code(409).send({ error: 'El nombre de usuario ya existe' });
        }
        if (existingUser.email === data.email) {
          return reply.code(409).send({ error: 'El email ya está registrado' });
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Crear usuario
      const [newUser] = await db
        .insert(users)
        .values({
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          userType: data.userType,
        })
        .returning();

      // Asignar filiales y roles
      if (data.branchRoles && data.branchRoles.length > 0) {
        const branchRoleInserts = data.branchRoles.map(br => ({
          userId: newUser.id,
          branchId: br.branchId,
          roleId: br.roleId,
        }));

        await db.insert(userBranchRoles).values(branchRoleInserts);
      }

      return {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        userType: newUser.userType,
        createdAt: newUser.createdAt,
      };

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      console.error('Error al crear usuario:', error);
      return reply.code(500).send({ error: 'Error al crear usuario' });
    }
  });

  // PUT /api/users/:id - Actualizar usuario
  fastify.put('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    // Solo administradores pueden editar cualquier usuario
    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para editar usuarios' });
    }

    try {
      const data = updateUserSchema.parse(request.body);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'Usuario no encontrado' });
      }

      // Actualizar usuario (sin email ni username)
      const updates: any = {};
      if (data.fullName !== undefined) updates.fullName = data.fullName;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.userType !== undefined) updates.userType = data.userType;
      updates.updatedAt = new Date();

      if (Object.keys(updates).length > 0) {
        await db
          .update(users)
          .set(updates)
          .where(eq(users.id, id));
      }

      // Actualizar branchRoles si se provee
      if (data.branchRoles) {
        // Eliminar asignaciones anteriores
        await db
          .delete(userBranchRoles)
          .where(eq(userBranchRoles.userId, id));

        // Insertar nuevas asignaciones
        if (data.branchRoles.length > 0) {
          const branchRoleInserts = data.branchRoles.map(br => ({
            userId: id,
            branchId: br.branchId,
            roleId: br.roleId,
          }));

          await db.insert(userBranchRoles).values(branchRoleInserts);
        }
      }

      return { message: 'Usuario actualizado correctamente' };

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Datos inválidos', details: error.errors });
      }
      console.error('Error al actualizar usuario:', error);
      return reply.code(500).send({ error: 'Error al actualizar usuario' });
    }
  });

  // DELETE /api/users/:id - Eliminar usuario (solo administradores)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para eliminar usuarios' });
    }

    // No permitir que un admin se elimine a sí mismo
    if (currentUser.userId === id) {
      return reply.code(400).send({ error: 'No puedes eliminarte a ti mismo' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    // Eliminar usuario (cascade eliminará userBranchRoles)
    await db.delete(users).where(eq(users.id, id));

    return { message: 'Usuario eliminado correctamente' };
  });

  // PUT /api/users/:id/reset-password - Restablecer contraseña (solo admin)
  fastify.put('/:id/reset-password', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;
    const { newPassword } = request.body as { newPassword: string };

    // Solo administradores pueden restablecer contraseñas
    if (currentUser.userType !== 'admin') {
      return reply.code(403).send({ error: 'No tienes permiso para restablecer contraseñas' });
    }

    if (!newPassword || newPassword.length < 6) {
      return reply.code(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'Usuario no encontrado' });
      }

      // Hash nueva contraseña
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({ 
          passwordHash, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));

      return { message: 'Contraseña restablecida correctamente' };
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      return reply.code(500).send({ error: 'Error al restablecer contraseña' });
    }
  });

  // GET /api/users/:id/branches - Obtener filiales asignadas
  fastify.get('/:id/branches', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const currentUser = (request.user as any);
    const { id } = request.params as any;

    if (currentUser.userType !== 'admin' && currentUser.userId !== id) {
      return reply.code(403).send({ error: 'No tienes permiso' });
    }

    const branchRolesList = await db
      .select({
        branchId: userBranchRoles.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        roleId: userBranchRoles.roleId,
        roleName: roles.name,
      })
      .from(userBranchRoles)
      .innerJoin(branches, eq(userBranchRoles.branchId, branches.id))
      .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
      .where(eq(userBranchRoles.userId, id));

    return { data: branchRolesList };
  });
};
