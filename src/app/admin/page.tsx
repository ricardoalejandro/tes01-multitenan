'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Users, Shield, Mail, FileStack, Calendar, Layers, MapPin, Wand2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      title: '📍 Gestión de Filiales',
      description: 'Crear, editar y administrar sucursales',
      icon: Building2,
      path: '/admin/branches',
      color: 'from-blue-50 to-blue-100 border-blue-200',
      iconBg: 'bg-blue-500',
    },
    {
      id: 'users',
      title: '👥 Gestión de Usuarios',
      description: 'Administrar usuarios, roles y permisos',
      icon: Users,
      path: '/admin/users',
      color: 'from-green-50 to-green-100 border-green-200',
      iconBg: 'bg-green-500',
    },
    {
      id: 'roles',
      title: '🎭 Gestión de Roles',
      description: 'Configurar roles y permisos por módulo',
      icon: Shield,
      path: '/admin/roles',
      color: 'from-purple-50 to-purple-100 border-purple-200',
      iconBg: 'bg-purple-500',
    },
    {
      id: 'smtp',
      title: '📧 Configuración SMTP',
      description: 'Configurar servidor de correo electrónico',
      icon: Mail,
      path: '/admin/smtp',
      color: 'from-orange-50 to-orange-100 border-orange-200',
      iconBg: 'bg-orange-500',
    },
    {
      id: 'templates',
      title: '📚 Plantillas de Cursos',
      description: 'Crear y gestionar plantillas de cursos reutilizables',
      icon: FileStack,
      path: '/admin/templates',
      color: 'from-teal-50 to-teal-100 border-teal-200',
      iconBg: 'bg-teal-500',
    },
    {
      id: 'holidays',
      title: '📅 Feriados',
      description: 'Configurar feriados nacionales y provinciales',
      icon: Calendar,
      path: '/admin/holidays',
      color: 'from-red-50 to-red-100 border-red-200',
      iconBg: 'bg-red-500',
    },
    {
      id: 'levels',
      title: '🏢 Niveles',
      description: 'Gestionar niveles organizacionales',
      icon: Layers,
      path: '/admin/levels',
      color: 'from-indigo-50 to-indigo-100 border-indigo-200',
      iconBg: 'bg-indigo-500',
    },
    {
      id: 'locations',
      title: '🗺️ Ubicaciones',
      description: 'Gestionar departamentos, provincias y distritos',
      icon: MapPin,
      path: '/admin/locations',
      color: 'from-cyan-50 to-cyan-100 border-cyan-200',
      iconBg: 'bg-cyan-500',
    },
    {
      id: 'test-data',
      title: '🧪 Datos de Prueba',
      description: 'Generar y gestionar datos de prueba realistas',
      icon: Wand2,
      path: '/admin/test-data',
      color: 'from-pink-50 to-purple-100 border-purple-200',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-11">Panel de Administrador</h1>
            <p className="text-neutral-9 mt-1">
              Gestión de filiales, usuarios y configuración del sistema
            </p>
          </div>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* Modules Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card
                key={module.id}
                className={`bg-gradient-to-br ${module.color} border-2 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]`}
                onClick={() => router.push(module.path)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl ${module.iconBg} p-4 shadow-md`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 text-neutral-12">
                        {module.title}
                      </CardTitle>
                      <CardDescription className="text-neutral-10 text-base">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="secondary" 
                    className="w-full shadow-sm"
                  >
                    Entrar →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info adicional */}
        <div className="max-w-5xl mx-auto mt-8">
          <Card className="bg-accent-2 border border-accent-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <h3 className="font-semibold text-neutral-12 mb-2">
                    Panel de Administración del Sistema
                  </h3>
                  <p className="text-sm text-neutral-10">
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
