'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, LogOut, Settings, GraduationCap } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.me();
        setUser(data.user);
        setBranches(data.branches || []);
      } catch (error) {
        toast.error('Error al cargar datos');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  const handleSelectBranch = (branchId: string) => {
    localStorage.setItem('selected_branch', branchId);
    router.push(`/workspace?branchId=${branchId}`);
  };

  const handleAdminPanel = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-accent-2 to-accent-secondary-2">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent-9 p-3">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Sistema Académico Multi-Tenant</h1>
              <p className="text-neutral-10">
                Bienvenido, <span className="font-semibold">{user?.username}</span> (
                {user?.role})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Seleccione una Sucursal</h2>
            <p className="text-neutral-10">
              Elija la sucursal con la que desea trabajar
            </p>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {branches.map((branch) => (
              <Card
                key={branch.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectBranch(branch.id)}
              >
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
                  <Button className="w-full">Seleccionar</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Admin Panel (Only for superadmin) */}
          {user?.role === 'superadmin' && (
            <Card className="bg-gradient-to-r from-accent-secondary-2 to-accent-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent-secondary-9 p-3">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Panel de Administrador</CardTitle>
                    <CardDescription>
                      Gestión de sucursales, usuarios y configuración global
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleAdminPanel}
                  variant="secondary"
                  className="w-full md:w-auto"
                >
                  Ir al Panel de Administrador
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
