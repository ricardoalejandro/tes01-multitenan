'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Todos los campos son requeridos');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('La nueva contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas nuevas no coinciden');
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(currentPassword, newPassword);
            toast.success('Contraseña actualizada correctamente');
            handleClose();
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Error al cambiar la contraseña';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md" onClose={handleClose}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Cambiar Contraseña
                    </DialogTitle>
                    <DialogDescription>
                        Ingresa tu contraseña actual y la nueva contraseña para actualizar tus credenciales.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Contraseña actual */}
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña actual</Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña actual"
                                className="pr-10"
                                disabled={loading}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowCurrent(!showCurrent)}
                                disabled={loading}
                            >
                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Nueva contraseña */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                className="pr-10"
                                disabled={loading}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowNew(!showNew)}
                                disabled={loading}
                            >
                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Confirmar nueva contraseña */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la nueva contraseña"
                                className="pr-10"
                                disabled={loading}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowConfirm(!showConfirm)}
                                disabled={loading}
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cambiar Contraseña
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
