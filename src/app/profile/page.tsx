'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Mail, AtSign, Phone, Lock, Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ChangePasswordDialog } from '@/components/modules/ChangePasswordDialog';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  userType: 'admin' | 'normal';
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleBack = () => router.push('/dashboard');
  useEscapeKey(handleBack);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.me();
      setProfile(data.user);
      setFullName(data.user.fullName || '');
      setPhone(data.user.phone || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      await api.updateUser(profile.id, { fullName, phone });
      toast.success('Perfil actualizado correctamente');
      loadProfile(); // Reload to get fresh data
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Error al actualizar el perfil';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = profile && (
    fullName !== (profile.fullName || '') ||
    phone !== (profile.phone || '')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-2 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-accent-9" />
          <p className="text-neutral-10">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-10 mb-4">No se pudo cargar el perfil</p>
          <Button onClick={handleBack}>Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-2">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
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
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Información de la Cuenta
              </CardTitle>
              <CardDescription>
                Estos datos no pueden ser modificados. Contacta al administrador si necesitas cambiarlos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-neutral-9" />
                  Usuario
                </Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-neutral-3"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-neutral-9" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  value={profile.email || 'No registrado'}
                  disabled
                  className="bg-neutral-3"
                />
              </div>

              {/* User Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Tipo de Usuario
                </Label>
                <div>
                  <Badge variant={profile.userType === 'admin' ? 'default' : 'secondary'}>
                    {profile.userType === 'admin' ? 'Administrador' : 'Usuario Normal'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Puedes actualizar tu nombre y teléfono de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  placeholder="Ingresa tu nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-neutral-9" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  placeholder="Ingresa tu número de teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={!hasChanges || saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Seguridad
              </CardTitle>
              <CardDescription>
                Gestiona la seguridad de tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cambiar contraseña</p>
                  <p className="text-sm text-neutral-9">
                    Actualiza tu contraseña regularmente para mayor seguridad.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Cambiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}
