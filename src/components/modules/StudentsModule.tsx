'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface Student { 
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  status: string;
  monthlyFee: number;
  documentType: string;
  admissionDate: string;
  admissionReason: string;
}
interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StudentsModule({ branchId }: { branchId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    birthDate: '',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionReason: 'Nuevo',
    status: 'Activo',
    monthlyFee: 0,
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

  useEffect(() => {
    loadStudents();
  }, [branchId]);

  useEffect(() => {
    loadStudents();
  }, [page, pageSize, search]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.getStudents({
        branchId,
        page,
        limit: pageSize,
        search,
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
      toast.error(error.response?.data?.message || 'Error al guardar', { duration: 1500 });
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      documentType: student.documentType,
      dni: student.dni,
      gender: student.gender,
      firstName: student.firstName,
      paternalLastName: student.paternalLastName,
      maternalLastName: student.maternalLastName,
      email: student.email || '',
      phone: student.phone || '',
      address: (student as any).address || '',
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      admissionDate: student.admissionDate
        ? student.admissionDate.split('T')[0]
        : '',
      admissionReason: student.admissionReason,
      status: student.status,
      monthlyFee: student.monthlyFee,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este probacionista definitivamente? Esta acción marcará el registro como eliminado y no se mostrará en el sistema.')) return;
    try {
      await api.deleteStudent(id);
      toast.success('Probacionista eliminado', { duration: 1500 });
      loadStudents();
    } catch (error) {
      toast.error('Error al eliminar', { duration: 1500 });
    }
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
      birthDate: '',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionReason: 'Nuevo',
      status: 'Activo',
      monthlyFee: 0,
    });
    setFormErrors({});
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Activo':
        return 'success';
      case 'Inactivo':
        return 'danger';
      case 'Fluctuante':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
        <Input
          placeholder="Buscar por DNI, nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Mensualidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.dni}</TableCell>
                  <TableCell>
                    {`${student.firstName} ${student.paternalLastName} ${student.maternalLastName}`}
                  </TableCell>
                  <TableCell>{student.email || '-'}</TableCell>
                  <TableCell>{student.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(student.status)}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>S/. {parseFloat(student.monthlyFee as any).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(student)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

                {/* Admission Reason */}
                <div>
                  <Label>Motivo de Admisión</Label>
                  <Select
                    value={formData.admissionReason}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        admissionReason: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Traslado">Traslado</option>
                    <option value="Recuperado">Recuperado</option>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    required
                  >
                    <option value="Activo">Activo</option>
                    <option value="Fluctuante">Fluctuante</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Baja">Baja</option>
                  </Select>
                </div>

                {/* Monthly Fee */}
                <div className="col-span-2">
                  <Label>Mensualidad (S/.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
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
    </div>
  );
}
