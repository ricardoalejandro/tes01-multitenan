'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CourseTemplatesModule from '@/components/modules/CourseTemplatesModule';

export default function TemplatesPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        router.replace('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userStr);
        
        // Solo admin y superadmin pueden acceder
        if (user.userType !== 'admin' && user.userType !== 'superadmin') {
          router.replace('/dashboard');
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
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

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-11">
              📚 Plantillas de Cursos
            </h1>
            <p className="text-neutral-9 mt-1">
              Crea y gestiona plantillas de cursos que pueden ser reutilizadas en todas las filiales
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* Module Content */}
        <CourseTemplatesModule />
      </div>
    </div>
  );
}
