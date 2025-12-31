'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { User, Mail, Phone, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Instructor {
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  gender: string;
  email: string | null;
  phone: string | null;
  hireDate: string;
  status: string;
  specialties?: Array<{ id: string; specialty: string }>;
}

interface ViewProps {
  instructors: Instructor[];
  onView?: (instructor: Instructor) => void;
  onEdit?: (instructor: Instructor) => void;
  onDelete?: (instructorId: string) => void;
}

// Vista de Tarjetas (Compacta - Inspirada en GroupCardsView)
export function InstructorCardsView({ instructors, onView, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
      {instructors.map((instructor) => (
        <div
          key={instructor.id}
          className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          {/* Header: Avatar y nombre */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-accent-3 rounded-full shrink-0">
              <User className="h-4 w-4 text-accent-9" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate" title={`${instructor.firstName} ${instructor.paternalLastName}`}>
                {instructor.firstName} {instructor.paternalLastName}
              </h3>
              <p className="text-xs text-gray-500">{instructor.dni}</p>
            </div>
            <Badge variant={instructor.status === 'Activo' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
              {instructor.status}
            </Badge>
          </div>

          {/* Contacto compacto */}
          <div className="space-y-1 text-xs text-gray-600 mb-2">
            {instructor.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{instructor.email}</span>
              </div>
            )}
            {instructor.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{instructor.phone}</span>
              </div>
            )}
          </div>

          {/* Footer: Especialidades y acciones */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {instructor.specialties && instructor.specialties.length > 0 ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {instructor.specialties.slice(0, 2).map((spec) => (
                  <Badge key={spec.id} variant="secondary" className="text-[10px] px-1.5 py-0 truncate max-w-[80px]">
                    {spec.specialty}
                  </Badge>
                ))}
                {instructor.specialties.length > 2 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{instructor.specialties.length - 2}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Sin especialidades</span>
            )}

            {/* Actions - Ver + Más */}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(instructor)}>
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
                  <DropdownMenuItem onClick={() => onEdit?.(instructor)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete?.(instructor.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista Compacta
export function InstructorCompactView({ instructors, onView, onEdit, onDelete }: ViewProps) {
  return (
    <div className="divide-y divide-gray-200">
      {instructors.map((instructor) => (
        <div
          key={instructor.id}
          className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="p-1.5 bg-accent-3 rounded-full shrink-0">
            <User className="h-4 w-4 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {instructor.firstName} {instructor.paternalLastName}
              </h4>
              <Badge variant={instructor.status === 'Activo' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {instructor.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{instructor.dni}</span>
              {instructor.email && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="truncate">{instructor.email}</span>
                </>
              )}
            </div>
          </div>
          {instructor.specialties && instructor.specialties.length > 0 && (
            <div className="text-xs text-gray-500 shrink-0">
              {instructor.specialties.length} esp.
            </div>
          )}

          {/* Actions - Ver + Más */}
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(instructor)}>
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
                <DropdownMenuItem onClick={() => onEdit?.(instructor)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete?.(instructor.id)} className="text-red-600">
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
export function InstructorListView({ instructors, onView, onEdit, onDelete }: ViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>DNI</TableHead>
          <TableHead>Nombre Completo</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Especialidades</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {instructors.map((instructor) => (
          <TableRow key={instructor.id} className="group">
            <TableCell className="font-medium">{instructor.dni}</TableCell>
            <TableCell>
              {instructor.firstName} {instructor.paternalLastName} {instructor.maternalLastName}
            </TableCell>
            <TableCell>
              <div className="text-sm space-y-0.5">
                {instructor.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{instructor.email}</div>}
                {instructor.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{instructor.phone}</div>}
              </div>
            </TableCell>
            <TableCell>
              {instructor.specialties?.length || 0} especialidad{(instructor.specialties?.length || 0) !== 1 ? 'es' : ''}
            </TableCell>
            <TableCell>
              <Badge variant={instructor.status === 'Activo' ? 'default' : 'secondary'}>
                {instructor.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(instructor)}>
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
                    <DropdownMenuItem onClick={() => onEdit?.(instructor)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete?.(instructor.id)} className="text-red-600">
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
