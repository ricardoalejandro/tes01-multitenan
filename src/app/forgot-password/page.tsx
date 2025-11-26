'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Key } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-2 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="rounded-full bg-accent-9 p-4 inline-block mb-4">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-11 mb-2">Recuperar Contraseña</h1>
          <p className="text-neutral-9">
            Ingresa tu correo electrónico para recibir instrucciones
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🚧 Funcionalidad en Desarrollo</CardTitle>
            <CardDescription>
              El sistema de recuperación de contraseña está siendo implementado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-10 mb-4">
              Funcionalidades previstas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-neutral-10 mb-6">
              <li>Solicitar reseteo por email</li>
              <li>Envío de link temporal (válido 1 hora)</li>
              <li>Verificación de token</li>
              <li>Cambio seguro de contraseña</li>
            </ul>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
