'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Search, UserMinus, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onStudentRemoved?: () => void;
}

interface EnrolledStudent {
  id: string;
  studentId: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  gender: string;
  email: string | null;
  phone: string | null;
  enrollmentDate: string;
  status: string;
}

export function GroupStudentsDialog({ open, onClose, groupId, groupName, onStudentRemoved }: Props) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStudents();
      setSearch('');
      setDebouncedSearch('');
    }
  }, [open, groupId]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getGroupStudents(groupId);
      setStudents(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Error al cargar estudiantes', { duration: 1500 });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`¿Deseas desinscribir a ${studentName} de este grupo?`)) return;

    try {
      await api.unenrollStudent(groupId, studentId);
      toast.success('Estudiante desinscrito correctamente', { duration: 1500 });
      loadStudents();
      onStudentRemoved?.();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Error al desinscribir estudiante', { duration: 1500 });
    }
  };

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch.trim()) return students;
    
    const searchLower = debouncedSearch.toLowerCase();
    return students.filter((s) => {
      const fullName = `${s.firstName} ${s.paternalLastName} ${s.maternalLastName || ''}`.toLowerCase();
      return fullName.includes(searchLower) || s.dni.includes(searchLower);
    });
  }, [students, debouncedSearch]);

  const isSearching = search !== debouncedSearch;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onClose}
      title={`Estudiantes de ${groupName}`}
      description={`${students.length} estudiante${students.length !== 1 ? 's' : ''} inscrito${students.length !== 1 ? 's' : ''}`}
      defaultMaximized={false}
      footer={
        <Button onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-10" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Lista de estudiantes */}
        <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px]">
          {loading ? (
            <div className="text-center py-8 text-neutral-10">Cargando estudiantes...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-neutral-10">
              {search ? 'No se encontraron estudiantes' : 'No hay estudiantes inscritos en este grupo'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-3 md:p-4 bg-white border border-neutral-4 rounded-lg hover:border-accent-9 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-neutral-12 text-sm md:text-base">
                          {student.firstName} {student.paternalLastName} {student.maternalLastName}
                        </h4>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {student.status === 'active' ? 'Activo' : student.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs md:text-sm text-neutral-11">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium">DNI:</span>
                          <span>{student.dni}</span>
                          <span className="text-neutral-9 hidden sm:inline">•</span>
                          <span className="font-medium">Género:</span>
                          <span>{student.gender}</span>
                        </div>
                        
                        {student.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        )}
                        
                        {student.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-neutral-10 mt-1">
                          <span>Inscrito el {new Date(student.enrollmentDate).toLocaleDateString('es-PE')}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRemoveStudent(
                        student.studentId,
                        `${student.firstName} ${student.paternalLastName}`
                      )}
                      className="text-red-9 hover:text-red-10 hover:border-red-9 h-10 w-full md:w-auto shrink-0"
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Desinscribir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
