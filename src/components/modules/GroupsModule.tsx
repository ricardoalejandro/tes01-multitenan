'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, UserPlus, GitMerge, History, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupCardsView, GroupCompactView, GroupListView } from './GroupViews';
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
import { GroupStudentsDialog } from './GroupStudentsDialog';

interface Group {
  id: string;
  name: string;
  description: string;
  status: string;
  branchId: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  frequency: string;
  recurrenceFrequency: string;
  recurrenceInterval: number;
  maxOccurrences: number | null;
  // Estadísticas
  enrolledCount?: number;
  totalSessions?: number;
  completedSessions?: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = 'cards' | 'compact' | 'list';

export default function GroupsModule({ branchId }: { branchId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Diálogos
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getGroups(branchId, page, pageSize, debouncedSearch);
      setGroups(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('Error al cargar grupos', { duration: 1500 });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setIsFormOpen(true);
  };

  const handleEnroll = (group: Group) => {
    setSelectedGroup(group);
    setIsEnrollOpen(true);
  };

  const handleViewStudents = (group: Group) => {
    setSelectedGroup(group);
    setIsStudentsOpen(true);
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
      await api.changeGroupStatus(id, { status: 'eliminado', observation: 'Eliminado desde lista de grupos' });
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
    <div className="h-full flex flex-col relative">
      {/* FAB - Floating Action Button for Mobile */}
      <button
        onClick={() => { setSelectedGroup(null); setIsFormOpen(true); }}
        className="fixed right-4 bottom-20 z-50 md:hidden bg-accent-9 hover:bg-accent-10 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nuevo Grupo"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none pb-4 md:pb-5 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Gestión de Grupos
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 hidden sm:block">Administra grupos de estudio</p>
          </div>
          {/* Desktop button - hidden on mobile (using FAB instead) */}
          <Button
            onClick={() => { setSelectedGroup(null); setIsFormOpen(true); }}
            className="bg-accent-9 hover:bg-accent-10 text-white hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Grupo
          </Button>
        </div>

        <div className="flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 h-10"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* VIEW MODE SELECTOR - Hidden on mobile */}
          <div className="hidden md:flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'cards'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-x border-gray-200 ${viewMode === 'compact'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Compacta
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO CON SCROLL */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-3">Cargando grupos...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron grupos</div>
          ) : (
            <>
              {/* CONDITIONAL VIEW RENDERING */}
              {viewMode === 'cards' && (
                <GroupCardsView
                  groups={groups}
                  onEdit={handleEdit}
                  onViewStudents={handleViewStudents}
                  onEnroll={handleEnroll}
                  onChangeStatus={handleChangeStatus}
                  onViewTransactions={handleViewTransactions}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'compact' && (
                <GroupCompactView
                  groups={groups}
                  onEdit={handleEdit}
                  onViewStudents={handleViewStudents}
                  onEnroll={handleEnroll}
                  onChangeStatus={handleChangeStatus}
                  onViewTransactions={handleViewTransactions}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'list' && (
                <GroupListView
                  groups={groups}
                  onEdit={handleEdit}
                  onViewStudents={handleViewStudents}
                  onEnroll={handleEnroll}
                  onChangeStatus={handleChangeStatus}
                  onViewTransactions={handleViewTransactions}
                  onDelete={handleDelete}
                />
              )}
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
        branchId={branchId}
        onEnrolled={() => {
          loadGroups();
          toast.success('Estudiantes inscritos correctamente', { duration: 1500 });
        }}
      />

      <GroupStudentsDialog
        open={isStudentsOpen}
        onClose={() => setIsStudentsOpen(false)}
        groupId={selectedGroup?.id || ''}
        groupName={selectedGroup?.name || ''}
        onStudentRemoved={() => {
          loadGroups();
        }}
      />

      <GroupStatusChangeDialog
        open={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        group={selectedGroup}
        branchId={branchId}
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
