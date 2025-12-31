'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, Loader2, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import axios from 'axios';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error('Token inválido o no proporcionado');
      setIsValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  const validateToken = async (token: string) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/auth/verify-token/${token}`);
      if (res.data.valid) {
        setIsValid(true);
        setUsername(res.data.username || '');
      } else {
        toast.error('El enlace ha expirado o es inválido');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al validar el token');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsResetting(true);

    try {
      await axios.post('http://localhost:3000/api/auth/reset-password', {
        token,
        newPassword,
      });

      toast.success('Contraseña restablecida exitosamente');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al restablecer contraseña');
    } finally {
      setIsResetting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-2 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-accent-9 mb-4" />
            <p className="text-neutral-10">Validando enlace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-2 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-11">Enlace Inválido</CardTitle>
            <CardDescription>
              El enlace de recuperación ha expirado o es inválido. 
              Por favor solicita un nuevo enlace desde la página de inicio de sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-accent-9 hover:bg-accent-10 text-white"
              onClick={() => router.push('/login')}
            >
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-2 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-accent-9 p-3">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-neutral-11">Restablecer Contraseña</CardTitle>
          <CardDescription>
            {username && `Hola ${username}, `}
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isResetting}
                minLength={8}
              />
              <p className="text-xs text-neutral-10">
                La contraseña debe tener al menos 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isResetting}
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent-9 hover:bg-accent-10 text-white"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Restablecer Contraseña
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                className="text-sm text-neutral-10"
                onClick={() => router.push('/login')}
                type="button"
              >
                Volver al login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-neutral-2">
        <Loader2 className="h-12 w-12 animate-spin text-accent-9" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
