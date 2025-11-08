'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
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
    birthDate: '',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionReason: 'Nuevo',
    status: 'Activo',
    monthlyFee: 0,
  });

  useEffect(() => {
    loadStudents();
  }, [branchId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.getStudents({ branchId });
      setStudents(response.data || []);
    } catch (error) {
      toast.error('Error al cargar probacionistas');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          ...formData,
          branchId,
        });
        toast.success('Probacionista actualizado');
      } else {
        await api.createStudent({
          ...formData,
          branchId,
        });
        toast.success('Probacionista creado');
      }
      setIsDialogOpen(false);
      resetForm();
      loadStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
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
    if (!confirm('¿Está seguro de eliminar este probacionista?')) return;
    try {
      await api.deleteStudent(id);
      toast.success('Probacionista eliminado');
      loadStudents();
    } catch (error) {
      toast.error('Error al eliminar');
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
      birthDate: '',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionReason: 'Nuevo',
      status: 'Activo',
      monthlyFee: 0,
    });
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = search.toLowerCase();
    return (
      student.dni.toLowerCase().includes(searchLower) ||
      student.firstName.toLowerCase().includes(searchLower) ||
      student.paternalLastName.toLowerCase().includes(searchLower) ||
      student.maternalLastName.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-9 to-accent-secondary-9 bg-clip-text text-transparent">
            Probacionistas
          </h1>
          <p className="text-neutral-10 mt-1">
            Gestión completa de estudiantes
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="bg-gradient-to-r from-accent-9 to-accent-10 hover:from-accent-10 hover:to-accent-11 shadow-lg"
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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-6">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">
            No se encontraron probacionistas
          </div>
        ) : (
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
              {filteredStudents.map((student) => (
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
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? 'Editar' : 'Nuevo'} Probacionista
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody>
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
                  <Label>Número de Documento</Label>
                  <Input
                    value={formData.dni}
                    onChange={(e) =>
                      setFormData({ ...formData, dni: e.target.value })
                    }
                    required
                  />
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

                {/* Birth Date */}
                <div>
                  <Label>Fecha de Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                  />
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
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-accent-9 to-accent-10">
                {editingStudent ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
