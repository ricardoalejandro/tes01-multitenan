'use client';

import { Edit, History, RefreshCw, GraduationCap, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// ============= CARDS VIEW =============
export function StudentModuleCardsView({ students, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {students.map((student) => {
        const age = calculateAge(student.birthDate);
        
        return (
        <div
          key={student.id}
          className="bg-white border border-neutral-4 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-12 mb-1 truncate">
                {student.firstName} {student.paternalLastName} {student.maternalLastName || ''}
              </h3>
              <p className="text-sm text-neutral-10">DNI: {student.dni}</p>
            </div>
            <Badge variant={student.status === 'Alta' ? 'default' : 'secondary'}>
              {student.status}
            </Badge>
          </div>

          {/* Info */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-10">Género:</span>
              <span className="text-neutral-12">{student.gender}</span>
            </div>
            {age !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Cake className="h-3.5 w-3.5 text-neutral-10" />
                <span className="text-neutral-10">Edad:</span>
                <span className="text-neutral-12 font-medium">{age} años</span>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-10">Email:</span>
                <span className="text-neutral-12 truncate">{student.email}</span>
              </div>
            )}
            {student.phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-10">Teléfono:</span>
                <span className="text-neutral-12">{student.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-10">Admisión:</span>
              <span className="text-neutral-12">
                {new Date(student.admissionDate).toLocaleDateString('es-PE')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 pt-3 border-t border-neutral-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(student)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar información del probacionista</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChangeStatus(student)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambiar estado (Alta/Baja)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewTransactions(student)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver historial de movimientos</p>
                </TooltipContent>
              </Tooltip>

              {onCounseling && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCounseling(student)}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Asesoría Filosófica</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ============= COMPACT VIEW =============
export function StudentModuleCompactView({ students, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
  return (
    <div className="divide-y divide-neutral-4">
      {students.map((student) => {
        const age = calculateAge(student.birthDate);
        
        return (
        <div
          key={student.id}
          className="flex items-center gap-4 p-4 hover:bg-neutral-2 transition-colors"
        >
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-medium text-neutral-12 truncate">
                {student.firstName} {student.paternalLastName} {student.maternalLastName || ''}
              </h3>
              <Badge variant={student.status === 'Alta' ? 'default' : 'secondary'} className="shrink-0">
                {student.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-10">
              <span>DNI: {student.dni}</span>
              <span>{student.gender}</span>
              {age !== null && <span className="font-medium">{age} años</span>}
              {student.email && <span className="truncate">{student.email}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(student)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar información</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onChangeStatus(student)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambiar estado</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onViewTransactions(student)}>
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Historial</p>
                </TooltipContent>
              </Tooltip>

              {onCounseling && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onCounseling(student)}>
                      <GraduationCap className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Asesoría Filosófica</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ============= LIST VIEW (TABLE) =============
export function StudentModuleListView({ students, onEdit, onChangeStatus, onViewTransactions, onCounseling }: Props) {
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => onChangeStatus(student)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cambiar estado</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => onViewTransactions(student)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Historial</p>
                    </TooltipContent>
                  </Tooltip>

                  {onCounseling && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => onCounseling(student)}>
                          <GraduationCap className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Asesoría Filosófica</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
