import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { User, Mail, Phone, Calendar } from 'lucide-react';

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
  onEdit?: (instructor: Instructor) => void;
  onDelete?: (instructorId: string) => void;
}

// Vista de Tarjetas
export function InstructorCardsView({ instructors, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {instructors.map((instructor) => (
        <div
          key={instructor.id}
          className="bg-white border border-neutral-4 rounded-lg p-4 hover:border-accent-9 transition-colors cursor-pointer"
          onClick={() => onEdit?.(instructor)}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-accent-3 rounded-full">
              <User className="h-5 w-5 text-accent-9" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-12 truncate">
                {instructor.firstName} {instructor.paternalLastName}
              </h3>
              <p className="text-sm text-neutral-11">{instructor.dni}</p>
            </div>
            <Badge variant={instructor.status === 'Activo' ? 'default' : 'secondary'}>
              {instructor.status}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {instructor.email && (
              <div className="flex items-center gap-2 text-sm text-neutral-11">
                <Mail className="h-3 w-3" />
                <span className="truncate">{instructor.email}</span>
              </div>
            )}
            {instructor.phone && (
              <div className="flex items-center gap-2 text-sm text-neutral-11">
                <Phone className="h-3 w-3" />
                <span>{instructor.phone}</span>
              </div>
            )}
            {instructor.specialties && instructor.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {instructor.specialties.slice(0, 2).map((spec) => (
                  <Badge key={spec.id} variant="secondary" className="text-xs">
                    {spec.specialty}
                  </Badge>
                ))}
                {instructor.specialties.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{instructor.specialties.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista Compacta
export function InstructorCompactView({ instructors, onEdit, onDelete }: ViewProps) {
  return (
    <div className="space-y-2 p-4">
      {instructors.map((instructor) => (
        <div
          key={instructor.id}
          className="flex items-center gap-3 p-3 bg-white border border-neutral-4 rounded-lg hover:border-accent-9 transition-colors cursor-pointer"
          onClick={() => onEdit?.(instructor)}
        >
          <div className="p-2 bg-accent-3 rounded-full">
            <User className="h-4 w-4 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-neutral-12 truncate">
                {instructor.firstName} {instructor.paternalLastName}
              </h4>
              <Badge variant={instructor.status === 'Activo' ? 'default' : 'secondary'} className="text-xs">
                {instructor.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-11">
              <span>{instructor.dni}</span>
              {instructor.email && (
                <>
                  <span className="text-neutral-9">•</span>
                  <span className="truncate">{instructor.email}</span>
                </>
              )}
            </div>
          </div>
          {instructor.specialties && instructor.specialties.length > 0 && (
            <div className="text-xs text-neutral-10">
              {instructor.specialties.length} especialidad{instructor.specialties.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Vista de Lista (Tabla) - Usando componente Table de Shadcn para consistencia con Probacionistas
export function InstructorListView({ instructors, onEdit, onDelete }: ViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>DNI</TableHead>
          <TableHead>Nombre Completo</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Especialidades</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {instructors.map((instructor) => (
          <TableRow
            key={instructor.id}
            className="cursor-pointer"
            onClick={() => onEdit?.(instructor)}
          >
            <TableCell className="font-medium">{instructor.dni}</TableCell>
            <TableCell>
              {instructor.firstName} {instructor.paternalLastName} {instructor.maternalLastName}
            </TableCell>
            <TableCell>
              <div className="text-sm space-y-1">
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
