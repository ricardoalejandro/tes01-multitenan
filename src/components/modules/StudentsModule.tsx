'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { Plus, Search, Edit, History, RefreshCw, GraduationCap, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentModuleCardsView, StudentModuleCompactView, StudentModuleListView } from './StudentModuleViews';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { CounselingFormDialog } from './CounselingFormDialog';

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

interface GroupForFilter {
  id: string;
  name: string;
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

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [availableGroups, setAvailableGroups] = useState<GroupForFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle

  const [formData, setFormData] = useState({
    documentType: 'DNI',
    dni: '',
    gender: '',
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
    admissionType: 'Nuevo', // Nuevo, Recuperado, Traslado
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para Ubigeo (Cascading Selects)
  const [departments, setDepartments] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedProvId, setSelectedProvId] = useState<string>('');
  const [selectedDistId, setSelectedDistId] = useState<string>('');

  // Cargar departamentos al inicio
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.getDepartments();
        setDepartments(res.data || []);
      } catch (error) {
        console.error('Error loading departments', error);
      }
    };
    loadDepartments();
  }, []);

  // Estados para los nuevos diálogos
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);
  const [isCounselingDialogOpen, setIsCounselingDialogOpen] = useState(false);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [existingStudentData, setExistingStudentData] = useState<any>(null);



  // Pre-cargar ubicaciones al editar
  useEffect(() => {
    if (isDialogOpen && editingStudent && departments.length > 0) {
      const initLocation = async () => {
        // 1. Match Department
        const deptName = editingStudent.department;
        const dept = departments.find(d => d.name === deptName);
        if (dept) {
          setSelectedDeptId(dept.id);

          // 2. Load Provinces
          try {
            const provRes = await api.getProvinces(dept.id);
            const provList = provRes.data || [];
            setProvinces(provList);

            // 3. Match Province
            const provName = editingStudent.province;
            const prov = provList.find((p: any) => p.name === provName);

            if (prov) {
              setSelectedProvId(prov.id);

              // 4. Load Districts
              const distRes = await api.getDistricts(prov.id);
              const distList = distRes.data || [];
              setDistricts(distList);

              // 5. Match District
              const distName = editingStudent.district;
              const dist = distList.find((d: any) => d.name === distName);
              if (dist) {
                setSelectedDistId(dist.id);
              }
            }
          } catch (e) {
            console.error('Error loading location cascade', e);
          }
        }
      };
      initLocation();
    } else if (isDialogOpen && !editingStudent) {
      // Reset for new student
      setSelectedDeptId('');
      setSelectedProvId('');
      setSelectedDistId('');
      setProvinces([]);
      setDistricts([]);
    }
  }, [isDialogOpen, editingStudent, departments]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getStudents({
        branchId,
        page,
        limit: pageSize,
        search: debouncedSearch,
        status: statusFilter,
        groupId: groupFilter,
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
  }, [branchId, page, pageSize, debouncedSearch, statusFilter, groupFilter]);

  // Cargar grupos activos para el filtro
  const loadGroups = useCallback(async () => {
    try {
      const response = await api.getGroups(branchId);
      // Solo grupos activos
      const activeGroups = (response.data || [])
        .filter((g: any) => g.status === 'active')
        .map((g: any) => ({ id: g.id, name: g.name }));
      setAvailableGroups(activeGroups);
    } catch (error) {
      console.error('Error loading groups for filter:', error);
    }
  }, [branchId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

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
  }, [loadStudents]);

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

    // Gender validation
    if (!formData.gender) {
      errors.gender = 'Debe seleccionar un género';
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

      // If student is active in another branch, show message to use transfers
      if (error.response?.status === 409 && errorType === 'active_in_other_branch') {
        const activeBranchName = error.response?.data?.activeBranchName || 'otra filial';
        toast.error(
          `Este probacionista ya está de Alta en ${activeBranchName}. Para moverlo a tu filial, solicita un traslado desde el módulo de Traslados.`,
          { duration: 6000 }
        );
        return;
      }

      // Si es un estudiante duplicado (409) pero NO activo, mostrar diálogo de importación
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
      gender: student.gender || '',
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
      admissionType: 'Nuevo',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      documentType: 'DNI',
      dni: '',
      gender: '',
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
      admissionType: 'Nuevo',
    });
    setFormErrors({});
  };

  // Handlers para Ubicaciones
  const handleDepartmentChange = async (value: string) => {
    setSelectedDeptId(value);
    const dept = departments.find(d => d.id === value);
    setFormData(prev => ({ ...prev, department: dept?.name || '', province: '', district: '' }));

    // Reset downward
    setSelectedProvId('');
    setSelectedDistId('');
    setProvinces([]);
    setDistricts([]);

    try {
      const res = await api.getProvinces(value);
      setProvinces(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProvinceChange = async (value: string) => {
    setSelectedProvId(value);
    const prov = provinces.find(p => p.id === value);
    setFormData(prev => ({ ...prev, province: prov?.name || '', district: '' }));

    // Reset downward
    setSelectedDistId('');
    setDistricts([]);

    try {
      const res = await api.getDistricts(value);
      setDistricts(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistId(value);
    const dist = districts.find(d => d.id === value);
    setFormData(prev => ({ ...prev, district: dist?.name || '' }));
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* FAB - Floating Action Button for Mobile */}
      <button
        onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}
        className="fixed right-4 bottom-20 z-50 md:hidden bg-accent-9 hover:bg-accent-10 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nuevo Probacionista"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none pb-4 md:pb-5 space-y-3 md:space-y-4">
        {/* Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Gestión de Probacionistas
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 hidden sm:block">
              Busca probacionistas por nombre, apellido, DNI o email
            </p>
          </div>
          {/* Desktop button - hidden on mobile (using FAB instead) */}
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-accent-9 hover:bg-accent-10 text-white hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Probacionista
          </Button>
        </div>

        {/* Search + Filters Row */}
        <div className="space-y-3">
          {/* Search Bar - Full width on mobile */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar probacionistas..."
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
            {/* Filter toggle button - visible on mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`md:hidden h-10 w-10 ${showFilters ? 'bg-accent-2 border-accent-9' : ''}`}
            >
              <Filter className={`h-4 w-4 ${showFilters ? 'text-accent-9' : ''}`} />
            </Button>
          </div>

          {/* Filters - Collapsible on mobile, always visible on desktop */}
          <div className={`flex flex-wrap gap-2 md:gap-3 ${showFilters ? 'flex' : 'hidden md:flex'}`}>
            {/* Filtro de Estado */}
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[130px] bg-white border-gray-200 h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Grupo */}
            <Select value={groupFilter} onValueChange={(val) => { setGroupFilter(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-gray-200 h-10">
                <SelectValue placeholder="Grupo activo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {availableGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Limpiar filtros */}
            {(statusFilter || groupFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter(''); setGroupFilter(''); setPage(1); }}
                className="text-gray-500 hover:text-gray-700 h-10"
              >
                Limpiar
              </Button>
            )}

            {/* VIEW MODE SELECTOR - Hidden on mobile */}
            <div className="hidden md:flex border border-gray-200 rounded-lg overflow-hidden bg-white ml-auto">
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
      </div>

      {/* CONTENT SCROLLEABLE - Tabla con scroll independiente */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-3">Cargando probacionistas...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No se encontraron probacionistas
            </div>
          ) : (
            <>
              {/* CONDITIONAL VIEW RENDERING */}
              {viewMode === 'cards' && (
                <StudentModuleCardsView
                  students={students}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onChangeStatus={(student) => {
                    setSelectedStudentForAction(student);
                    setIsStatusDialogOpen(true);
                  }}
                  onViewTransactions={(student) => {
                    setSelectedStudentForAction(student);
                    setIsTransactionsDialogOpen(true);
                  }}
                  onCounseling={(student) => {
                    setSelectedStudentForAction(student);
                    setIsCounselingDialogOpen(true);
                  }}
                />
              )}
              {viewMode === 'compact' && (
                <StudentModuleCompactView
                  students={students}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onChangeStatus={(student) => {
                    setSelectedStudentForAction(student);
                    setIsStatusDialogOpen(true);
                  }}
                  onViewTransactions={(student) => {
                    setSelectedStudentForAction(student);
                    setIsTransactionsDialogOpen(true);
                  }}
                  onCounseling={(student) => {
                    setSelectedStudentForAction(student);
                    setIsCounselingDialogOpen(true);
                  }}
                />
              )}
              {viewMode === 'list' && (
                <StudentModuleListView
                  students={students}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onChangeStatus={(student) => {
                    setSelectedStudentForAction(student);
                    setIsStatusDialogOpen(true);
                  }}
                  onViewTransactions={(student) => {
                    setSelectedStudentForAction(student);
                    setIsTransactionsDialogOpen(true);
                  }}
                  onCounseling={(student) => {
                    setSelectedStudentForAction(student);
                    setIsCounselingDialogOpen(true);
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
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {editingStudent && (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Estado Actual:</span>
              <Badge variant={editingStudent.status === 'Baja' ? 'danger' : 'success'}>
                {editingStudent.status}
              </Badge>
              {editingStudent.status === 'Baja' && (
                <span className="text-xs text-gray-500">(Probacionista dado de baja)</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Type */}
            <div>
              <Label>Tipo de Documento</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData({ ...formData, documentType: value })
                }
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
              <Label>Género *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => {
                  setFormData({ ...formData, gender: value });
                  if (formErrors.gender) {
                    setFormErrors({ ...formErrors, gender: '' });
                  }
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
              {formErrors.gender && (
                <p className="text-sm text-red-500 mt-1">{formErrors.gender}</p>
              )}
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

            {/* Admission Type (Only for new records) */}
            {!editingStudent && (
              <div>
                <Label>Tipo de Alta</Label>
                <Select
                  value={formData.admissionType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, admissionType: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nuevo">Nuevo Ingreso</SelectItem>
                    <SelectItem value="Recuperado">Recuperado</SelectItem>
                    <SelectItem value="Traslado">Traslado de otra Sede</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Department */}
            <div>
              <Label>Departamento</Label>
              <Select value={selectedDeptId} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Province */}
            <div>
              <Label>Provincia</Label>
              <Select
                value={selectedProvId}
                onValueChange={handleProvinceChange}
                disabled={!selectedDeptId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={!selectedDeptId ? 'Selecciona un departamento' : 'Seleccionar...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div>
              <Label>Distrito</Label>
              <Select
                value={selectedDistId}
                onValueChange={handleDistrictChange}
                disabled={!selectedProvId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={!selectedProvId ? 'Selecciona una provincia' : 'Seleccionar...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
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

      {/* Transactions Dialog - Shows all branches */}
      <StudentTransactionsDialog
        open={isTransactionsDialogOpen}
        onOpenChange={setIsTransactionsDialogOpen}
        student={selectedStudentForAction}
      />

      {/* Counseling Dialog */}
      <CounselingFormDialog
        open={isCounselingDialogOpen}
        onOpenChange={setIsCounselingDialogOpen}
        counseling={null} // New counseling
        studentId={selectedStudentForAction?.id || ''}
        onSave={async (data) => {
          try {
            await api.createCounseling(selectedStudentForAction?.id || '', data);
            toast.success('Asesoría creada correctamente');
            setIsCounselingDialogOpen(false);
          } catch (error) {
            toast.error('Error al crear asesoría');
          }
        }}
      />
    </div>
  );
}
