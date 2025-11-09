'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserPlus, GitMerge, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { GroupFormDialog } from './GroupFormDialog';
import { GroupEnrollmentDialog } from './GroupEnrollmentDialog';
import { GroupStatusChangeDialog } from './GroupStatusChangeDialog';
import { GroupTransactionsDialog } from './GroupTransactionsDialog';

interface Group {
  id: string;
  name: string;
  description: string;
  status: string;
  branch_name: string;
  recurrence_start_date: string;
  recurrence_frequency: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function GroupsModule({ branchId }: { branchId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Diálogos
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadGroups();
  }, [branchId]);

  useEffect(() => {
    loadGroups();
  }, [page, pageSize, search]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await api.getGroups(page, pageSize, search);
      setGroups(response.groups || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('Error al cargar grupos', { duration: 1500 });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setIsFormOpen(true);
  };

  const handleEnroll = (group: Group) => {
    setSelectedGroup(group);
    setIsEnrollOpen(true);
  };

  const handleChangeStatus = (group: Group) => {
    setSelectedGroup(group);
    setIsStatusOpen(true);
  };

  const handleViewTransactions = (group: Group) => {
    setSelectedGroup(group);
    setIsTransactionsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Cambiar estado a "Eliminado"? Esta acción se puede revertir desde el cambio de estado.')) return;
    try {
      await api.changeGroupStatus(id, { newStatus: 'eliminado' });
      toast.success('Grupo eliminado', { duration: 1500 });
      loadGroups();
    } catch (error) {
      toast.error('Error al eliminar', { duration: 1500 });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { label: 'Activo', variant: 'success' },
      closed: { label: 'Cerrado', variant: 'warning' },
      finished: { label: 'Finalizado', variant: 'default' },
      eliminado: { label: 'Eliminado', variant: 'destructive' },
      merged: { label: 'Fusionado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-11">
            Grupos
          </h1>
          <p className="text-neutral-9 mt-1">Gestión de grupos de estudio</p>
        </div>
        <Button
          onClick={() => { setSelectedGroup(null); setIsFormOpen(true); }}
          className="bg-accent-9 hover:bg-accent-10 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
        <Input
          placeholder="Buscar grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-4">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">No se encontraron grupos</div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recurrencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="max-w-md truncate">{group.description || '-'}</TableCell>
                  <TableCell>
                    {group.recurrence_start_date
                      ? new Date(group.recurrence_start_date).toLocaleDateString('es-PE')
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(group.status)}</TableCell>
                  <TableCell className="capitalize">{group.recurrence_frequency || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnroll(group)}
                        title="Inscribir estudiantes"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeStatus(group)}
                        title="Cambiar estado"
                      >
                        <GitMerge className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTransactions(group)}
                        title="Ver historial"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </div>

      {/* Diálogos */}
      <GroupFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        branchId={branchId}
        group={selectedGroup}
        onSaved={() => {
          loadGroups();
          toast.success(selectedGroup ? 'Grupo actualizado' : 'Grupo creado', { duration: 1500 });
        }}
      />

      <GroupEnrollmentDialog
        open={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        groupId={selectedGroup?.id || ''}
        onEnrolled={() => {
          loadGroups();
          toast.success('Estudiantes inscritos correctamente', { duration: 1500 });
        }}
      />

      <GroupStatusChangeDialog
        open={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        group={selectedGroup}
        onStatusChanged={() => {
          loadGroups();
          toast.success('Estado actualizado correctamente', { duration: 1500 });
        }}
      />

      <GroupTransactionsDialog
        open={isTransactionsOpen}
        onClose={() => setIsTransactionsOpen(false)}
        groupId={selectedGroup?.id || null}
        groupName={selectedGroup?.name || ''}
      />
    </div>
  );
}
