'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstructorCardsView, InstructorCompactView, InstructorListView } from './InstructorViews';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Instructor {
  id: string;
  documentType?: string;
  dni: string;
  gender: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  email: string | null;
  phone: string | null;
  birthDate?: string | null;
  hireDate: string;
  status: string;
  specialties?: Array<{ id: string; specialty: string }>;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = 'cards' | 'compact' | 'list';

export default function InstructorsModule({ branchId }: { branchId: string }) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [formData, setFormData] = useState({
    documentType: 'DNI',
    dni: '',
    gender: '',
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    email: '',
    phone: '',
    birthDate: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'Activo',
    specialties: ['']
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadInstructors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getInstructors(branchId, page, pageSize, debouncedSearch);

      if (response.data) {
        setInstructors(response.data);
      } else {
        setInstructors([]);
      }

      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      toast.error('Error al cargar instructores', { duration: 1500 });
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.gender) errors.gender = 'El género es obligatorio';
    if (!formData.documentType) errors.documentType = 'El tipo de documento es obligatorio';
    if (!formData.dni) errors.dni = 'El número de documento es obligatorio';
    if (!formData.firstName) errors.firstName = 'El nombre es obligatorio';
    if (!formData.paternalLastName) errors.paternalLastName = 'El apellido paterno es obligatorio';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }

    try {
      // Filtrar especialidades vacías y enviar como array de strings
      const specialtiesArray = formData.specialties.filter(s => s.trim());

      if (editingInstructor) {
        await api.updateInstructor(editingInstructor.id, { ...formData, branchId, specialties: specialtiesArray });
        toast.success('Instructor actualizado', { duration: 1500 });
      } else {
        await api.createInstructor({ ...formData, branchId, specialties: specialtiesArray });
        toast.success('Instructor creado', { duration: 1500 });
      }
      setIsDialogOpen(false);
      resetForm();
      loadInstructors();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al guardar';
      const errorType = error.response?.data?.type;

      // Si es una validación de negocio (409), mostrar como advertencia
      if (error.response?.status === 409 || errorType === 'validation') {
        toast.warning(errorMessage, { duration: 3000 });
      } else {
        toast.error(errorMessage, { duration: 2500 });
      }
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      documentType: instructor.documentType || 'DNI',
      dni: instructor.dni || '',
      gender: instructor.gender || '',
      firstName: instructor.firstName || '',
      paternalLastName: instructor.paternalLastName || '',
      maternalLastName: instructor.maternalLastName || '',
      email: instructor.email || '',
      phone: instructor.phone || '',
      birthDate: instructor.birthDate ? instructor.birthDate.split('T')[0] : '',
      hireDate: instructor.hireDate ? instructor.hireDate.split('T')[0] : new Date().toISOString().split('T')[0],
      status: instructor.status || 'Activo',
      specialties: (instructor.specialties && instructor.specialties.length > 0) ? instructor.specialties.map(s => s.specialty) : ['']
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este instructor definitivamente? Esta acción marcará el registro como eliminado y no se mostrará en el sistema.')) return;
    try {
      await api.deleteInstructor(id);
      toast.success('Instructor eliminado', { duration: 1500 });
      loadInstructors();
    } catch (error) {
      toast.error('Error al eliminar', { duration: 1500 });
    }
  };

  const resetForm = () => {
    setEditingInstructor(null);
    setFormData({
      documentType: 'DNI',
      dni: '',
      gender: '',
      firstName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
      birthDate: '',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'Activo',
      specialties: ['']
    });
    setFormErrors({});
  };

  const addSpecialty = () => {
    setFormData({ ...formData, specialties: [...formData.specialties, ''] });
  };

  const removeSpecialty = (index: number) => {
    setFormData({ ...formData, specialties: formData.specialties.filter((_, i) => i !== index) });
  };

  const updateSpecialty = (index: number, value: string) => {
    const newSpecialties = [...formData.specialties];
    newSpecialties[index] = value;
    setFormData({ ...formData, specialties: newSpecialties });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Activo': return 'success';
      case 'Inactivo': return 'danger';
      case 'Licencia': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* FAB - Floating Action Button for Mobile */}
      <button
        onClick={() => { resetForm(); setIsDialogOpen(true); }}
        className="fixed right-4 bottom-20 z-50 md:hidden bg-accent-9 hover:bg-accent-10 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nuevo Instructor"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none pb-4 md:pb-5 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Gestión de Instructores
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 hidden sm:block">Administra instructores y capacitaciones</p>
          </div>
          {/* Desktop button - hidden on mobile (using FAB instead) */}
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-accent-9 hover:bg-accent-10 text-white hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Instructor
          </Button>
        </div>

        <div className="flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar instructores..."
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
              <p className="text-gray-500 text-sm mt-3">Cargando instructores...</p>
            </div>
          ) : instructors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron instructores</div>
          ) : (
            <>
              {/* CONDITIONAL VIEW RENDERING */}
              {viewMode === 'cards' && (
                <InstructorCardsView
                  instructors={instructors}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'compact' && (
                <InstructorCompactView
                  instructors={instructors}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'list' && (
                <InstructorListView
                  instructors={instructors}
                  onView={handleEdit}
                  onEdit={handleEdit}
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

      {/* DIALOGS */}
      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`${editingInstructor ? 'Editar' : 'Nuevo'} Instructor`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Documento *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CNE">CNE</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número de Documento *</Label>
              <Input
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                required
                className={formErrors.dni ? 'border-red-500' : ''}
              />
              {formErrors.dni && <p className="text-xs text-red-500 mt-1">{formErrors.dni}</p>}
            </div>
            <div>
              <Label>Género *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => {
                  setFormData({ ...formData, gender: value });
                  if (formErrors.gender) setFormErrors({ ...formErrors, gender: '' });
                }}
                required
              >
                <SelectTrigger className={formErrors.gender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.gender && <p className="text-xs text-red-500 mt-1">{formErrors.gender}</p>}
            </div>
            <div>
              <Label>Nombres *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className={formErrors.firstName ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Apellido Paterno *</Label>
              <Input
                value={formData.paternalLastName}
                onChange={(e) => setFormData({ ...formData, paternalLastName: e.target.value })}
                required
                className={formErrors.paternalLastName ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Apellido Materno</Label>
              <Input value={formData.maternalLastName} onChange={(e) => setFormData({ ...formData, maternalLastName: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                  <SelectItem value="Licencia">Licencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Capacitado en</Label>
                <Button type="button" size="sm" variant="secondary" onClick={addSpecialty}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.specialties.map((specialty, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={specialty}
                      onChange={(e) => updateSpecialty(index, e.target.value)}
                      placeholder={`Capacitación ${index + 1}`}
                    />
                    {formData.specialties.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecialty(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
              {editingInstructor ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
