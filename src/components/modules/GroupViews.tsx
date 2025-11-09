import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Edit, UserPlus, GitMerge, History, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Group {
  id: string;
  name: string;
  description: string;
  status: string;
  branch_name: string;
  recurrence_start_date: string;
  recurrence_frequency: string;
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

// Vista de Tarjetas
export function GroupCardsView({ groups, onEdit, onViewStudents, onEnroll, onChangeStatus, onViewTransactions, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {groups.map((group) => (
        <div
          key={group.id}
          className="bg-white border border-neutral-4 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-accent-3 rounded-lg shrink-0">
                <Users className="h-5 w-5 text-accent-9" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-12 truncate">{group.name}</h3>
                {getStatusBadge(group.status)}
              </div>
            </div>
          </div>
          
          <p className="text-sm text-neutral-11 line-clamp-2 mb-3">{group.description || '-'}</p>
          
          <div className="space-y-2 text-xs text-neutral-10 mb-3">
            {group.recurrence_start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Inicio: {new Date(group.recurrence_start_date).toLocaleDateString('es-PE')}</span>
              </div>
            )}
            {group.recurrence_frequency && (
              <div className="flex items-center gap-2 capitalize">
                <span>Frecuencia: {group.recurrence_frequency}</span>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-neutral-4">
            <Button variant="ghost" size="sm" onClick={() => onEdit(group)} title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onViewStudents(group)} title="Ver estudiantes">
              <Users className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEnroll(group)} 
              title={group.status === 'active' ? "Inscribir estudiantes" : "Solo disponible para grupos activos"}
              disabled={group.status !== 'active'}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChangeStatus(group)} title="Cambiar estado">
              <GitMerge className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onViewTransactions(group)} title="Ver historial">
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(group.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
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
              {group.recurrence_start_date && (
                <span className="text-xs whitespace-nowrap">
                  {new Date(group.recurrence_start_date).toLocaleDateString('es-PE')}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(group)} title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onViewStudents(group)} title="Ver estudiantes">
              <Users className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEnroll(group)} 
              title={group.status === 'active' ? "Inscribir" : "Solo grupos activos"}
              disabled={group.status !== 'active'}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChangeStatus(group)} title="Cambiar estado">
              <GitMerge className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onViewTransactions(group)} title="Historial">
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(group.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
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
              {group.recurrence_start_date
                ? new Date(group.recurrence_start_date).toLocaleDateString('es-PE')
                : '-'}
            </TableCell>
            <TableCell>{getStatusBadge(group.status)}</TableCell>
            <TableCell className="capitalize">{group.recurrence_frequency || '-'}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(group)} title="Editar">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onViewStudents(group)} title="Ver estudiantes">
                  <Users className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEnroll(group)} 
                  title={group.status === 'active' ? "Inscribir estudiantes" : "Solo disponible para grupos activos"}
                  disabled={group.status !== 'active'}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onChangeStatus(group)} title="Cambiar estado">
                  <GitMerge className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onViewTransactions(group)} title="Ver historial">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(group.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
