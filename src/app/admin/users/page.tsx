'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { UsersModule } from '@/components/modules/UsersModule';

export default function UsersManagementPage() {
  const router = useRouter();
  
  const handleBack = () => router.push('/admin');
  
  // Tecla Escape = botón Volver
  useEscapeKey(handleBack);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.userType !== 'admin') {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-11">Gestión de Usuarios</h1>
              <p className="text-sm text-neutral-9">Administrar usuarios y sus asignaciones</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <UsersModule />
      </div>
    </div>
  );
}
