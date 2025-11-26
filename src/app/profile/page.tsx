'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-xl shadow-sm border border-neutral-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-9 p-3">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-11">Mi Perfil</h1>
              <p className="text-sm text-neutral-9">Administra tu información personal</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>🚧 Página en Desarrollo</CardTitle>
            <CardDescription>
              Esta funcionalidad está siendo implementada y estará disponible próximamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-10 mb-4">
              Funcionalidades previstas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-neutral-10">
              <li>Ver y editar nombre completo</li>
              <li>Ver y editar teléfono</li>
              <li>Ver email (no editable)</li>
              <li>Ver username (no editable)</li>
              <li>Solicitar cambio de contraseña por email</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
