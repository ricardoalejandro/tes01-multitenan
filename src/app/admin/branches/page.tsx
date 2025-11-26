'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Plus, ArrowLeft, Trash2, Pencil, Power, PowerOff } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  active?: boolean;
}

export default function BranchesManagementPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
    status: 'active' | 'inactive';
  }>({
    name: '',
    code: '',
    description: '',
    status: 'active',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.getBranches();
      if (Array.isArray(response)) {
        setBranches(response);
      } else if (response.data && Array.isArray(response.data)) {
        setBranches(response.data);
      } else {
        setBranches([]);
      }
    } catch (error) {
      toast.error('Error al cargar filiales');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateBranch(editingId, formData);
        toast.success('Filial actualizada');
      } else {
        const { code, ...dataWithoutCode } = formData;
        await api.createBranch(dataWithoutCode);
        toast.success('Filial creada');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', code: '', description: '', status: 'active' });
      loadBranches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar filial');
    }
  };

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name,
      code: branch.code,
      description: branch.description,
      status: branch.status === 'eliminado' ? 'inactive' : (branch.status as 'active' | 'inactive'),
    });
    setEditingId(branch.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta filial definitivamente? Esta acción marcará el registro como eliminado.')) return;
    try {
      await api.deleteBranch(id);
      toast.success('Filial eliminada');
      loadBranches();
    } catch (error) {
      toast.error('Error al eliminar filial');
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    // TODO: Implementar endpoint /api/branches/:id/toggle-active
    toast.info('Función de activar/desactivar disponible próximamente');
  };

  const handleBack = () => {
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-9"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-11">Gestión de Filiales</h1>
              <p className="text-sm text-neutral-9">Administrar sucursales del sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Volver</span>
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-accent-9 hover:bg-accent-10 text-white">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Nueva Filial</span>
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId ? 'Editar' : 'Nueva'} Filial</CardTitle>
                <CardDescription>
                  {editingId ? 'Modifica los datos de la filial' : 'Crea una nueva filial en el sistema'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Sede Lima"
                        required
                      />
                    </div>
                    {editingId && (
                      <div className="space-y-2">
                        <Label htmlFor="code">Código (Auto-generado)</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          disabled
                          className="bg-neutral-3 cursor-not-allowed"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción de la filial"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
                      {editingId ? 'Actualizar' : 'Crear'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({ name: '', code: '', description: '', status: 'active' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Branches List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="rounded-lg bg-accent-3 p-3">
                      <Building2 className="h-6 w-6 text-accent-9" />
                    </div>
                    <Badge variant={branch.active !== false ? 'default' : 'secondary'}>
                      {branch.active !== false ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{branch.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">{branch.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-10 mb-4 line-clamp-2">
                    {branch.description || 'Sin descripción'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(branch)}
                      className="flex-1"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(branch)}
                      title={branch.active !== false ? 'Desactivar' : 'Activar'}
                    >
                      {branch.active !== false ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(branch.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {branches.length === 0 && !showForm && (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 text-neutral-7 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-neutral-11">No hay filiales</h3>
              <p className="text-neutral-9 mb-4">Crea tu primera filial para comenzar</p>
              <Button onClick={() => setShowForm(true)} className="bg-accent-9 hover:bg-accent-10 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Filial
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
