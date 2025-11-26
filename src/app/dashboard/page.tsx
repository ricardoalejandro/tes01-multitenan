'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, LogOut, Settings, GraduationCap, Grid3x3, List, Table, User as UserIcon, ChevronDown } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // Filtrar branches según toggle
  const filteredBranches = showInactive
    ? branches
    : branches.filter(b => b.active !== false);

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
        {/* Header con dropdown de usuario */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent-9 p-2 md:p-3">
              <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-11">Sistema Académico</h1>
              <p className="text-sm text-neutral-9 hidden md:block">
                Sistema de gestión académica multi-tenant
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Dropdown de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden md:inline">{user?.fullName || user?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium text-neutral-11">
                  {user?.fullName || user?.username}
                </div>
                <div className="px-2 py-1 text-xs text-neutral-9">
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
            <Card className="mb-6 bg-gradient-to-r from-accent-2 to-accent-3 border-2 border-accent-6 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent-9 p-3">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-neutral-12">⚙️ PANEL DE ADMINISTRADOR</CardTitle>
                      <CardDescription className="text-neutral-10">
                        Gestionar filiales, usuarios y roles del sistema
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleAdminPanel}
                    size="lg"
                    className="bg-accent-9 hover:bg-accent-10 text-white shadow-md"
                  >
                    Entrar
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Controles: Toggle + Vista */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-12 mb-1">Mis Filiales</h2>
              <p className="text-sm text-neutral-10">
                Selecciona una filial para comenzar a trabajar
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Toggle mostrar inactivas */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-6 text-accent-9 focus:ring-accent-9"
                />
                <span className="text-sm text-neutral-11">Mostrar filiales inactivas</span>
              </label>

              {/* Selector de vista */}
              <div className="flex gap-1 bg-neutral-3 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="px-3"
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mensaje si no hay filiales */}
          {filteredBranches.length === 0 && (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Building2 className="h-16 w-16 text-neutral-7" />
                <div>
                  <h3 className="text-lg font-medium text-neutral-11 mb-2">
                    No hay filiales disponibles
                  </h3>
                  <p className="text-sm text-neutral-9">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBranches.map((branch) => (
                <Card
                  key={branch.id}
                  className="hover:shadow-lg transition-all cursor-pointer hover:border-accent-6"
                  onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
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
                    {branch.roleName && (
                      <div className="mb-3">
                        <Badge variant="secondary" className="text-xs">
                          Rol: {branch.roleName}
                        </Badge>
                      </div>
                    )}
                    <Button className="w-full" variant="outline">
                      Entrar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista Lista */}
          {viewMode === 'list' && filteredBranches.length > 0 && (
            <div className="space-y-3">
              {filteredBranches.map((branch) => (
                <Card
                  key={branch.id}
                  className="hover:shadow-md transition-all cursor-pointer hover:border-accent-6"
                  onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="rounded-lg bg-accent-3 p-3">
                          <Building2 className="h-5 w-5 text-accent-9" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-neutral-12">{branch.name}</h3>
                            <span className="text-xs text-neutral-9 font-mono">{branch.code}</span>
                            <Badge variant={branch.active !== false ? 'default' : 'secondary'} className="text-xs">
                              {branch.active !== false ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-10 truncate">
                            {branch.description || 'Sin descripción'}
                          </p>
                          {branch.roleName && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Rol: {branch.roleName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline">Entrar →</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista Tabla */}
          {viewMode === 'table' && filteredBranches.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-3 border-b border-neutral-6">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-11">Filial</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-11">Código</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-11">Rol</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-11">Estado</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-neutral-11">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-5">
                    {filteredBranches.map((branch) => (
                      <tr
                        key={branch.id}
                        className="hover:bg-neutral-2 transition-colors cursor-pointer"
                        onClick={() => handleSelectBranch(branch.id, branch.roleId)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded bg-accent-3 p-2">
                              <Building2 className="h-4 w-4 text-accent-9" />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-12">{branch.name}</div>
                              <div className="text-sm text-neutral-9 truncate max-w-xs">
                                {branch.description || 'Sin descripción'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-neutral-10">{branch.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          {branch.roleName ? (
                            <Badge variant="secondary">{branch.roleName}</Badge>
                          ) : (
                            <span className="text-sm text-neutral-8">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={branch.active !== false ? 'default' : 'secondary'}>
                            {branch.active !== false ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline">Entrar</Button>
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
