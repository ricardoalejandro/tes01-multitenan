import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { studentTransfers, students, branches, studentBranches, groupEnrollments, classGroups, users, studentTransactions, roles, userBranchRoles } from '../db/schema';
import { eq, and, or, sql, desc, isNull, lt, ne } from 'drizzle-orm';
import { z } from 'zod';

// Schema para crear traslado
const createTransferSchema = z.object({
    studentId: z.string().uuid(),
    targetBranchId: z.string().uuid(),
    transferType: z.enum(['outgoing', 'incoming']),
    reason: z.string().optional(),
    notes: z.string().optional(),
});

// Helper function to check if user can manage transfers for a branch
async function canUserManageTransfers(userId: string | undefined, branchId: string | undefined, userType: string | undefined): Promise<boolean> {
    // Guard against undefined values
    if (!userId || !branchId) {
        console.error('canUserManageTransfers: userId or branchId is undefined', { userId, branchId, userType });
        return false;
    }

    // Admin users have all permissions
    if (userType === 'admin') return true;

    // Check user's role in this branch
    const userRole = await db
        .select({
            canManageTransfers: roles.canManageTransfers,
        })
        .from(userBranchRoles)
        .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
        .where(
            and(
                eq(userBranchRoles.userId, userId),
                eq(userBranchRoles.branchId, branchId)
            )
        )
        .limit(1);

    return userRole[0]?.canManageTransfers || false;
}

