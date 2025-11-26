import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { userBranchRoles, rolePermissions } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Tipos de acciones de permisos
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

// Módulos del sistema
export type SystemModule = 
  | 'students' 
  | 'courses' 
  | 'instructors' 
  | 'groups' 
  | 'attendance' 
  | 'counseling' 
  | 'enrollments';

/**
 * Middleware para verificar permisos de un usuario en un módulo específico
 * Los administradores (userType='admin') tienen acceso total automáticamente
 */
export function checkPermission(module: SystemModule, action: PermissionAction) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request.user as any);
      
      if (!user || !user.userId) {
        return reply.code(401).send({ error: 'No autenticado' });
      }

      // Los administradores tienen acceso total
      if (user.userType === 'admin') {
        return; // Continuar con la ejecución
      }

      // Obtener branchId de query params o body
      const branchId = (request.query as any).branchId || (request.body as any)?.branchId;

      if (!branchId) {
        return reply.code(400).send({ 
          error: 'Se requiere branchId para validar permisos',
          module,
          action 
        });
      }

      // Buscar el rol del usuario en esa filial
      const [userBranchRole] = await db
        .select()
        .from(userBranchRoles)
        .where(
          and(
            eq(userBranchRoles.userId, user.userId),
            eq(userBranchRoles.branchId, branchId)
          )
        )
        .limit(1);

      if (!userBranchRole) {
        return reply.code(403).send({ 
          error: 'No tienes acceso a esta filial',
          module,
          branchId 
        });
      }

      // Buscar los permisos del rol para este módulo
      const [permissions] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, userBranchRole.roleId),
            eq(rolePermissions.module, module)
          )
        )
        .limit(1);

      if (!permissions) {
        return reply.code(403).send({ 
          error: `No tienes permisos para acceder al módulo "${module}"`,
          module,
          action 
        });
      }

      // Verificar el permiso específico según la acción
      let hasPermission = false;

      switch (action) {
        case 'view':
          hasPermission = permissions.canView;
          break;
        case 'create':
          hasPermission = permissions.canCreate;
          break;
        case 'edit':
          hasPermission = permissions.canEdit;
          break;
        case 'delete':
          hasPermission = permissions.canDelete;
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return reply.code(403).send({ 
          error: `No tienes permiso para ${getActionLabel(action)} en el módulo "${module}"`,
          module,
          action,
          required: action 
        });
      }

      // Permiso concedido, continuar
      return;

    } catch (error: any) {
      console.error('Error en checkPermission:', error);
      return reply.code(500).send({ 
        error: 'Error al verificar permisos',
        details: error.message 
      });
    }
  };
}

/**
 * Helper: Obtener el label legible de una acción
 */
function getActionLabel(action: PermissionAction): string {
  const labels: Record<PermissionAction, string> = {
    view: 'ver',
    create: 'crear',
    edit: 'editar',
    delete: 'eliminar',
  };
  return labels[action] || action;
}

/**
 * Helper: Obtener los permisos de un usuario para una filial específica
 * Útil para el frontend y para cargar permisos en login
 */
export async function getUserBranchPermissions(userId: string, branchId: string) {
  try {
    // Buscar el rol del usuario en esa filial
    const [userBranchRole] = await db
      .select()
      .from(userBranchRoles)
      .where(
        and(
          eq(userBranchRoles.userId, userId),
          eq(userBranchRoles.branchId, branchId)
        )
      )
      .limit(1);

    if (!userBranchRole) {
      return null;
    }

    // Obtener todos los permisos del rol
    const permissions = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, userBranchRole.roleId));

    // Transformar a un objeto más fácil de usar
    const permissionsMap: Record<string, any> = {};

    permissions.forEach(perm => {
      permissionsMap[perm.module] = {
        canView: perm.canView,
        canCreate: perm.canCreate,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
      };
    });

    return {
      roleId: userBranchRole.roleId,
      permissions: permissionsMap,
    };

  } catch (error) {
    console.error('Error al obtener permisos:', error);
    return null;
  }
}

/**
 * Helper: Obtener todas las filiales y roles asignados a un usuario
 * Retorna un array con branches + roleId + permissions
 */
export async function getUserBranchesWithRoles(userId: string) {
  try {
    const result = await db
      .select({
        branchId: userBranchRoles.branchId,
        roleId: userBranchRoles.roleId,
        assignedAt: userBranchRoles.assignedAt,
      })
      .from(userBranchRoles)
      .where(eq(userBranchRoles.userId, userId));

    return result;

  } catch (error) {
    console.error('Error al obtener filiales del usuario:', error);
    return [];
  }
}
