'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Users, Shield, Mail, FileStack, Calendar, Layers, MapPin, Wand2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tecla Escape = botón Volver
  useEscapeKey(() => router.push('/dashboard'));

  useEffect(() => {
    // Verificar que el usuario es admin
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        console.log('❌ No user in localStorage, redirecting to login');
        router.replace('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userStr);
        console.log('👤 User data:', user);
        console.log('🔐 UserType:', user.userType);
        
        if (user.userType !== 'admin') {
          console.log('❌ User is not admin, redirecting to dashboard');
          router.replace('/dashboard');
          return;
        }
        
        console.log('✅ User is authorized');
        setIsAuthorized(true);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

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

  const handleBack = () => {
    router.push('/dashboard');
  };

  const modules = [
    {
      id: 'branches',
      title: 'Gestión de Filiales',
      description: 'Crear, editar y administrar sucursales',
      icon: Building2,
      path: '/admin/branches',
    },
    {
      id: 'users',
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios, roles y permisos',
      icon: Users,
      path: '/admin/users',
    },
    {
      id: 'roles',
      title: 'Gestión de Roles',
      description: 'Configurar roles y permisos por módulo',
      icon: Shield,
      path: '/admin/roles',
    },
    {
      id: 'smtp',
      title: 'Configuración SMTP',
      description: 'Configurar servidor de correo electrónico',
      icon: Mail,
      path: '/admin/smtp',
    },
    {
      id: 'templates',
      title: 'Plantillas de Cursos',
      description: 'Crear y gestionar plantillas de cursos reutilizables',
      icon: FileStack,
      path: '/admin/templates',
    },
    {
      id: 'holidays',
      title: 'Feriados',
      description: 'Configurar feriados nacionales y provinciales',
      icon: Calendar,
      path: '/admin/holidays',
    },
    {
      id: 'levels',
      title: 'Niveles',
      description: 'Gestionar niveles organizacionales',
      icon: Layers,
      path: '/admin/levels',
    },
    {
      id: 'locations',
      title: 'Ubicaciones',
      description: 'Gestionar departamentos, provincias y distritos',
      icon: MapPin,
      path: '/admin/locations',
    },
    {
      id: 'test-data',
      title: 'Datos de Prueba',
      description: 'Generar y gestionar datos de prueba realistas',
      icon: Wand2,
      path: '/admin/test-data',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-lg border border-gray-200">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Panel de Administrador</h1>
            <p className="text-gray-500 mt-1">
              Gestión de filiales, usuarios y configuración del sistema
            </p>
          </div>
          <Button variant="outline" onClick={handleBack} className="border-gray-200">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* Modules Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card
                key={module.id}
                className="bg-white border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                onClick={() => router.push(module.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-gray-100 p-3 group-hover:bg-accent-2 transition-colors">
                        <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-accent-9" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-accent-9 transition-colors">
                          {module.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-accent-9 group-hover:text-white group-hover:border-accent-9 transition-colors"
                    >
                      Entrar →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info adicional */}
        <div className="max-w-5xl mx-auto mt-8">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gray-100 p-2">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Panel de Administración del Sistema
                  </h3>
                  <p className="text-sm text-gray-500">
                    Desde aquí puedes gestionar todos los aspectos críticos del sistema: crear y configurar
                    filiales, administrar usuarios y sus permisos, definir roles personalizados, y configurar
                    el servidor SMTP para el envío de correos electrónicos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
