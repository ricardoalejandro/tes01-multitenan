import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, branches, roles, userBranchRoles, rolePermissions, passwordResetTokens } from '../db/schema';
import { eq, and, ne, gt } from 'drizzle-orm';
import { getUserBranchesWithRoles, getUserBranchPermissions } from '../middleware/checkPermission';
import { sendPasswordResetEmail, generateResetToken } from '../services/emailService';
import { z } from 'zod';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    // Find user
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    // Obtener filiales y roles del usuario
    let userBranches: any[] = [];

    if (user.userType === 'admin') {
      // Administradores ven todas las filiales activas
      const allBranches = await db
        .select()
        .from(branches)
        .where(ne(branches.status, 'eliminado'));

      userBranches = allBranches.map(branch => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        description: branch.description,
        status: branch.status,
        active: branch.active,
        roleId: null,
        roleName: 'Administrador',
        permissions: {
          students: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          courses: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          instructors: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          groups: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          attendance: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          counseling: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          enrollments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        },
      }));
    } else {
      // Usuarios normales: solo sus filiales asignadas
      const userBranchRolesList = await getUserBranchesWithRoles(user.id);

      for (const ubr of userBranchRolesList) {
        const [branch] = await db
          .select()
          .from(branches)
          .where(
            and(
              eq(branches.id, ubr.branchId),
              ne(branches.status, 'eliminado')
            )
          )
          .limit(1);

        if (!branch) continue;

        const [role] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, ubr.roleId))
          .limit(1);

        const permissions = await getUserBranchPermissions(user.id, branch.id);

        userBranches.push({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          description: branch.description,
          status: branch.status,
          active: branch.active,
          roleId: role?.id || null,
          roleName: role?.name || 'Sin rol',
          permissions: permissions?.permissions || {},
        });
      }
    }

    // Generate JWT con user_type
    const token = fastify.jwt.sign({
      userId: user.id,
      username: user.username,
      userType: user.userType,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
      },
      branches: userBranches,
    };
  });

  // Get current user info
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    // Obtener filiales y roles del usuario
    let userBranches: any[] = [];

    if (user.userType === 'admin') {
      // Administradores ven todas las filiales activas
      const allBranches = await db
        .select()
        .from(branches)
        .where(ne(branches.status, 'eliminado'));

      userBranches = allBranches.map(branch => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        description: branch.description,
        status: branch.status,
        active: branch.active,
        roleId: null,
        roleName: 'Administrador',
        permissions: {
          students: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          courses: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          instructors: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          groups: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          attendance: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          counseling: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          enrollments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        },
      }));
    } else {
      // Usuarios normales: solo sus filiales asignadas
      const userBranchRolesList = await getUserBranchesWithRoles(user.id);

      for (const ubr of userBranchRolesList) {
        const [branch] = await db
          .select()
          .from(branches)
          .where(
            and(
              eq(branches.id, ubr.branchId),
              ne(branches.status, 'eliminado')
            )
          )
          .limit(1);

        if (!branch) continue;

        const [role] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, ubr.roleId))
          .limit(1);

        const permissions = await getUserBranchPermissions(user.id, branch.id);

        userBranches.push({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          description: branch.description,
          status: branch.status,
          active: branch.active,
          roleId: role?.id || null,
          roleName: role?.name || 'Sin rol',
          permissions: permissions?.permissions || {},
        });
      }
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
      },
      branches: userBranches,
    };
  });

  // POST /api/auth/test-email - Endpoint de prueba para diagnóstico (solo en desarrollo)
  fastify.post('/test-email', async (request, reply) => {
    const { to } = request.body as { to: string };

    if (!to) {
      return reply.code(400).send({ error: 'El email destino es requerido' });
    }

    try {
      console.log('🧪 [TEST EMAIL] Iniciando prueba de envío a:', to);
      
      // Intentar enviar email de prueba
      await sendPasswordResetEmail(
        to, 
        'Usuario de Prueba',
        'test-token-12345',
        process.env.FRONTEND_URL || 'http://localhost:5000'
      );

      console.log('✅ [TEST EMAIL] Email enviado exitosamente');
      
      return { 
        success: true,
        message: 'Email de prueba enviado exitosamente',
        to,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ [TEST EMAIL] Error:', error);
      
      return reply.code(500).send({ 
        success: false,
        error: 'Error al enviar email de prueba',
        details: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      });
    }
  });

  // POST /api/auth/forgot-password - Solicitar reseteo de contraseña
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string };

    if (!email) {
      return reply.code(400).send({ error: 'El email es requerido' });
    }

    try {
      // Buscar usuario por email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Por seguridad, siempre responder con éxito (no revelar si el email existe)
      if (!user) {
        return { 
          message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' 
        };
      }

      // Generar token
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Guardar token en BD
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Enviar email (ahora con OAuth si está disponible)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      await sendPasswordResetEmail(user.email, user.username, token, frontendUrl);

      return { 
        message: 'Se ha enviado un email con instrucciones para restablecer tu contraseña' 
      };

    } catch (error: any) {
      console.error('Error en forgot-password:', error);
      
      // Dar un mensaje más específico según el error
      if (error.message && error.message.includes('configuración de email')) {
        return reply.code(500).send({ 
          error: 'El servidor de correo no está configurado',
          message: 'Por favor contacta al administrador para configurar el servicio de email'
        });
      }
      
      return reply.code(500).send({ 
        error: 'Error al procesar la solicitud',
        message: 'No se pudo enviar el email. Por favor intenta más tarde o contacta al administrador.'
      });
    }
  });

  // GET /api/auth/verify-token/:token - Verificar token de reseteo
  fastify.get('/verify-token/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.usedAt) {
      return reply.code(400).send({ 
        error: 'Token inválido o expirado',
        valid: false 
      });
    }

    return { valid: true };
  });

  // POST /api/auth/reset-password/:token - Cambiar contraseña con token
  fastify.post('/reset-password/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const { newPassword } = request.body as { newPassword: string };

    if (!newPassword || newPassword.length < 6) {
      return reply.code(400).send({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    try {
      // Verificar token
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!tokenRecord || tokenRecord.usedAt) {
        return reply.code(400).send({ 
          error: 'Token inválido, expirado o ya utilizado' 
        });
      }

      // Hash nueva contraseña
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña del usuario
      await db
        .update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date() 
        })
        .where(eq(users.id, tokenRecord.userId));

      // Marcar token como usado
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, tokenRecord.id));

      return { message: 'Contraseña actualizada correctamente' };

    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      return reply.code(500).send({ error: 'Error al actualizar la contraseña' });
    }
  });

  // POST /api/auth/request-password-change - Solicitar cambio (usuario logueado)
  fastify.post('/request-password-change', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'Usuario no encontrado' });
      }

      // Generar token
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Guardar token
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Enviar email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      await sendPasswordResetEmail(user.email, user.username, token, frontendUrl);

      return { 
        message: 'Se ha enviado un email con instrucciones para cambiar tu contraseña' 
      };

    } catch (error: any) {
      console.error('Error al solicitar cambio de contraseña:', error);
      
      if (error.message && error.message.includes('SMTP')) {
        return reply.code(500).send({ 
          error: 'Error al enviar el email. El servidor de correo no está configurado correctamente.' 
        });
      }
      
      return reply.code(500).send({ error: 'Error al procesar la solicitud' });
    }
  });
};

// JWT authentication decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

// Register authentication hook
export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};
