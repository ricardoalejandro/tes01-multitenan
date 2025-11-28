'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Layers, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Level {
  id: string;
  code: string;
  name: string;
  managerName: string | null;
  managerPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LevelsModule() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    managerName: '',
    managerPhone: '',
    isActive: true,
  });

  const fetchLevels = async () => {
    try {
      setIsLoading(true);
      const response = await api.axiosInstance.get('/levels');
      setLevels(response.data.data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast.error('Error al cargar los niveles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const handleOpenDialog = (level?: Level) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        name: level.name,
        managerName: level.managerName || '',
        managerPhone: level.managerPhone || '',
        isActive: level.isActive,
      });
    } else {
      setEditingLevel(null);
      setFormData({
        name: '',
        managerName: '',
        managerPhone: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLevel(null);
    setFormData({
      name: '',
      managerName: '',
      managerPhone: '',
      isActive: true,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('El nombre del nivel es requerido');
        return;
      }

      if (editingLevel) {
        await api.axiosInstance.put(`/levels/${editingLevel.id}`, formData);
        toast.success('Nivel actualizado correctamente');
      } else {
        await api.axiosInstance.post('/levels', formData);
        toast.success('Nivel creado correctamente');
      }

      handleCloseDialog();
      fetchLevels();
    } catch (error: any) {
      console.error('Error saving level:', error);
      toast.error(error.response?.data?.error || 'Error al guardar el nivel');
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;

    try {
      await api.axiosInstance.delete(`/levels/${deletingLevel.id}`);
      toast.success('Nivel eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setDeletingLevel(null);
      fetchLevels();
    } catch (error: any) {
      console.error('Error deleting level:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar el nivel');
    }
  };

  const handleToggleActive = async (level: Level) => {
    try {
      await api.axiosInstance.put(`/levels/${level.id}`, {
        ...level,
        isActive: !level.isActive,
      });
      toast.success(level.isActive ? 'Nivel desactivado' : 'Nivel activado');
      fetchLevels();
    } catch (error: any) {
      console.error('Error toggling level:', error);
      toast.error('Error al cambiar el estado del nivel');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Gestión de Niveles</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure los niveles organizacionales y sus responsables
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Nivel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : levels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay niveles registrados</p>
            <p className="text-sm mt-1">Cree un nuevo nivel para comenzar</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {level.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{level.name}</TableCell>
                    <TableCell>
                      {level.managerName ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {level.managerName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {level.managerPhone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {level.managerPhone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={level.isActive}
                        onCheckedChange={() => handleToggleActive(level)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(level)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeletingLevel(level); setIsDeleteDialogOpen(true); }}
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
        )}
      </CardContent>

      {/* Dialog: Create/Edit Level */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" onClose={handleCloseDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Editar Nivel' : 'Nuevo Nivel'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del nivel *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Región Centro"
              />
              {!editingLevel && (
                <p className="text-xs text-muted-foreground">
                  El código se generará automáticamente (NVL-001, NVL-002...)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerName">Nombre del responsable</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="managerName"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerPhone">Teléfono del responsable</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="managerPhone"
                  value={formData.managerPhone}
                  onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                  placeholder="Ej: +51 999 888 777"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="isActive">Nivel activo</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingLevel ? 'Guardar Cambios' : 'Crear Nivel'}
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
              ¿Está seguro de eliminar el nivel "{deletingLevel?.name}" ({deletingLevel?.code})?
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
    </Card>
  );
}
