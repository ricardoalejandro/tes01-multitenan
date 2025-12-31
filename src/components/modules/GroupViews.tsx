'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Edit, UserPlus, GitMerge, History, Trash2, Clock, Eye, MoreVertical } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ViewProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onViewStudents: (group: Group) => void;
  onEnroll: (group: Group) => void;
  onChangeStatus: (group: Group) => void;
  onViewTransactions: (group: Group) => void;
  onDelete: (groupId: string) => void;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger', label: string }> = {
    'active': { variant: 'success', label: 'Activo' },
    'planning': { variant: 'warning', label: 'Planificación' },
    'completed': { variant: 'secondary', label: 'Completado' },
    'cancelled': { variant: 'danger', label: 'Cancelado' },
  };
  const config = statusMap[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Vista de Tarjetas (Compacta)
export function GroupCardsView({ groups, onEdit, onViewStudents, onEnroll, onChangeStatus, onViewTransactions, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
      {groups.map((group) => {
        const progress = group.totalSessions && group.totalSessions > 0
          ? Math.round((group.completedSessions || 0) / group.totalSessions * 100)
          : 0;

        return (
          <div
            key={group.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* Header con nombre y estado */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm truncate flex-1" title={group.name}>{group.name}</h3>
              {getStatusBadge(group.status)}
            </div>

            {/* Stats en línea */}
            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
              <span className="flex items-center gap-1" title="Inscritos">
                <Users className="h-3 w-3" />
                {group.enrolledCount || 0}
              </span>
              <span className="flex items-center gap-1" title="Sesiones dictadas/total">
                <Calendar className="h-3 w-3" />
                {group.completedSessions || 0}/{group.totalSessions || 0}
              </span>
              {(group.startTime) && (
                <span className="flex items-center gap-1" title="Horario">
                  <Clock className="h-3 w-3" />
                  {group.startTime?.slice(0, 5)}
                </span>
              )}
            </div>

            {/* Barra de progreso compacta */}
            {(group.totalSessions || 0) > 0 && (
              <div className="mb-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' :
                        progress >= 75 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 text-right mt-0.5">{progress}%</div>
              </div>
            )}

            {/* Acciones - Ver + Más */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onViewStudents(group)}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                Ver
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(group)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEnroll(group)}
                    disabled={group.status !== 'active'}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inscribir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onChangeStatus(group)}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Cambiar Estado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewTransactions(group)}>
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(group.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Vista Compacta
export function GroupCompactView({ groups, onEdit, onViewStudents, onEnroll, onChangeStatus, onViewTransactions, onDelete }: ViewProps) {
  return (
    <div className="divide-y divide-neutral-4">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex items-center gap-3 p-4 hover:bg-neutral-2 transition-colors"
        >
          <div className="p-2 bg-accent-3 rounded shrink-0">
            <Users className="h-4 w-4 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-neutral-12 truncate">{group.name}</h4>
              {getStatusBadge(group.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-10">
              <span className="truncate">{group.description || '-'}</span>
              {group.startDate && (
                <span className="text-xs whitespace-nowrap">
                  {new Date(group.startDate).toLocaleDateString('es-PE')}
                </span>
              )}
            </div>
          </div>

          {/* Acciones - Ver + Más */}
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onViewStudents(group)}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              Ver
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(group)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEnroll(group)}
                  disabled={group.status !== 'active'}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Inscribir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onChangeStatus(group)}>
                  <GitMerge className="h-4 w-4 mr-2" />
                  Cambiar Estado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewTransactions(group)}>
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(group.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista de Lista (Tabla)
export function GroupListView({ groups, onEdit, onViewStudents, onEnroll, onChangeStatus, onViewTransactions, onDelete }: ViewProps) {
  return (
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
              {group.startDate
                ? new Date(group.startDate).toLocaleDateString('es-PE')
                : '-'}
            </TableCell>
            <TableCell>{getStatusBadge(group.status)}</TableCell>
            <TableCell className="capitalize">{group.frequency || '-'}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onViewStudents(group)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(group)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEnroll(group)}
                      disabled={group.status !== 'active'}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Inscribir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onChangeStatus(group)}>
                      <GitMerge className="h-4 w-4 mr-2" />
                      Cambiar Estado
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewTransactions(group)}>
                      <History className="h-4 w-4 mr-2" />
                      Historial
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(group.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
