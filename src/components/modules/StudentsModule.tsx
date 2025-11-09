'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentModuleCardsView, StudentModuleCompactView, StudentModuleListView } from './StudentModuleViews';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { StudentStatusChangeDialog } from './StudentStatusChangeDialog';
import { StudentImportDialog } from './StudentImportDialog';
import { StudentTransactionsDialog } from './StudentTransactionsDialog';

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
  address?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  // Campos de student_branches (por filial)
  status: 'Alta' | 'Baja';
  admissionDate: string;
  createdAt?: string;
  updatedAt?: string;
}
interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = 'cards' | 'compact' | 'list';

export default function StudentsModule({ branchId }: { branchId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    documentType: 'DNI',
    dni: '',
    gender: 'Masculino',
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    province: '',
    district: '',
    birthDate: '',
    admissionDate: new Date().toISOString().split('T')[0],
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para los nuevos diálogos
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [existingStudentData, setExistingStudentData] = useState<any>(null);

  useEffect(() => {
    loadStudents();
  }, [branchId]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset a página 1 al buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadStudents();
  }, [page, pageSize, debouncedSearch]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.getStudents({
        branchId,
        page,
        limit: pageSize,
        search: debouncedSearch,
      });
      
      if (response.data) {
        setStudents(response.data);
      } else {
        setStudents([]);
      }
      
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      toast.error('Error al cargar probacionistas', { duration: 1500 });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDniInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 8);
    setFormData({ ...formData, dni: numericValue });
    
    if (formErrors.dni && numericValue.length === 8) {
      setFormErrors({ ...formErrors, dni: '' });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // DNI: debe ser exactamente 8 dígitos
    if (!/^\d{8}$/.test(formData.dni)) {
      errors.dni = 'El DNI debe tener exactamente 8 dígitos';
    }
    
    // Fechas: birthDate < admissionDate
    if (formData.birthDate && formData.admissionDate) {
      const birthDate = new Date(formData.birthDate);
      const admissionDate = new Date(formData.admissionDate);
      
      if (birthDate >= admissionDate) {
        errors.birthDate = 'La fecha de nacimiento debe ser anterior a la fecha de admisión';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores del formulario', { duration: 1500 });
      return;
    }
    
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          ...formData,
          branchId,
        });
        toast.success('Probacionista actualizado', { duration: 1500 });
      } else {
        await api.createStudent({
          ...formData,
          branchId,
        });
        toast.success('Probacionista creado', { duration: 1500 });
      }
      setIsDialogOpen(false);
      resetForm();
      loadStudents();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al guardar';
      const errorType = error.response?.data?.type;
      
      // Si es un estudiante duplicado (409), mostrar diálogo de importación
      if (error.response?.status === 409 && errorType === 'duplicate_student') {
        const existingData = error.response?.data?.student;
        setExistingStudentData(existingData);
        setIsDialogOpen(false); // Cerrar diálogo de creación
        setIsImportDialogOpen(true); // Abrir diálogo de importación
        return;
      }
      
      // Si es otra validación de negocio (409), mostrar como advertencia
      if (error.response?.status === 409 || errorType === 'validation') {
        toast.warning(errorMessage, { duration: 3000 });
      } else {
        toast.error(errorMessage, { duration: 2500 });
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      documentType: student.documentType || 'DNI',
      dni: student.dni || '',
      gender: student.gender || 'Masculino',
      firstName: student.firstName || '',
      paternalLastName: student.paternalLastName || '',
      maternalLastName: student.maternalLastName || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      department: student.department || '',
      province: student.province || '',
      district: student.district || '',
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      admissionDate: student.admissionDate
        ? student.admissionDate.split('T')[0]
        : new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      documentType: 'DNI',
      dni: '',
      gender: 'Masculino',
      firstName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
      address: '',
      department: '',
      province: '',
      district: '',
      birthDate: '',
      admissionDate: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none bg-neutral-2 pb-6 space-y-4">
        {/* Title and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-11">
              Probacionistas
            </h1>
            <p className="text-neutral-9 mt-1">
              Gestión completa de estudiantes
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-accent-9 hover:bg-accent-10 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Probacionista
          </Button>
        </div>

        {/* Search + View Selector */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
            <Input
              placeholder="Buscar por DNI, nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* VIEW MODE SELECTOR */}
          <div className="flex border border-neutral-4 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-x border-neutral-4 ${
                viewMode === 'compact' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Compacta
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SCROLLEABLE - Tabla con scroll independiente */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-4">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">
            No se encontraron probacionistas
          </div>
        ) : (
          <>
          {/* CONDITIONAL VIEW RENDERING */}
          {viewMode === 'cards' && (
            <StudentModuleCardsView 
              students={students}
              onEdit={handleEdit}
              onChangeStatus={(student) => {
                setSelectedStudentForAction(student);
                setIsStatusDialogOpen(true);
              }}
              onViewTransactions={(student) => {
                setSelectedStudentForAction(student);
                setIsTransactionsDialogOpen(true);
              }}
            />
          )}
          {viewMode === 'compact' && (
            <StudentModuleCompactView 
              students={students}
              onEdit={handleEdit}
              onChangeStatus={(student) => {
                setSelectedStudentForAction(student);
                setIsStatusDialogOpen(true);
              }}
              onViewTransactions={(student) => {
                setSelectedStudentForAction(student);
                setIsTransactionsDialogOpen(true);
              }}
            />
          )}
          {viewMode === 'list' && (
            <StudentModuleListView 
              students={students}
              onEdit={handleEdit}
              onChangeStatus={(student) => {
                setSelectedStudentForAction(student);
                setIsStatusDialogOpen(true);
              }}
              onViewTransactions={(student) => {
                setSelectedStudentForAction(student);
                setIsTransactionsDialogOpen(true);
              }}
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

      {/* Dialog */}
      <ResponsiveDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        title={`${editingStudent ? 'Editar' : 'Nuevo'} Probacionista`}
      >
          <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Document Type */}
                <div>
                  <Label>Tipo de Documento</Label>
                  <Select
                    value={formData.documentType}
                    onChange={(e) =>
                      setFormData({ ...formData, documentType: e.target.value })
                    }
                    required
                  >
                    <option value="DNI">DNI</option>
                    <option value="CNE">CNE</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </Select>
                </div>

                {/* DNI */}
                <div>
                  <Label>Número de Documento *</Label>
                  <Input
                    value={formData.dni}
                    onChange={(e) => handleDniInput(e.target.value)}
                    placeholder="12345678"
                    maxLength={8}
                    required
                    className={formErrors.dni ? 'border-red-500' : ''}
                  />
                  {formErrors.dni && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.dni}</p>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <Label>Nombres</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Paternal Last Name */}
                <div>
                  <Label>Apellido Paterno</Label>
                  <Input
                    value={formData.paternalLastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paternalLastName: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Maternal Last Name */}
                <div>
                  <Label>Apellido Materno</Label>
                  <Input
                    value={formData.maternalLastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maternalLastName: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <Label>Género</Label>
                  <Select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    required
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </Select>
                </div>

                {/* Email */}
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Dirección completa del probacionista"
                    rows={3}
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <Label>Fecha de Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => {
                      setFormData({ ...formData, birthDate: e.target.value });
                      if (formErrors.birthDate) {
                        setFormErrors({ ...formErrors, birthDate: '' });
                      }
                    }}
                    className={formErrors.birthDate ? 'border-red-500' : ''}
                  />
                  {formErrors.birthDate && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.birthDate}</p>
                  )}
                </div>

                {/* Admission Date */}
                <div>
                  <Label>Fecha de Admisión</Label>
                  <Input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) =>
                      setFormData({ ...formData, admissionDate: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Department */}
                <div>
                  <Label>Departamento</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="Ej: Lima"
                  />
                </div>

                {/* Province */}
                <div>
                  <Label>Provincia</Label>
                  <Input
                    value={formData.province}
                    onChange={(e) =>
                      setFormData({ ...formData, province: e.target.value })
                    }
                    placeholder="Ej: Lima"
                  />
                </div>

                {/* District */}
                <div>
                  <Label>Distrito</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    placeholder="Ej: San Miguel"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
                  {editingStudent ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
          </form>
      </ResponsiveDialog>

      {/* Status Change Dialog */}
      <StudentStatusChangeDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        student={selectedStudentForAction}
        branchId={branchId}
        onSuccess={loadStudents}
      />

      {/* Import Dialog */}
      <StudentImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        existingStudent={existingStudentData}
        currentBranchId={branchId}
        onSuccess={loadStudents}
      />

      {/* Transactions Dialog */}
      <StudentTransactionsDialog
        open={isTransactionsDialogOpen}
        onOpenChange={setIsTransactionsDialogOpen}
        student={selectedStudentForAction}
        branchId={branchId}
      />
    </div>
  );
}
