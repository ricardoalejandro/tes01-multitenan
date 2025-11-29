'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { RoleFormDialog } from './RoleFormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
}

export function RolesModule() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await api.getRoles();
      setRoles(res.data || []);
    } catch (error) {
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setShowForm(true);
  };

  const handleEdit = (role: Role) => {
    if (role.isSystemRole) {
      toast.error('No se pueden editar roles del sistema');
      return;
    }
    setSelectedRole(role);
    setShowForm(true);
  };

  const handleDelete = async (id: string, isSystemRole: boolean) => {
    if (isSystemRole) {
      toast.error('No se pueden eliminar roles del sistema');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este rol?')) return;

    try {
      await api.deleteRole(id);
      toast.success('Rol eliminado');
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar rol');
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedRole) {
        await api.updateRole(selectedRole.id, data);
        toast.success('Rol actualizado');
      } else {
        await api.createRole(data);
        toast.success('Rol creado');
      }
      setShowForm(false);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar rol');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-9 mx-auto"></div>
          <p className="mt-4 text-neutral-10">Cargando roles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl text-neutral-12">Gestión de Roles</CardTitle>
            <Button onClick={handleCreate} className="bg-accent-9 hover:bg-accent-10">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-neutral-9">
                      No hay roles configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-accent-9" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={role.isSystemRole ? 'default' : 'secondary'}>
                          {role.isSystemRole ? 'Sistema' : 'Personalizado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(role)}
                            disabled={role.isSystemRole}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDelete(role.id, role.isSystemRole)}
                            disabled={role.isSystemRole}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        role={selectedRole}
        onSave={handleSave}
      />
    </>
  );
}

export default RolesModule;
