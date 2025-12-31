'use client';

import { Edit, History, RefreshCw, GraduationCap, User, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Student {
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  email: string | null;
  phone: string | null;
  gender: string;
  birthDate: string | null;
  documentType: string;
  status: 'Alta' | 'Baja';
  admissionDate: string;
}

interface Props {
  students: Student[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onChangeStatus: (student: Student) => void;
  onViewTransactions: (student: Student) => void;
  onCounseling?: (student: Student) => void;
}

// Helper para calcular edad
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  // Validar fecha
  if (isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  // Si aún no cumple años este año, restar 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

// ============= CARDS VIEW (COMPACTA - Inspirada en GroupCardsView) =============
export function StudentModuleCardsView({ students, onView, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
      {students.map((student) => {
        const age = calculateAge(student.birthDate);

        return (
          <div
            key={student.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* Header: Nombre y Estado */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm truncate flex-1" title={`${student.firstName} ${student.paternalLastName}`}>
                {student.firstName} {student.paternalLastName}
              </h3>
              <Badge variant={student.status === 'Alta' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                {student.status}
              </Badge>
            </div>

            {/* Info compacta en línea */}
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span title="DNI">{student.dni}</span>
              <span className="text-gray-300">•</span>
              <span>{student.gender === 'Masculino' ? 'M' : student.gender === 'Femenino' ? 'F' : 'O'}</span>
              {age !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium">{age} años</span>
                </>
              )}
            </div>

            {/* Contacto resumido */}
            {(student.email || student.phone) && (
              <div className="text-xs text-gray-500 mb-2 truncate" title={student.email || student.phone || ''}>
                {student.phone || student.email}
              </div>
            )}

            {/* Botones de Acción - Ver + Más */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(student)}>
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
                  <DropdownMenuItem onClick={() => onEdit(student)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeStatus(student)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cambiar Estado
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewTransactions(student)}>
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </DropdownMenuItem>
                  {onCounseling && (
                    <DropdownMenuItem onClick={() => onCounseling(student)}>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Asesoría
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============= COMPACT VIEW =============
export function StudentModuleCompactView({ students, onView, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
  return (
    <div className="divide-y divide-neutral-4">
      {students.map((student) => {
        const age = calculateAge(student.birthDate);

        return (
          <div
            key={student.id}
            className="flex items-center gap-3 p-3 hover:bg-neutral-2 transition-colors"
          >
            {/* Avatar */}
            <div className="p-2 bg-accent-3 rounded shrink-0">
              <User className="h-4 w-4 text-accent-9" />
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-neutral-12 text-sm truncate">
                  {student.firstName} {student.paternalLastName}
                </h3>
                <Badge variant={student.status === 'Alta' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                  {student.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-10">
                <span>{student.dni}</span>
                <span>{student.gender}</span>
                {age !== null && <span className="font-medium">{age} años</span>}
              </div>
            </div>

            {/* Actions - Ver + Más */}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(student)}>
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
                  <DropdownMenuItem onClick={() => onEdit(student)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeStatus(student)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cambiar Estado
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewTransactions(student)}>
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </DropdownMenuItem>
                  {onCounseling && (
                    <DropdownMenuItem onClick={() => onCounseling(student)}>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Asesoría
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============= LIST VIEW (TABLE) =============
export function StudentModuleListView({ students, onView, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>DNI</TableHead>
          <TableHead>Nombre Completo</TableHead>
          <TableHead>Edad</TableHead>
          <TableHead>Género</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha Admisión</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => {
          const age = calculateAge(student.birthDate);

          return (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.dni}</TableCell>
              <TableCell>
                {student.firstName} {student.paternalLastName} {student.maternalLastName || ''}
              </TableCell>
              <TableCell>
                {age !== null ? <span className="font-medium">{age} años</span> : <span className="text-neutral-10">-</span>}
              </TableCell>
              <TableCell>{student.gender}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {student.email && <div className="truncate max-w-[200px]">{student.email}</div>}
                  {student.phone && <div className="text-neutral-10">{student.phone}</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={student.status === 'Alta' ? 'default' : 'secondary'}>
                  {student.status}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(student.admissionDate).toLocaleDateString('es-PE')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(student)}>
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
                      <DropdownMenuItem onClick={() => onEdit(student)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeStatus(student)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Cambiar Estado
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onViewTransactions(student)}>
                        <History className="h-4 w-4 mr-2" />
                        Historial
                      </DropdownMenuItem>
                      {onCounseling && (
                        <DropdownMenuItem onClick={() => onCounseling(student)}>
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Asesoría
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
