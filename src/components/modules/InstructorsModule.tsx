'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Instructor {
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  phone: string;
  status: string;
  hourlyRate: number;
  specialties: Array<{ specialty: string }>;
}

export default function InstructorsModule({ branchId }: { branchId: string }) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
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
    hireDate: new Date().toISOString().split('T')[0],
    status: 'Activo',
    hourlyRate: 0,
    specialties: ['']
  });

  useEffect(() => {
    loadInstructors();
  }, [branchId]);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/instructors?branchId=${branchId}`);
      setInstructors(data || []);
    } catch (error) {
      toast.error('Error al cargar instructores');
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const specialtiesData = formData.specialties.filter(s => s.trim()).map(specialty => ({ specialty }));
      
      if (editingInstructor) {
        await api.put(`/instructors/${editingInstructor.id}`, { ...formData, branchId, specialties: specialtiesData });
        toast.success('Instructor actualizado');
      } else {
        await api.post('/instructors', { ...formData, branchId, specialties: specialtiesData });
        toast.success('Instructor creado');
      }
      setIsDialogOpen(false);
      resetForm();
      loadInstructors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      documentType: 'DNI',
      dni: instructor.dni,
      gender: 'Masculino',
      firstName: instructor.firstName,
      paternalLastName: instructor.paternalLastName,
      maternalLastName: instructor.maternalLastName,
      email: instructor.email || '',
      phone: instructor.phone || '',
      birthDate: '',
      hireDate: new Date().toISOString().split('T')[0],
      status: instructor.status,
      hourlyRate: instructor.hourlyRate,
      specialties: instructor.specialties.length > 0 ? instructor.specialties.map(s => s.specialty) : ['']
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este instructor?')) return;
    try {
      await api.delete(`/instructors/${id}`);
      toast.success('Instructor eliminado');
      loadInstructors();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingInstructor(null);
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
      hireDate: new Date().toISOString().split('T')[0],
      status: 'Activo',
      hourlyRate: 0,
      specialties: ['']
    });
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

  const filteredInstructors = instructors.filter((instructor) => {
    const searchLower = search.toLowerCase();
    return (
      instructor.dni.toLowerCase().includes(searchLower) ||
      instructor.firstName.toLowerCase().includes(searchLower) ||
      instructor.paternalLastName.toLowerCase().includes(searchLower) ||
      instructor.email?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Activo': return 'success';
      case 'Inactivo': return 'danger';
      case 'Licencia': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-9 to-accent-secondary-9 bg-clip-text text-transparent">
            Instructores
          </h1>
          <p className="text-neutral-10 mt-1">Gestión del personal docente</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-gradient-to-r from-accent-9 to-accent-10 hover:from-accent-10 hover:to-accent-11 shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Instructor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
        <Input
          placeholder="Buscar por DNI, nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-6">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : filteredInstructors.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">No se encontraron instructores</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tarifa/Hora</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.map((instructor) => (
                <TableRow key={instructor.id}>
                  <TableCell className="font-medium">{instructor.dni}</TableCell>
                  <TableCell>
                    {`${instructor.firstName} ${instructor.paternalLastName} ${instructor.maternalLastName}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {instructor.specialties.map((s, i) => (
                        <Badge key={i} variant="secondary">{s.specialty}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(instructor.status)}>{instructor.status}</Badge>
                  </TableCell>
                  <TableCell>S/. {instructor.hourlyRate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(instructor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(instructor.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingInstructor ? 'Editar' : 'Nuevo'} Instructor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DNI</Label>
                  <Input value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} required />
                </div>
                <div>
                  <Label>Género</Label>
                  <Select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </Select>
                </div>
                <div>
                  <Label>Nombres</Label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div>
                  <Label>Apellido Paterno</Label>
                  <Input value={formData.paternalLastName} onChange={(e) => setFormData({ ...formData, paternalLastName: e.target.value })} required />
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
                  <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} required>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Licencia">Licencia</option>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Tarifa por Hora (S/.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Especialidades</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSpecialty}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.specialties.map((specialty, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={specialty}
                          onChange={(e) => updateSpecialty(index, e.target.value)}
                          placeholder={`Especialidad ${index + 1}`}
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
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-accent-9 to-accent-10">
                {editingInstructor ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
