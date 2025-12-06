'use client';

import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Key } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSave: (data: any) => void;
}

export function UserFormDialog({ open, onOpenChange, user, onSave }: UserFormDialogProps) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    userType: 'normal' as 'admin' | 'normal',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        userType: user.userType || 'normal',
      });
      setResetPassword(false);
      setNewPassword('');
    } else {
      setFormData({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        userType: 'normal',
      });
      setResetPassword(false);
      setNewPassword('');
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      userType: formData.userType,
    };

    if (!user) {
      // Nuevo usuario
      data.username = formData.username;
      data.password = formData.password;
    } else if (resetPassword && newPassword) {
      // Admin reseteando contraseña
      data.password = newPassword;
    }

    onSave(data);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
      description={user ? 'Modifica los datos del usuario' : 'Completa los datos para crear un nuevo usuario'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="user-form"
            className="bg-accent-9 hover:bg-accent-10"
          >
            {user ? 'Actualizar' : 'Crear Usuario'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Usuario *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={!!user}
              placeholder="Ej: jperez"
              className={user ? 'bg-neutral-2' : ''}
            />
            {user && <p className="text-xs text-neutral-10">El nombre de usuario no se puede cambiar</p>}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              placeholder="Ej: Juan Pérez García"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="ejemplo@correo.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="999999999"
            />
          </div>

          {/* User Type */}
          <div className="space-y-2">
            <Label htmlFor="userType">Tipo de Usuario *</Label>
            <Select
              value={formData.userType}
              onValueChange={(value: 'admin' | 'normal') => setFormData({ ...formData, userType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal (requiere asignación de sedes/roles)</SelectItem>
                <SelectItem value="admin">Administrador (acceso total)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password - Solo para nuevo usuario */}
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset Password Section - Solo para editar usuario */}
        {user && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-neutral-10" />
              <h3 className="font-semibold text-neutral-11">Restablecer Contraseña</h3>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="resetPassword"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-6"
              />
              <label htmlFor="resetPassword" className="text-sm text-neutral-11">
                Asignar nueva contraseña al usuario
              </label>
            </div>

            {resetPassword && (
              <div className="space-y-2 pl-7">
                <Label htmlFor="newPassword">Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required={resetPassword}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-600">El usuario deberá cambiar esta contraseña en su próximo inicio de sesión</p>
              </div>
            )}
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