export const transferRoutes: FastifyPluginAsync = async (fastify) => {

    // GET /api/transfers - Listar traslados de una filial
    fastify.get('/', {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    branchId: { type: 'string' },
                    type: { type: 'string', enum: ['incoming', 'outgoing', 'all'] },
                    status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired', 'all'] },
                },
                required: ['branchId'],
            },
        },
    }, async (request, reply) => {
        try {
            const { branchId, type = 'all', status = 'all' } = request.query as any;

            let conditions = [];

            // Filtrar por tipo
            if (type === 'incoming') {
                conditions.push(eq(studentTransfers.targetBranchId, branchId));
            } else if (type === 'outgoing') {
                conditions.push(eq(studentTransfers.sourceBranchId, branchId));
            } else {
                conditions.push(
                    or(
                        eq(studentTransfers.sourceBranchId, branchId),
                        eq(studentTransfers.targetBranchId, branchId)
                    )
                );
            }

            // Filtrar por estado
            if (status !== 'all') {
                conditions.push(eq(studentTransfers.status, status as any));
            }

            const transfers = await db
                .select({
                    id: studentTransfers.id,
                    studentId: studentTransfers.studentId,
                    studentDni: students.dni,
                    studentName: sql<string>`concat(${students.firstName}, ' ', ${students.paternalLastName}, ' ', coalesce(${students.maternalLastName}, ''))`,
                    sourceBranchId: studentTransfers.sourceBranchId,
                    sourceBranchName: sql<string>`source_branch.name`,
                    targetBranchId: studentTransfers.targetBranchId,
                    targetBranchName: sql<string>`target_branch.name`,
                    status: studentTransfers.status,
                    transferType: studentTransfers.transferType,
                    reason: studentTransfers.reason,
                    notes: studentTransfers.notes,
                    rejectionReason: studentTransfers.rejectionReason,
                    expiresAt: studentTransfers.expiresAt,
                    createdAt: studentTransfers.createdAt,
                    createdByName: sql<string>`creator.full_name`,
                    processedByName: sql<string>`processor.full_name`,
                    processedAt: studentTransfers.processedAt,
                })
                .from(studentTransfers)
                .innerJoin(students, eq(studentTransfers.studentId, students.id))
                .innerJoin(
                    sql`${branches} as source_branch`,
                    sql`source_branch.id = ${studentTransfers.sourceBranchId}`
                )
                .innerJoin(
                    sql`${branches} as target_branch`,
                    sql`target_branch.id = ${studentTransfers.targetBranchId}`
                )
                .leftJoin(
                    sql`${users} as creator`,
                    sql`creator.id = ${studentTransfers.createdBy}`
                )
                .leftJoin(
                    sql`${users} as processor`,
                    sql`processor.id = ${studentTransfers.processedBy}`
                )
                .where(and(...conditions))
                .orderBy(desc(studentTransfers.createdAt));

            return { data: transfers };
        } catch (error) {
            console.error('Error loading transfers:', error);
            return reply.status(500).send({ error: 'Error al cargar traslados' });
        }
    });

    // POST /api/transfers - Crear nuevo traslado
    fastify.post('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const data = createTransferSchema.parse(request.body);
            const user = request.user as any;

            // For outgoing: check permission on source branch (determined after getting student)
            // For incoming: check permission on target branch (data.targetBranchId)

            // For incoming requests, verify permission immediately on target branch
            if (data.transferType === 'incoming') {
                const hasPermission = await canUserManageTransfers(user.id, data.targetBranchId, user.userType);
                if (!hasPermission) {
                    return reply.status(403).send({
                        error: 'No tienes permiso para gestionar traslados en esta filial',
                        type: 'permission_denied',
                    });
                }
            }

            // Determinar filial origen según el tipo
            // outgoing: mi filial envía -> sourceBranch = mi filial
            // incoming: solicito de otra filial -> sourceBranch = filial del estudiante
            let sourceBranchId: string;
            let targetBranchId: string;

            if (data.transferType === 'outgoing') {
                // Verificar que el estudiante está en mi filial
                const studentBranch = await db
                    .select()
                    .from(studentBranches)
                    .where(
                        and(
                            eq(studentBranches.studentId, data.studentId),
                            eq(studentBranches.status, 'Alta')
                        )
                    )
                    .limit(1);

                if (!studentBranch.length) {
                    return reply.status(400).send({ error: 'El estudiante no está activo en ninguna filial' });
                }

                sourceBranchId = studentBranch[0].branchId;
                targetBranchId = data.targetBranchId;

                if (sourceBranchId === targetBranchId) {
                    return reply.status(400).send({ error: 'La filial destino debe ser diferente a la origen' });
                }

                // For outgoing, verify permission on source branch
                const hasPermission = await canUserManageTransfers(user.id, sourceBranchId, user.userType);
                if (!hasPermission) {
                    return reply.status(403).send({
                        error: 'No tienes permiso para gestionar traslados en esta filial',
                        type: 'permission_denied',
                    });
                }
            } else {
                // incoming: solicito estudiante de otra filial
                const studentBranch = await db
                    .select()
                    .from(studentBranches)
                    .where(
                        and(
                            eq(studentBranches.studentId, data.studentId),
                            eq(studentBranches.status, 'Alta')
                        )
                    )
                    .limit(1);

                if (!studentBranch.length) {
                    return reply.status(400).send({ error: 'El estudiante no está activo en ninguna filial' });
                }

                sourceBranchId = studentBranch[0].branchId;
                targetBranchId = data.targetBranchId; // Mi filial (quien solicita)
            }

            // Verificar que no hay traslado pendiente para este estudiante
            const existingPending = await db
                .select()
                .from(studentTransfers)
                .where(
                    and(
                        eq(studentTransfers.studentId, data.studentId),
                        eq(studentTransfers.status, 'pending')
                    )
                )
                .limit(1);

            if (existingPending.length) {
                return reply.status(409).send({
                    error: 'Ya existe un traslado pendiente para este probacionista',
                    type: 'duplicate_transfer'
                });
            }

            // Calcular fecha de expiración (7 días)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const [newTransfer] = await db
                .insert(studentTransfers)
                .values({
                    studentId: data.studentId,
                    sourceBranchId,
                    targetBranchId,
                    transferType: data.transferType,
                    reason: data.reason,
                    notes: data.notes,
                    createdBy: user.id,
                    expiresAt,
                })
                .returning();

            return reply.status(201).send({ data: newTransfer });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return reply.status(400).send({ error: 'Datos inválidos', details: error.errors });
            }
            console.error('Error creating transfer:', error);
            return reply.status(500).send({ error: 'Error al crear traslado' });
        }
    });

    // PUT /api/transfers/:id/accept - Aceptar traslado
    fastify.put('/:id/accept', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user = request.user as any;

            // Obtener el traslado
            const [transfer] = await db
                .select()
                .from(studentTransfers)
                .where(eq(studentTransfers.id, id))
                .limit(1);

            if (!transfer) {
                return reply.status(404).send({ error: 'Traslado no encontrado' });
            }

            if (transfer.status !== 'pending') {
                return reply.status(400).send({ error: 'Solo se pueden aceptar traslados pendientes' });
            }

            // Permission check: User must have permission on SOURCE branch to accept
            // (The source branch is "giving away" the student, so they must approve)
            const hasPermission = await canUserManageTransfers(user.id, transfer.sourceBranchId, user.userType);
            if (!hasPermission) {
                return reply.status(403).send({
                    error: 'No tienes permiso para aceptar traslados en la filial de origen',
                    message: 'Debes tener el rol con permiso de gestión de traslados en la filial que envía al probacionista.',
                    type: 'permission_denied',
                });
            }

            // Verificar que no expiró
            if (new Date() > transfer.expiresAt) {
                await db
                    .update(studentTransfers)
                    .set({ status: 'expired', updatedAt: new Date() })
                    .where(eq(studentTransfers.id, id));
                return reply.status(400).send({ error: 'El traslado ha expirado' });
            }

            // Obtener grupos activos del estudiante en la filial origen
            const activeEnrollments = await db
                .select({
                    enrollmentId: groupEnrollments.id,
                    groupId: groupEnrollments.groupId,
                    groupName: classGroups.name,
                })
                .from(groupEnrollments)
                .innerJoin(classGroups, eq(groupEnrollments.groupId, classGroups.id))
                .where(
                    and(
                        eq(groupEnrollments.studentId, transfer.studentId),
                        eq(classGroups.branchId, transfer.sourceBranchId),
                        eq(groupEnrollments.status, 'Activo'),
                        eq(classGroups.status, 'active')
                    )
                );

            // Dar de baja al estudiante de la filial origen
            await db
                .update(studentBranches)
                .set({ status: 'Baja', updatedAt: new Date() })
                .where(
                    and(
                        eq(studentBranches.studentId, transfer.studentId),
                        eq(studentBranches.branchId, transfer.sourceBranchId)
                    )
                );

            // Obtener nombres de filiales para la transacción
            const [sourceBranch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, transfer.sourceBranchId)).limit(1);
            const [targetBranch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, transfer.targetBranchId)).limit(1);

            // Registrar transacción de BAJA en la filial origen
            await db.insert(studentTransactions).values({
                studentId: transfer.studentId,
                branchId: transfer.sourceBranchId,
                transactionType: 'Baja',
                description: 'Traslado a otra filial',
                observation: `Traslado aceptado hacia: ${targetBranch?.name || 'Filial destino'}`,
                userId: user.id,
                transactionDate: new Date(),
            });

            // Remover de grupos activos
            const removedGroupIds = activeEnrollments.map(e => e.groupId);
            if (removedGroupIds.length > 0) {
                await db
                    .update(groupEnrollments)
                    .set({ status: 'Baja', updatedAt: new Date() })
                    .where(
                        and(
                            eq(groupEnrollments.studentId, transfer.studentId),
                            sql`${groupEnrollments.groupId} = ANY(${removedGroupIds})`
                        )
                    );
            }

            // Verificar si ya existe registro en filial destino
            const existingDestBranch = await db
                .select()
                .from(studentBranches)
                .where(
                    and(
                        eq(studentBranches.studentId, transfer.studentId),
                        eq(studentBranches.branchId, transfer.targetBranchId)
                    )
                )
                .limit(1);

            if (existingDestBranch.length) {
                // Reactivar
                await db
                    .update(studentBranches)
                    .set({ status: 'Alta', updatedAt: new Date() })
                    .where(
                        and(
                            eq(studentBranches.studentId, transfer.studentId),
                            eq(studentBranches.branchId, transfer.targetBranchId)
                        )
                    );
            } else {
                // Crear nuevo registro
                await db
                    .insert(studentBranches)
                    .values({
                        studentId: transfer.studentId,
                        branchId: transfer.targetBranchId,
                        status: 'Alta',
                        admissionDate: new Date().toISOString().split('T')[0],
                    });
            }

            // Registrar transacción de ALTA en la filial destino
            await db.insert(studentTransactions).values({
                studentId: transfer.studentId,
                branchId: transfer.targetBranchId,
                transactionType: 'Alta',
                description: 'Traslado desde otra filial',
                observation: `Procedente de: ${sourceBranch?.name || 'Filial origen'}`,
                userId: user.id,
                transactionDate: new Date(),
            });

            // Actualizar el traslado
            const [updatedTransfer] = await db
                .update(studentTransfers)
                .set({
                    status: 'accepted',
                    processedBy: user.id,
                    processedAt: new Date(),
                    removedFromGroups: JSON.stringify(removedGroupIds),
                    updatedAt: new Date(),
                })
                .where(eq(studentTransfers.id, id))
                .returning();

            return {
                data: updatedTransfer,
                removedGroups: activeEnrollments.map(e => ({ id: e.groupId, name: e.groupName }))
            };
        } catch (error) {
            console.error('Error accepting transfer:', error);
            return reply.status(500).send({ error: 'Error al aceptar traslado' });
        }
    });

    // PUT /api/transfers/:id/reject - Rechazar traslado
    fastify.put('/:id/reject', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const { reason } = request.body as { reason?: string };
            const user = request.user as any;

            const [transfer] = await db
                .select()
                .from(studentTransfers)
                .where(eq(studentTransfers.id, id))
                .limit(1);

            if (!transfer) {
                return reply.status(404).send({ error: 'Traslado no encontrado' });
            }

            if (transfer.status !== 'pending') {
                return reply.status(400).send({ error: 'Solo se pueden rechazar traslados pendientes' });
            }

            // Permission check: User must have permission on SOURCE branch to reject
            const hasPermission = await canUserManageTransfers(user.id, transfer.sourceBranchId, user.userType);
            if (!hasPermission) {
                return reply.status(403).send({
                    error: 'No tienes permiso para rechazar traslados en la filial de origen',
                    type: 'permission_denied',
                });
            }

            const [updatedTransfer] = await db
                .update(studentTransfers)
                .set({
                    status: 'rejected',
                    processedBy: user.id,
                    processedAt: new Date(),
                    rejectionReason: reason,
                    updatedAt: new Date(),
                })
                .where(eq(studentTransfers.id, id))
                .returning();

            return { data: updatedTransfer };
        } catch (error) {
            console.error('Error rejecting transfer:', error);
            return reply.status(500).send({ error: 'Error al rechazar traslado' });
        }
    });

    // PUT /api/transfers/:id/cancel - Cancelar traslado (solo quien lo creó)
    fastify.put('/:id/cancel', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user = request.user as any;

            const [transfer] = await db
                .select()
                .from(studentTransfers)
                .where(eq(studentTransfers.id, id))
                .limit(1);

            if (!transfer) {
                return reply.status(404).send({ error: 'Traslado no encontrado' });
            }

            if (transfer.status !== 'pending') {
                return reply.status(400).send({ error: 'Solo se pueden cancelar traslados pendientes' });
            }

            const [updatedTransfer] = await db
                .update(studentTransfers)
                .set({
                    status: 'cancelled',
                    processedBy: user.id,
                    processedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(studentTransfers.id, id))
                .returning();

            return { data: updatedTransfer };
        } catch (error) {
            console.error('Error cancelling transfer:', error);
            return reply.status(500).send({ error: 'Error al cancelar traslado' });
        }
    });

    // GET /api/transfers/search-student - Buscar estudiante globalmente por nombre o DNI
    fastify.get('/search-student', {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    dni: { type: 'string' },  // Keep 'dni' for backward compatibility
                    excludeBranchId: { type: 'string' },
                },
                required: ['dni'],
            },
        },
    }, async (request, reply) => {
        try {
            const { dni: searchTerm, excludeBranchId } = request.query as any;

            if (!searchTerm || searchTerm.length < 3) {
                return { data: [] };
            }

            const searchPattern = `%${searchTerm.toLowerCase()}%`;

            const results = await db
                .select({
                    studentId: students.id,
                    dni: students.dni,
                    firstName: students.firstName,
                    paternalLastName: students.paternalLastName,
                    maternalLastName: students.maternalLastName,
                    branchId: studentBranches.branchId,
                    branchName: branches.name,
                    branchCode: branches.code,
                    status: studentBranches.status,
                })
                .from(students)
                .innerJoin(studentBranches, eq(students.id, studentBranches.studentId))
                .innerJoin(branches, eq(studentBranches.branchId, branches.id))
                .where(
                    and(
                        // Search by DNI OR name (firstName, paternalLastName, maternalLastName)
                        or(
                            sql`LOWER(${students.dni}) LIKE ${searchPattern}`,
                            sql`LOWER(${students.firstName}) LIKE ${searchPattern}`,
                            sql`LOWER(${students.paternalLastName}) LIKE ${searchPattern}`,
                            sql`LOWER(${students.maternalLastName}) LIKE ${searchPattern}`
                        ),
                        eq(studentBranches.status, 'Alta'),
                        excludeBranchId ? ne(studentBranches.branchId, excludeBranchId) : undefined
                    )
                )
                .limit(10);

            return { data: results };
        } catch (error) {
            console.error('Error searching student:', error);
            return reply.status(500).send({ error: 'Error al buscar estudiante' });
        }
    });

    // POST /api/transfers/expire - Expirar traslados vencidos (para cron job)
    fastify.post('/expire', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const result = await db
                .update(studentTransfers)
                .set({
                    status: 'expired',
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(studentTransfers.status, 'pending'),
                        lt(studentTransfers.expiresAt, new Date())
                    )
                )
                .returning();

            return { expired: result.length };
        } catch (error) {
            console.error('Error expiring transfers:', error);
            return reply.status(500).send({ error: 'Error al expirar traslados' });
        }
    });
};
