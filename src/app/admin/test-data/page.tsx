'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Wand2, Trash2, Users, BookOpen, GraduationCap, AlertTriangle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface TestDataStats {
  students: number;
  courses: number;
  instructors: number;
}

export default function TestDataPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [stats, setStats] = useState<TestDataStats>({ students: 0, courses: 0, instructors: 0 });
  const [globalStats, setGlobalStats] = useState<TestDataStats>({ students: 0, courses: 0, instructors: 0 });
  
  const handleBack = () => router.push('/admin');
  useEscapeKey(handleBack);
  
  // Form state
  const [studentsCount, setStudentsCount] = useState(10);
  const [coursesCount, setCoursesCount] = useState(5);
  const [instructorsCount, setInstructorsCount] = useState(3);
  
  // Dialog states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'branch' | 'all'>('branch');

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        router.replace('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userStr);
        
        if (user.userType !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      fetchBranches();
      fetchGlobalStats();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchStats();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await api.axiosInstance.get('/branches');
      setBranches(response.data.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Error al cargar sucursales');
    }
  };

  const fetchBranchStats = async () => {
    try {
      const response = await api.axiosInstance.get(`/system/test-data/stats?branchId=${selectedBranch}`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const response = await api.axiosInstance.get('/system/test-data/stats');
      setGlobalStats(response.data.data);
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBranch) {
      toast.error('Debe seleccionar una sucursal');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.axiosInstance.post('/system/test-data/generate', {
        branchId: selectedBranch,
        studentsCount,
        coursesCount,
        instructorsCount,
      });
      
      const { students, courses, instructors } = response.data.data;
      toast.success(
        `Datos generados: ${students} probacionistas, ${courses} cursos, ${instructors} instructores`
      );
      
      fetchBranchStats();
      fetchGlobalStats();
    } catch (error: any) {
      console.error('Error generating test data:', error);
      toast.error(error.response?.data?.error || 'Error al generar datos de prueba');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const url = deleteScope === 'branch' 
        ? `/system/test-data?branchId=${selectedBranch}`
        : '/system/test-data';
      
      const response = await api.axiosInstance.delete(url);
      const { students, courses, instructors } = response.data.data;
      
      toast.success(
        `Eliminados: ${students} probacionistas, ${courses} cursos, ${instructors} instructores`
      );
      
      setIsDeleteDialogOpen(false);
      fetchBranchStats();
      fetchGlobalStats();
    } catch (error: any) {
      console.error('Error deleting test data:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar datos de prueba');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalBranchData = stats.students + stats.courses + stats.instructors;
  const totalGlobalData = globalStats.students + globalStats.courses + globalStats.instructors;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto mb-4"></div>
          <p className="text-neutral-10">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Wand2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-11">Generador de Datos de Prueba</h1>
              <p className="text-neutral-9 mt-1">
                Crea datos realistas para pruebas y demostraciones
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Global Stats Card */}
          {totalGlobalData > 0 && (
            <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900">
                        Datos de prueba en el sistema
                      </h3>
                      <p className="text-sm text-amber-700">
                        Total: {globalStats.students} probacionistas, {globalStats.courses} cursos, {globalStats.instructors} instructores
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => { setDeleteScope('all'); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpiar Todo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Generate Card */}
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Generar Datos
                </CardTitle>
                <CardDescription>
                  Configura y genera datos de prueba realistas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Branch Selection */}
                <div className="space-y-2">
                  <Label>Sucursal *</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Students Count */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Probacionistas
                    </Label>
                    <Badge variant="secondary">{studentsCount}</Badge>
                  </div>
                  <Slider
                    value={[studentsCount]}
                    onValueChange={([value]) => setStudentsCount(value)}
                    min={1}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombres peruanos reales, DNI únicos válidos
                  </p>
                </div>

                {/* Courses Count */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      Cursos
                    </Label>
                    <Badge variant="secondary">{coursesCount}</Badge>
                  </div>
                  <Slider
                    value={[coursesCount]}
                    onValueChange={([value]) => setCoursesCount(value)}
                    min={1}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cursos filosóficos con descripciones reales
                  </p>
                </div>

                {/* Instructors Count */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-500" />
                      Instructores
                    </Label>
                    <Badge variant="secondary">{instructorsCount}</Badge>
                  </div>
                  <Slider
                    value={[instructorsCount]}
                    onValueChange={([value]) => setInstructorsCount(value)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Instructores con datos completos
                  </p>
                </div>

                {/* Generate Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={handleGenerate}
                  disabled={!selectedBranch || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generar Datos de Prueba
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-slate-500" />
                  Datos de Prueba Existentes
                </CardTitle>
                <CardDescription>
                  {selectedBranch 
                    ? `En la sucursal seleccionada`
                    : 'Seleccione una sucursal para ver estadísticas'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {selectedBranch ? (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-blue-700">{stats.students}</div>
                        <div className="text-xs text-blue-600">Probacionistas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                        <BookOpen className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-green-700">{stats.courses}</div>
                        <div className="text-xs text-green-600">Cursos</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <GraduationCap className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-purple-700">{stats.instructors}</div>
                        <div className="text-xs text-purple-600">Instructores</div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    {totalBranchData > 0 && (
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => { setDeleteScope('branch'); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Datos de esta Sucursal
                      </Button>
                    )}

                    {totalBranchData === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay datos de prueba en esta sucursal</p>
                        <p className="text-sm mt-1">Use el generador para crear datos</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <ArrowLeft className="h-8 w-8 text-slate-400" />
                    </div>
                    <p>Seleccione una sucursal</p>
                    <p className="text-sm mt-1">para ver los datos de prueba existentes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Acerca de los Datos de Prueba
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Los datos generados son <strong>realistas</strong>: nombres peruanos reales, DNIs válidos únicos</li>
                    <li>• Los datos de prueba están marcados internamente y pueden ser eliminados en cualquier momento</li>
                    <li>• Los cursos incluyen descripciones filosóficas apropiadas</li>
                    <li>• Los probacionistas son asociados automáticamente a la sucursal seleccionada</li>
                    <li>• Esta función está disponible para administradores del sistema</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent onClose={() => setIsDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {deleteScope === 'all' 
                  ? '¿Está seguro de eliminar TODOS los datos de prueba del sistema?'
                  : '¿Está seguro de eliminar los datos de prueba de esta sucursal?'}
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive font-medium">
                  Esta acción eliminará:
                </p>
                <ul className="text-sm text-destructive/80 mt-2 space-y-1">
                  <li>• {deleteScope === 'all' ? globalStats.students : stats.students} probacionistas</li>
                  <li>• {deleteScope === 'all' ? globalStats.courses : stats.courses} cursos</li>
                  <li>• {deleteScope === 'all' ? globalStats.instructors : stats.instructors} instructores</li>
                </ul>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Datos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
