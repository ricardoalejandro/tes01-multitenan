'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Plus, ArrowLeft, Trash2, Pencil } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
}

export default function AdminPage() {
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
      // Manejar tanto respuesta con paginación como sin ella
      if (Array.isArray(response)) {
        setBranches(response);
      } else if (response.data && Array.isArray(response.data)) {
        setBranches(response.data);
      } else {
        setBranches([]);
      }
    } catch (error) {
      toast.error('Error al cargar sucursales', { duration: 1500 });
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Al editar, enviamos todos los datos
        await api.updateBranch(editingId, formData);
        toast.success('Sucursal actualizada', { duration: 1500 });
      } else {
        // Al crear, NO enviamos el código (se genera automáticamente)
        const { code, ...dataWithoutCode } = formData;
        await api.createBranch(dataWithoutCode);
        toast.success('Sucursal creada', { duration: 1500 });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', code: '', description: '', status: 'active' });
      loadBranches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar sucursal', { duration: 1500 });
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
    if (!confirm('¿Eliminar esta sucursal definitivamente? Esta acción marcará el registro como eliminado y no se mostrará en el sistema.')) return;
    try {
      await api.deleteBranch(id);
      toast.success('Sucursal eliminada', { duration: 1500 });
      loadBranches();
    } catch (error) {
      toast.error('Error al eliminar sucursal', { duration: 1500 });
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-9"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-2 p-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-11">Panel de Administrador</h1>
            <p className="text-neutral-9">Gestión de sucursales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-accent-9 hover:bg-accent-10 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sucursal
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar' : 'Nueva'} Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  {editingId && (
                    <div className="space-y-2">
                      <Label htmlFor="code">Código (Generado automáticamente)</Label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-accent-3 p-3">
                    <Building2 className="h-6 w-6 text-accent-9" />
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      branch.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {branch.status === 'active' ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
                <CardTitle className="mt-4">{branch.name}</CardTitle>
                <CardDescription>{branch.code}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-10 mb-4">{branch.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(branch)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {branches.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-neutral-9 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay sucursales</h3>
            <p className="text-neutral-10 mb-4">Cree su primera sucursal para comenzar</p>
            <Button onClick={() => setShowForm(true)} className="bg-accent-9 hover:bg-accent-10 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sucursal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
