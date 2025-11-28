'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Department {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

interface Province {
  id: string;
  departmentId: string;
  departmentName?: string;
  code: string | null;
  name: string;
  createdAt: string;
}

interface District {
  id: string;
  provinceId: string;
  provinceName?: string;
  departmentName?: string;
  code: string | null;
  name: string;
  createdAt: string;
}

export default function LocationsModule() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'provinces' | 'districts'>('departments');
  
  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  
  // Form states
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });
  const [provForm, setProvForm] = useState({ departmentId: '', code: '', name: '' });
  const [distForm, setDistForm] = useState({ provinceId: '', code: '', name: '' });

  const fetchDepartments = async () => {
    try {
      const response = await api.axiosInstance.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Error al cargar departamentos');
    }
  };

  const fetchProvinces = async (deptId?: string) => {
    try {
      const url = deptId ? `/provinces?departmentId=${deptId}` : '/provinces';
      const response = await api.axiosInstance.get(url);
      setProvinces(response.data.data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      toast.error('Error al cargar provincias');
    }
  };

  const fetchDistricts = async (provId?: string) => {
    try {
      const url = provId ? `/districts?provinceId=${provId}` : '/districts';
      const response = await api.axiosInstance.get(url);
      setDistricts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast.error('Error al cargar distritos');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDepartments();
      await fetchProvinces();
      await fetchDistricts();
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchProvinces(selectedDepartment);
      setSelectedProvince('');
    } else {
      fetchProvinces();
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else if (activeTab === 'districts') {
      fetchDistricts();
    }
  }, [selectedProvince, activeTab]);

  const handleOpenDialog = (type: string, item?: any) => {
    setEditingItem(item ? { ...item, type } : { type });
    
    if (type === 'department') {
      setDeptForm(item ? { code: item.code, name: item.name } : { code: '', name: '' });
    } else if (type === 'province') {
      setProvForm(item 
        ? { departmentId: item.departmentId, code: item.code || '', name: item.name }
        : { departmentId: selectedDepartment || '', code: '', name: '' }
      );
    } else if (type === 'district') {
      setDistForm(item 
        ? { provinceId: item.provinceId, code: item.code || '', name: item.name }
        : { provinceId: selectedProvince || '', code: '', name: '' }
      );
    }
    
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      const type = editingItem?.type;
      const isEditing = editingItem?.id;
      
      if (type === 'department') {
        if (!deptForm.code || !deptForm.name) {
          toast.error('Código y nombre son requeridos');
          return;
        }
        if (isEditing) {
          await api.axiosInstance.put(`/departments/${editingItem.id}`, deptForm);
          toast.success('Departamento actualizado');
        } else {
          await api.axiosInstance.post('/departments', deptForm);
          toast.success('Departamento creado');
        }
        fetchDepartments();
      } else if (type === 'province') {
        if (!provForm.departmentId || !provForm.name) {
          toast.error('Departamento y nombre son requeridos');
          return;
        }
        if (isEditing) {
          await api.axiosInstance.put(`/provinces/${editingItem.id}`, provForm);
          toast.success('Provincia actualizada');
        } else {
          await api.axiosInstance.post('/provinces', provForm);
          toast.success('Provincia creada');
        }
        fetchProvinces(selectedDepartment || undefined);
      } else if (type === 'district') {
        if (!distForm.provinceId || !distForm.name) {
          toast.error('Provincia y nombre son requeridos');
          return;
        }
        if (isEditing) {
          await api.axiosInstance.put(`/districts/${editingItem.id}`, distForm);
          toast.success('Distrito actualizado');
        } else {
          await api.axiosInstance.post('/districts', distForm);
          toast.success('Distrito creado');
        }
        fetchDistricts(selectedProvince || undefined);
      }
      
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    
    try {
      const type = deletingItem.type;
      
      if (type === 'department') {
        await api.axiosInstance.delete(`/departments/${deletingItem.id}`);
        fetchDepartments();
      } else if (type === 'province') {
        await api.axiosInstance.delete(`/provinces/${deletingItem.id}`);
        fetchProvinces(selectedDepartment || undefined);
      } else if (type === 'district') {
        await api.axiosInstance.delete(`/districts/${deletingItem.id}`);
        fetchDistricts(selectedProvince || undefined);
      }
      
      toast.success('Eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProvinces = provinces.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDistricts = districts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-teal-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500 rounded-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Gestión de Ubicaciones</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure departamentos, provincias y distritos del Perú
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchTerm(''); }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="departments" className="flex gap-2">
                🏛️ Departamentos
                <Badge variant="secondary">{departments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="provinces" className="flex gap-2">
                📍 Provincias
                <Badge variant="secondary">{provinces.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="districts" className="flex gap-2">
                🏘️ Distritos
                <Badge variant="secondary">{districts.length}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-0">
            <div className="flex justify-end mb-4">
              <Button onClick={() => handleOpenDialog('department')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Departamento
              </Button>
            </div>
            <LocationTable
              items={filteredDepartments}
              columns={['Código', 'Nombre']}
              renderRow={(item) => (
                <>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{item.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                </>
              )}
              onEdit={(item) => handleOpenDialog('department', item)}
              onDelete={(item) => { setDeletingItem({ ...item, type: 'department' }); setIsDeleteDialogOpen(true); }}
              isLoading={isLoading}
              emptyMessage="No hay departamentos registrados"
            />
          </TabsContent>

          {/* Provinces Tab */}
          <TabsContent value="provinces" className="mt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <Select value={selectedDepartment || '_all'} onValueChange={(v) => setSelectedDepartment(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos los departamentos</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleOpenDialog('province')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Provincia
              </Button>
            </div>
            <LocationTable
              items={filteredProvinces}
              columns={['Departamento', 'Nombre']}
              renderRow={(item) => (
                <>
                  <TableCell>
                    <Badge variant="secondary">{item.departmentName || '-'}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                </>
              )}
              onEdit={(item) => handleOpenDialog('province', item)}
              onDelete={(item) => { setDeletingItem({ ...item, type: 'province' }); setIsDeleteDialogOpen(true); }}
              isLoading={isLoading}
              emptyMessage="No hay provincias registradas"
            />
          </TabsContent>

          {/* Districts Tab */}
          <TabsContent value="districts" className="mt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex gap-2">
                <Select value={selectedDepartment || '_all'} onValueChange={(v) => { setSelectedDepartment(v === '_all' ? '' : v); setSelectedProvince(''); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedProvince || '_all'} 
                  onValueChange={(v) => setSelectedProvince(v === '_all' ? '' : v)}
                  disabled={!selectedDepartment}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {provinces.filter(p => p.departmentId === selectedDepartment).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleOpenDialog('district')} disabled={!selectedProvince && provinces.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Distrito
              </Button>
            </div>
            <LocationTable
              items={filteredDistricts}
              columns={['Provincia', 'Nombre']}
              renderRow={(item) => (
                <>
                  <TableCell>
                    <Badge variant="secondary">{item.provinceName || '-'}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                </>
              )}
              onEdit={(item) => handleOpenDialog('district', item)}
              onDelete={(item) => { setDeletingItem({ ...item, type: 'district' }); setIsDeleteDialogOpen(true); }}
              isLoading={isLoading}
              emptyMessage="No hay distritos registrados. Seleccione una provincia para agregar distritos."
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog: Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" onClose={handleCloseDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar' : 'Nuevo'}{' '}
              {editingItem?.type === 'department' ? 'Departamento' : 
               editingItem?.type === 'province' ? 'Provincia' : 'Distrito'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editingItem?.type === 'department' && (
              <>
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: LIM"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="Ej: Lima"
                  />
                </div>
              </>
            )}
            
            {editingItem?.type === 'province' && (
              <>
                <div className="space-y-2">
                  <Label>Departamento *</Label>
                  <Select value={provForm.departmentId} onValueChange={(v) => setProvForm({ ...provForm, departmentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={provForm.code}
                    onChange={(e) => setProvForm({ ...provForm, code: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={provForm.name}
                    onChange={(e) => setProvForm({ ...provForm, name: e.target.value })}
                    placeholder="Ej: Lima Metropolitana"
                  />
                </div>
              </>
            )}
            
            {editingItem?.type === 'district' && (
              <>
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <Select value={distForm.provinceId} onValueChange={(v) => setDistForm({ ...distForm, provinceId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={distForm.code}
                    onChange={(e) => setDistForm({ ...distForm, code: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={distForm.name}
                    onChange={(e) => setDistForm({ ...distForm, name: e.target.value })}
                    placeholder="Ej: Miraflores"
                  />
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSave}>
              {editingItem?.id ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent onClose={() => setIsDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-muted-foreground">">
              ¿Está seguro de eliminar "{deletingItem?.name}"?
              {deletingItem?.type === 'department' && (
                <span className="text-destructive block mt-2 text-sm">
                  ⚠️ Se eliminarán todas las provincias y distritos asociados.
                </span>
              )}
              {deletingItem?.type === 'province' && (
                <span className="text-destructive block mt-2 text-sm">
                  ⚠️ Se eliminarán todos los distritos asociados.
                </span>
              )}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Sub-component for location tables
function LocationTable({
  items,
  columns,
  renderRow,
  onEdit,
  onDelete,
  isLoading,
  emptyMessage,
}: {
  items: any[];
  columns: string[];
  renderRow: (item: any) => React.ReactNode;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col, i) => (
              <TableHead key={i}>{col}</TableHead>
            ))}
            <TableHead className="w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              {renderRow(item)}
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(item)} 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
