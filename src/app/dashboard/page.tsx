'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, LogOut, Settings, GraduationCap, Grid3x3, List, Table, User as UserIcon, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ViewMode = 'grid' | 'list' | 'table';

interface BranchRole {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  active: boolean;
  roleId?: string;
  roleName?: string;
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  userType: 'admin' | 'normal';
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<BranchRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.me();
        setUser(data.user);
        setBranches(data.branches || []);
      } catch (error) {
        toast.error('Error al cargar datos', { duration: 1500 });
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_branch');
    toast.success('Sesión cerrada', { duration: 1500 });
    router.push('/login');
  };

  const handleSelectBranch = (branchId: string, roleId?: string) => {
    localStorage.setItem('selected_branch', branchId);
    if (roleId) {
      localStorage.setItem('selected_role', roleId);
    }
    router.push(`/workspace?branchId=${branchId}`);
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const handleChangePassword = () => {
    // TODO: Implementar en fase 7
    toast.info('Función disponible próximamente');
  };

  // Filtrar branches según toggle y búsqueda
  const filteredBranches = branches.filter(b => {
    // Filtro de activas
    if (!showInactive && b.active === false) return false;
    // Filtro de búsqueda
    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase();
      return (
        b.name.toLowerCase().includes(search) ||
        b.code.toLowerCase().includes(search) ||
        (b.description && b.description.toLowerCase().includes(search))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9"></div>
          <p className="text-gray-500 text-sm">Cargando filiales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header con dropdown de usuario */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 md:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent-9 p-2 md:p-3">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">Sistema Académico</h1>
              <p className="text-sm text-gray-500 hidden md:block">
                Gestión académica multi-tenant
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Dropdown de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-gray-200">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden md:inline">{user?.fullName || user?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
                  {user?.fullName || user?.username}
                </div>
                <div className="px-2 py-1 text-xs text-gray-500">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfile}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChangePassword}>
                  🔑 Cambiar Contraseña
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Panel de Administrador - PRIMERA FILA (solo para admins) */}
          {user?.userType === 'admin' && (
            <Card 
              className="mb-6 bg-white border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
              onClick={handleAdminPanel}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-gray-100 p-3 group-hover:bg-accent-2 transition-colors">
                      <Settings className="h-5 w-5 text-gray-600 group-hover:text-accent-9" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-accent-9 transition-colors">Panel de Administrador</h3>
                      <p className="text-sm text-gray-500">Gestionar filiales, usuarios y roles</p>
                    </div>
                  </div>
                  <Button variant="outline" className="group-hover:bg-accent-9 group-hover:text-white group-hover:border-accent-9 transition-colors">
                    Entrar →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controles: Búsqueda + Toggle + Vista */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Mis Filiales</h2>
                <p className="text-sm text-gray-500">
                  Selecciona una filial para comenzar
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Toggle mostrar inactivas */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-accent-9 focus:ring-accent-9 focus:ring-offset-2"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900">Mostrar inactivas</span>
                </label>

                {/* Selector de vista */}
                <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="px-3 rounded-md"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-3 rounded-md"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="px-3 rounded-md"
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar filial por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200"
              />
            </div>
          </div>

          {/* Mensaje si no hay filiales */}
          {filteredBranches.length === 0 && (
            <Card className="p-12 text-center bg-white border border-gray-200">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg bg-gray-100 p-6">
                  <Building2 className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay filiales disponibles
                  </h3>
                  <p className="text-sm text-gray-500">
                    {showInactive
                      ? 'No tienes filiales asignadas'
                      : 'No hay filiales activas. Activa el toggle para ver inactivas.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Vista Grid */}
          {viewMode === 'grid' && filteredBranches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.map((branch, index) => (
                <Card
                  key={branch.id}
                  className="bg-white border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                  onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className="rounded-lg bg-gray-100 p-3 group-hover:bg-accent-2 transition-colors">
                        <Building2 className="h-5 w-5 text-gray-600 group-hover:text-accent-9" />
                      </div>
                      <Badge variant={branch.active !== false ? 'default' : 'secondary'}>
                        {branch.active !== false ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base group-hover:text-accent-9 transition-colors">{branch.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{branch.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {branch.description || 'Sin descripción'}
                    </p>
                    {branch.roleName && (
                      <div className="mb-3">
                        <Badge variant="secondary" className="text-xs">
                          Rol: {branch.roleName}
                        </Badge>
                      </div>
                    )}
                    <Button className="w-full group-hover:bg-accent-9 group-hover:text-white" variant="outline">
                      Entrar →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista Lista */}
          {viewMode === 'list' && filteredBranches.length > 0 && (
            <div className="space-y-3">
              {filteredBranches.map((branch, index) => (
                <Card
                  key={branch.id}
                  className="bg-white border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                  onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="rounded-lg bg-gray-100 p-3 group-hover:bg-accent-2 transition-colors">
                          <Building2 className="h-5 w-5 text-gray-600 group-hover:text-accent-9" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900 group-hover:text-accent-9">{branch.name}</h3>
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">{branch.code}</span>
                            <Badge variant={branch.active !== false ? 'default' : 'secondary'} className="text-xs">
                              {branch.active !== false ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {branch.description || 'Sin descripción'}
                          </p>
                          {branch.roleName && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Rol: {branch.roleName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" className="group-hover:bg-accent-9 group-hover:text-white">Entrar →</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista Tabla */}
          {viewMode === 'table' && filteredBranches.length > 0 && (
            <Card className="bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Filial</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Código</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Rol</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Estado</th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBranches.map((branch) => (
                      <tr
                        key={branch.id}
                        className="hover:bg-gray-50 cursor-pointer group"
                        onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-accent-2">
                              <Building2 className="h-4 w-4 text-gray-600 group-hover:text-accent-9" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-accent-9">{branch.name}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {branch.description || 'Sin descripción'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{branch.code}</span>
                        </td>
                        <td className="px-4 py-4">
                          {branch.roleName ? (
                            <Badge variant="secondary">{branch.roleName}</Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={branch.active !== false ? 'default' : 'secondary'}>
                            {branch.active !== false ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" variant="outline" className="group-hover:bg-accent-9 group-hover:text-white">Entrar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
