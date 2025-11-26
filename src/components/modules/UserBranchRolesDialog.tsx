'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    if (open && currentAssignments) {
      setAssignments(
        currentAssignments.map((a) => ({
          branchId: a.branchId,
          roleId: a.roleId,
        }))
      );
    }
  }, [open, currentAssignments]);

  const handleAdd = () => {
    if (!newBranch || !newRole) return;
    if (assignments.some((a) => a.branchId === newBranch)) {
      alert('Esta sede ya está asignada');
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
      await api.updateUser(user.id, {
        fullName: user.fullName,
        branchRoles: assignments,
      });
      onSave();
    } catch (error) {
      alert('Error al guardar asignaciones');
    }
  };

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name || 'Desconocida';
  const getRoleName = (id: string) => roles.find((r) => r.id === id)?.name || 'Desconocido';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Sedes y Roles - {user?.username}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-neutral-11">Asignaciones Actuales</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-neutral-9">Sin asignaciones</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.branchId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex gap-2">
                      <Badge variant="secondary">{getBranchName(assignment.branchId)}</Badge>
                      <Badge>{getRoleName(assignment.roleId)}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(assignment.branchId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-11">Agregar Nueva Asignación</h3>
            <div className="grid grid-cols-2 gap-4">
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

            <Button onClick={handleAdd} variant="outline" className="w-full" disabled={!newBranch || !newRole}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Asignación
            </Button>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-accent-9 hover:bg-accent-10">
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
