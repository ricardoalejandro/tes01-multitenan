'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Calendar, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Holiday {
  id: string;
  name: string;
  description: string | null;
  date: string;
  year: number;
  type: 'national' | 'provincial';
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

export default function HolidaysModule() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReplicateDialogOpen, setIsReplicateDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [activeTab, setActiveTab] = useState<'national' | 'provincial'>('national');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [replicateFromYear, setReplicateFromYear] = useState(new Date().getFullYear());
  const [replicateToYear, setReplicateToYear] = useState(new Date().getFullYear() + 1);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    type: 'national' as 'national' | 'provincial',
    departmentId: '',
    isActive: true,
  });

  // Generate year options (current year - 2 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const response = await api.axiosInstance.get(`/holidays?year=${selectedYear}`);
      setHolidays(response.data.data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Error al cargar los feriados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.axiosInstance.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchHolidays();
    fetchDepartments();
  }, [selectedYear]);

  const filteredHolidays = holidays.filter(h => h.type === activeTab);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        description: holiday.description || '',
        date: holiday.date,
        type: holiday.type,
        departmentId: holiday.departmentId || '',
        isActive: holiday.isActive,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        description: '',
        date: `${selectedYear}-01-01`,
        type: activeTab,
        departmentId: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    setFormData({
      name: '',
      description: '',
      date: '',
      type: 'national',
      departmentId: '',
      isActive: true,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.date) {
        toast.error('Nombre y fecha son requeridos');
        return;
      }

      if (formData.type === 'provincial' && !formData.departmentId) {
        toast.error('Debe seleccionar un departamento para feriados provinciales');
        return;
      }

      const payload = {
        ...formData,
        departmentId: formData.type === 'national' ? null : formData.departmentId,
      };

      if (editingHoliday) {
        await api.axiosInstance.put(`/holidays/${editingHoliday.id}`, payload);
        toast.success('Feriado actualizado correctamente');
      } else {
        await api.axiosInstance.post('/holidays', payload);
        toast.success('Feriado creado correctamente');
      }

      handleCloseDialog();
      fetchHolidays();
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      toast.error(error.response?.data?.error || 'Error al guardar el feriado');
    }
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;

    try {
      await api.axiosInstance.delete(`/holidays/${deletingHoliday.id}`);
      toast.success('Feriado eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar el feriado');
    }
  };

  const handleReplicate = async () => {
    try {
      const response = await api.axiosInstance.post('/holidays/replicate', {
        fromYear: replicateFromYear,
        toYear: replicateToYear,
      });
      toast.success(`Se replicaron ${response.data.count} feriados al año ${replicateToYear}`);
      setIsReplicateDialogOpen(false);
      if (selectedYear === replicateToYear) {
        fetchHolidays();
      }
    } catch (error: any) {
      console.error('Error replicating holidays:', error);
      toast.error(error.response?.data?.error || 'Error al replicar feriados');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Gestión de Feriados</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure los feriados nacionales y provinciales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setIsReplicateDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Replicar Año
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Feriado
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'national' | 'provincial')}>
          <TabsList className="mb-4">
            <TabsTrigger value="national" className="flex gap-2">
              🇵🇪 Nacionales
              <Badge variant="secondary" className="ml-1">
                {holidays.filter(h => h.type === 'national').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="provincial" className="flex gap-2">
              🏛️ Provinciales
              <Badge variant="secondary" className="ml-1">
                {holidays.filter(h => h.type === 'provincial').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="national" className="mt-0">
            <HolidayTable
              holidays={filteredHolidays}
              isLoading={isLoading}
              onEdit={handleOpenDialog}
              onDelete={(h) => { setDeletingHoliday(h); setIsDeleteDialogOpen(true); }}
              formatDate={formatDate}
              showDepartment={false}
            />
          </TabsContent>

          <TabsContent value="provincial" className="mt-0">
            <HolidayTable
              holidays={filteredHolidays}
              isLoading={isLoading}
              onEdit={handleOpenDialog}
              onDelete={(h) => { setDeletingHoliday(h); setIsDeleteDialogOpen(true); }}
              formatDate={formatDate}
              showDepartment={true}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog: Create/Edit Holiday */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" onClose={handleCloseDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Editar Feriado' : 'Nuevo Feriado'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del feriado *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Día del Trabajo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del feriado"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as 'national' | 'provincial' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">🇵🇪 Nacional</SelectItem>
                      <SelectItem value="provincial">🏛️ Provincial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === 'provincial' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingHoliday ? 'Guardar Cambios' : 'Crear Feriado'}
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
            <p className="text-muted-foreground">
              ¿Está seguro de eliminar el feriado "{deletingHoliday?.name}"?
              Esta acción no se puede deshacer.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Replicate Year */}
      <Dialog open={isReplicateDialogOpen} onOpenChange={setIsReplicateDialogOpen}>
        <DialogContent onClose={() => setIsReplicateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Replicar Feriados
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta acción copiará todos los feriados de un año a otro, ajustando las fechas automáticamente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desde el año</Label>
                  <Select
                    value={replicateFromYear.toString()}
                    onValueChange={(v) => setReplicateFromYear(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hacia el año</Label>
                  <Select
                    value={replicateToYear.toString()}
                    onValueChange={(v) => setReplicateToYear(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReplicate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Replicar Feriados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Sub-component for the holidays table
function HolidayTable({
  holidays,
  isLoading,
  onEdit,
  onDelete,
  formatDate,
  showDepartment,
}: {
  holidays: Holiday[];
  isLoading: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (h: Holiday) => void;
  formatDate: (date: string) => string;
  showDepartment: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay feriados registrados para este año</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">Fecha</TableHead>
            <TableHead>Nombre</TableHead>
            {showDepartment && <TableHead>Departamento</TableHead>}
            <TableHead>Descripción</TableHead>
            <TableHead className="w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holidays.sort((a, b) => a.date.localeCompare(b.date)).map((holiday) => (
            <TableRow key={holiday.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                {formatDate(holiday.date)}
              </TableCell>
              <TableCell className="font-medium">{holiday.name}</TableCell>
              {showDepartment && (
                <TableCell>
                  <Badge variant="outline">{holiday.departmentName || '-'}</Badge>
                </TableCell>
              )}
              <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                {holiday.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(holiday)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(holiday)}
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
