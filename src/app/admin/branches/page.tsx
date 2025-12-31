'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Plus, ArrowLeft, Trash2, Pencil, Power, PowerOff, MapPin, User, Layers } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Branch {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  active?: boolean;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
  branchManager?: string;
  levelId?: string;
  departmentName?: string;
  provinceName?: string;
  districtName?: string;
  levelName?: string;
  levelManagerName?: string;
  levelManagerPhone?: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Province {
  id: string;
  departmentId: string;
  name: string;
}

interface District {
  id: string;
  provinceId: string;
  name: string;
}

interface Level {
  id: string;
  code: string;
  name: string;
  managerName: string | null;
  managerPhone: string | null;
}

export default function BranchesManagementPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const handleBack = () => router.push('/admin');
  useEscapeKey(handleBack, !showForm); // Solo cuando no hay form abierto
  
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
    status: 'active' | 'inactive';
    departmentId: string;
    provinceId: string;
    districtId: string;
    branchManager: string;
    levelId: string;
  }>({
    name: '',
    code: '',
    description: '',
    status: 'active',
    departmentId: '',
    provinceId: '',
    districtId: '',
    branchManager: '',
    levelId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  useEffect(() => {
    loadBranches();
    loadDepartments();
    loadLevels();
  }, []);

  // Load provinces when department changes
  useEffect(() => {
    if (formData.departmentId) {
      loadProvinces(formData.departmentId);
      // Clear province and district when department changes
      if (!editingId) {
        setFormData(prev => ({ ...prev, provinceId: '', districtId: '' }));
        setDistricts([]);
      }
    } else {
      setProvinces([]);
      setDistricts([]);
    }
  }, [formData.departmentId]);

  // Load districts when province changes
  useEffect(() => {
    if (formData.provinceId) {
      loadDistricts(formData.provinceId);
      // Clear district when province changes
      if (!editingId) {
        setFormData(prev => ({ ...prev, districtId: '' }));
      }
    } else {
      setDistricts([]);
    }
  }, [formData.provinceId]);

  // Update selected level info when levelId changes
  useEffect(() => {
    if (formData.levelId) {
      const level = levels.find(l => l.id === formData.levelId);
      setSelectedLevel(level || null);
    } else {
      setSelectedLevel(null);
    }
  }, [formData.levelId, levels]);

  const loadDepartments = async () => {
    try {
      const response = await api.axiosInstance.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadProvinces = async (departmentId: string) => {
    try {
      const response = await api.axiosInstance.get(`/provinces?departmentId=${departmentId}`);
      setProvinces(response.data.data || []);
    } catch (error) {
      console.error('Error loading provinces:', error);
    }
  };

  const loadDistricts = async (provinceId: string) => {
    try {
      const response = await api.axiosInstance.get(`/districts?provinceId=${provinceId}`);
      setDistricts(response.data.data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadLevels = async () => {
    try {
      const response = await api.axiosInstance.get('/levels');
      setLevels(response.data.data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  };

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
      // Build payload with optional fields
      const payload: any = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
      };
      
      // Add optional location fields if set
      if (formData.departmentId) payload.departmentId = formData.departmentId;
      if (formData.provinceId) payload.provinceId = formData.provinceId;
      if (formData.districtId) payload.districtId = formData.districtId;
      if (formData.branchManager) payload.branchManager = formData.branchManager;
      if (formData.levelId) payload.levelId = formData.levelId;
      
      if (editingId) {
        await api.updateBranch(editingId, payload);
        toast.success('Filial actualizada');
      } else {
        await api.createBranch(payload);
        toast.success('Filial creada');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
        name: '', 
        code: '', 
        description: '', 
        status: 'active',
        departmentId: '',
        provinceId: '',
        districtId: '',
        branchManager: '',
        levelId: '',
      });
      loadBranches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar filial');
    }
  };

  const handleEdit = async (branch: Branch) => {
    // If branch has location data, load provinces and districts
    if (branch.departmentId) {
      await loadProvinces(branch.departmentId);
    }
    if (branch.provinceId) {
      await loadDistricts(branch.provinceId);
    }
    
    setFormData({
      name: branch.name,
      code: branch.code,
      description: branch.description,
      status: branch.status === 'eliminado' ? 'inactive' : (branch.status as 'active' | 'inactive'),
      departmentId: branch.departmentId || '',
      provinceId: branch.provinceId || '',
      districtId: branch.districtId || '',
      branchManager: branch.branchManager || '',
      levelId: branch.levelId || '',
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-11 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Información Básica
                    </h3>
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
                  </div>

                  {/* Location Info */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-neutral-11 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ubicación Geográfica
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Departamento</Label>
                        <Select 
                          value={formData.departmentId || "_none"} 
                          onValueChange={(v) => setFormData({ ...formData, departmentId: v === "_none" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sin seleccionar</SelectItem>
                            {departments.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Provincia</Label>
                        <Select 
                          value={formData.provinceId || "_none"} 
                          onValueChange={(v) => setFormData({ ...formData, provinceId: v === "_none" ? "" : v })}
                          disabled={!formData.departmentId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={formData.departmentId ? "Seleccione..." : "Primero seleccione departamento"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sin seleccionar</SelectItem>
                            {provinces.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Distrito</Label>
                        <Select 
                          value={formData.districtId || "_none"} 
                          onValueChange={(v) => setFormData({ ...formData, districtId: v === "_none" ? "" : v })}
                          disabled={!formData.provinceId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={formData.provinceId ? "Seleccione..." : "Primero seleccione provincia"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sin seleccionar</SelectItem>
                            {districts.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Management Info */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-neutral-11 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Gestión y Responsables
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="branchManager">Jefe de Filial</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-8" />
                          <Input
                            id="branchManager"
                            value={formData.branchManager}
                            onChange={(e) => setFormData({ ...formData, branchManager: e.target.value })}
                            placeholder="Nombre del responsable"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Nivel Organizacional</Label>
                        <Select 
                          value={formData.levelId || "_none"} 
                          onValueChange={(v) => setFormData({ ...formData, levelId: v === "_none" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un nivel..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sin nivel asignado</SelectItem>
                            {levels.map(l => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.code} - {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Level Manager Info Display */}
                    {selectedLevel && (selectedLevel.managerName || selectedLevel.managerPhone) && (
                      <div className="bg-accent-2 border border-accent-6 rounded-lg p-4">
                        <p className="text-sm text-accent-11 font-medium mb-2">
                          Responsable del Nivel: {selectedLevel.name}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-neutral-10">
                          {selectedLevel.managerName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {selectedLevel.managerName}
                            </span>
                          )}
                          {selectedLevel.managerPhone && (
                            <span className="flex items-center gap-1">
                              📞 {selectedLevel.managerPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
                      {editingId ? 'Actualizar' : 'Crear'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({ 
                          name: '', 
                          code: '', 
                          description: '', 
                          status: 'active',
                          departmentId: '',
                          provinceId: '',
                          districtId: '',
                          branchManager: '',
                          levelId: '',
                        });
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
                  <p className="text-sm text-neutral-10 mb-3 line-clamp-2">
                    {branch.description || 'Sin descripción'}
                  </p>
                  
                  {/* Location Info */}
                  {(branch.departmentName || branch.provinceName || branch.districtName) && (
                    <div className="flex items-center gap-1 text-xs text-neutral-9 mb-2">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {[branch.departmentName, branch.provinceName, branch.districtName]
                          .filter(Boolean)
                          .join(' > ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Manager Info */}
                  {branch.branchManager && (
                    <div className="flex items-center gap-1 text-xs text-neutral-9 mb-2">
                      <User className="h-3 w-3" />
                      <span>Jefe: {branch.branchManager}</span>
                    </div>
                  )}
                  
                  {/* Level Info */}
                  {branch.levelName && (
                    <div className="flex items-center gap-1 text-xs text-neutral-9 mb-3">
                      <Layers className="h-3 w-3" />
                      <span>Nivel: {branch.levelName}</span>
                    </div>
                  )}
                  
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
