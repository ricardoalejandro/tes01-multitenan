'use client';

import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Trash2, Building2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserBranchRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  branches: any[];
  roles: any[];
  currentAssignments: any[];
  onSave: () => void;
}

export function UserBranchRolesDialog({
  open,
  onOpenChange,
  user,
  branches,
  roles,
  currentAssignments,
  onSave,
}: UserBranchRolesDialogProps) {
  const [assignments, setAssignments] = useState<{ branchId: string; roleId: string }[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && currentAssignments) {
      setAssignments(
        currentAssignments.map((a) => ({
          branchId: a.branchId,
          roleId: a.roleId,
        }))
      );
    }
    setNewBranch('');
    setNewRole('');
  }, [open, currentAssignments]);

  const handleAdd = () => {
    if (!newBranch || !newRole) return;
    if (assignments.some((a) => a.branchId === newBranch)) {
      toast.warning('Esta sede ya esta asignada');
      return;
    }
    setAssignments([...assignments, { branchId: newBranch, roleId: newRole }]);
    setNewBranch('');
    setNewRole('');
  };

  const handleRemove = (branchId: string) => {
    setAssignments(assignments.filter((a) => a.branchId !== branchId));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateUser(user.id, {
        fullName: user.fullName,
        branchRoles: assignments,
      });
      toast.success('Asignaciones guardadas');
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name || 'Desconocida';
  const getRoleName = (id: string) => roles.find((r) => r.id === id)?.name || 'Desconocido';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Asignar Sedes y Roles`}
      description={`Usuario: ${user?.fullName || user?.username}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent-9 hover:bg-accent-10">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Asignaciones actuales */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-10" />
            <h3 className="font-semibold text-neutral-11">Asignaciones Actuales</h3>
          </div>
          
          {assignments.length === 0 ? (
            <div className="p-4 bg-neutral-2 rounded-lg text-center">
              <p className="text-sm text-neutral-10">Sin asignaciones. El usuario no tendra acceso a ninguna sede.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.branchId}
                  className="flex items-center justify-between p-3 bg-white border border-neutral-4 rounded-lg hover:border-neutral-6 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <Building2 className="h-3 w-3 mr-1" />
                      {getBranchName(assignment.branchId)}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700">
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleName(assignment.roleId)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(assignment.branchId)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agregar nueva asignacion */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-neutral-10" />
            <h3 className="font-semibold text-neutral-11">Agregar Nueva Asignacion</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sede</Label>
              <Select value={newBranch} onValueChange={setNewBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => !assignments.some((a) => a.branchId === b.id))
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleAdd} 
            variant="secondary" 
            className="w-full" 
            disabled={!newBranch || !newRole}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Asignacion
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
