'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { GraduationCap, Loader2, Mail } from 'lucide-react';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingRecovery, setSendingRecovery] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('user_branches', JSON.stringify(data.branches || []));
      toast.success('¡Bienvenido!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recoveryEmail.trim()) {
      toast.error('Por favor ingrese su email');
      return;
    }

    setSendingRecovery(true);

    try {
      await axios.post('http://localhost:3000/api/auth/forgot-password', {
        email: recoveryEmail,
      });
      toast.success('Se ha enviado un email con instrucciones para recuperar su contraseña');
      setShowForgotPassword(false);
      setRecoveryEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar email de recuperación');
    } finally {
      setSendingRecovery(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border border-gray-200 shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-accent-9 p-4">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">Sistema Académico</CardTitle>
          <CardDescription className="text-gray-500">Gestión Multi-Tenant para Instituciones</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 border-gray-200"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-10 bg-accent-9 hover:bg-accent-10 text-white font-medium" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <div className="text-center pt-2">
              <Button 
                variant="link" 
                className="text-sm text-gray-500 hover:text-accent-9"
                type="button"
                onClick={() => setShowForgotPassword(true)}
              >
                ¿Olvidó su contraseña?
              </Button>
            </div>
          </form>

          <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent-9" />
                  Recuperar Contraseña
                </DialogTitle>
                <DialogDescription>
                  Ingrese su email y le enviaremos instrucciones para restablecer su contraseña.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recoveryEmail">Email de Recuperación</Label>
                  <Input
                    id="recoveryEmail"
                    type="email"
                    placeholder="su-email@ejemplo.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    disabled={sendingRecovery}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={sendingRecovery}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={sendingRecovery}>
                    {sendingRecovery ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Email'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
