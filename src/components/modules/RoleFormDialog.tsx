'use client';

import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const MODULES = [
  { key: 'students', label: 'Probacionistas' },
  { key: 'courses', label: 'Cursos' },
  { key: 'instructors', label: 'Instructores' },
  { key: 'groups', label: 'Grupos' },
  { key: 'attendance', label: 'Asistencias' },
];

const PERMISSIONS = [
  { key: 'canView', label: 'Ver' },
  { key: 'canEdit', label: 'Editar' },
];

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: any;
  onSave: (data: any) => void;
}

export function RoleFormDialog({ open, onOpenChange, role, onSave }: RoleFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);

  // Inicializar permisos vacíos
  const initEmptyPermissions = () => {
    const defaultPerms: Record<string, Record<string, boolean>> = {};
    MODULES.forEach(mod => {
      defaultPerms[mod.key] = {};
      PERMISSIONS.forEach(perm => {
        defaultPerms[mod.key][perm.key] = false;
      });
    });
    return defaultPerms;
  };

  useEffect(() => {
    if (!open) return;

    if (role) {
      setName(role.name || '');
      setDescription(role.description || '');
      // Cargar permisos del rol desde la API
      loadRolePermissions(role.id);
    } else {
      setName('');
      setDescription('');
      setPermissions(initEmptyPermissions());
    }
  }, [role, open]);

  const loadRolePermissions = async (roleId: string) => {
    try {
      setLoading(true);
      const response = await api.getRolePermissions(roleId);
      const permsData = response.data || [];

      // Convertir array de permisos a objeto
      const permsObj: Record<string, Record<string, boolean>> = initEmptyPermissions();

      permsData.forEach((perm: any) => {
        if (permsObj[perm.module]) {
          permsObj[perm.module] = {
            canView: perm.canView || false,
            canEdit: perm.canEdit || false,
          };
        }
      });

      setPermissions(permsObj);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setPermissions(initEmptyPermissions());
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: string, perm: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [perm]: checked,
      },
    }));
  };

  // Seleccionar/deseleccionar toda una columna (tipo de permiso)
  const handleSelectAllColumn = (permKey: string, checked: boolean) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      MODULES.forEach(mod => {
        newPerms[mod.key] = {
          ...newPerms[mod.key],
          [permKey]: checked,
        };
      });
      return newPerms;
    });
  };

  // Verificar si todos los módulos tienen este permiso
  const isAllColumnSelected = (permKey: string): boolean => {
    return MODULES.every(mod => permissions[mod.key]?.[permKey] === true);
  };

  // Verificar si algunos (pero no todos) tienen este permiso
  const isSomeColumnSelected = (permKey: string): boolean => {
    const selected = MODULES.filter(mod => permissions[mod.key]?.[permKey] === true).length;
    return selected > 0 && selected < MODULES.length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permissionsArray = Object.entries(permissions).map(([module, perms]: any) => ({
      module,
      canView: perms.canView || false,
      canCreate: false, // No se usa
      canEdit: perms.canEdit || false,
      canDelete: false, // No se usa
    }));
    onSave({ name, description, permissions: permissionsArray });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={role ? 'Editar Rol' : 'Nuevo Rol'}
      description="Define los permisos de acceso a cada módulo del sistema"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" className="bg-accent-9 hover:bg-accent-10" disabled={loading}>
            {role ? 'Actualizar' : 'Crear Rol'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Rol *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Coordinador"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-neutral-11 text-lg">Permisos por Módulo</h3>
          <p className="text-sm text-neutral-10">
            Selecciona qué acciones puede realizar este rol en cada módulo.
          </p>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-9"></div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-neutral-2 to-neutral-3">
                    <tr>
                      <th className="text-left p-4 font-semibold text-sm text-neutral-12 min-w-[150px]">
                        Módulo
                      </th>
                      {PERMISSIONS.map(p => (
                        <th key={p.key} className="text-center p-4 font-semibold text-sm text-neutral-11 min-w-[100px]">
                          <div className="flex flex-col items-center gap-2">
                            <span>{p.label}</span>
                            <Checkbox
                              checked={isAllColumnSelected(p.key)}
                              className={cn(
                                isSomeColumnSelected(p.key) && !isAllColumnSelected(p.key) && "opacity-60"
                              )}
                              onCheckedChange={(checked) => handleSelectAllColumn(p.key, checked as boolean)}
                              title={`Seleccionar todos para ${p.label}`}
                            />
                            <span className="text-xs text-neutral-9 font-normal">Todos</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {MODULES.map((module, idx) => (
                      <tr
                        key={module.key}
                        className={cn(
                          "border-t hover:bg-neutral-1 transition-colors",
                          idx % 2 === 0 && "bg-neutral-1/30"
                        )}
                      >
                        <td className="p-4 font-medium text-neutral-12">{module.label}</td>
                        {PERMISSIONS.map(perm => (
                          <td key={perm.key} className="text-center p-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={permissions[module.key]?.[perm.key] || false}
                                onCheckedChange={(checked) => handlePermissionChange(module.key, perm.key, checked as boolean)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
