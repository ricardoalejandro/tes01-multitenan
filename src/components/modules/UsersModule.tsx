'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, UserPlus, Building2, Shield } from 'lucide-react';
import { UserFormDialog } from './UserFormDialog';
import { UserBranchRolesDialog } from './UserBranchRolesDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  userType: 'admin' | 'normal';
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Role {
  id: string;
  name: string;
}

interface UserBranchRole {
  branchId: string;
  branchName: string;
  roleId: string;
  roleName: string;
}

export function UsersModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBranchRoles, setShowBranchRoles] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userBranchRoles, setUserBranchRoles] = useState<UserBranchRole[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes, rolesRes] = await Promise.all([
        api.getUsers({ search, page: 1, limit: 100 }),
        api.getBranches(),
        api.getRoles(),
      ]);
      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    loadData();
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await api.deleteUser(id);
      toast.success('Usuario eliminado');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const handleManageBranchRoles = async (user: User) => {
    try {
      const res = await api.getUserBranches(user.id);
      setUserBranchRoles(res.data || []);
      setSelectedUser(user);
      setShowBranchRoles(true);
    } catch (error) {
      toast.error('Error al cargar asignaciones');
    }
  };

  const handleSaveUser = async (data: any) => {
    try {
      if (selectedUser) {
        await api.updateUser(selectedUser.id, data);
        toast.success('Usuario actualizado');
      } else {
        await api.createUser(data);
        toast.success('Usuario creado');
      }
      setShowForm(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-9 mx-auto"></div>
          <p className="mt-4 text-neutral-10">Cargando usuarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl text-neutral-12">Gestión de Usuarios</CardTitle>
            <Button onClick={handleCreate} className="bg-accent-9 hover:bg-accent-10">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-9" />
              <Input
                placeholder="Buscar por usuario, nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="outline">
              Buscar
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-9">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.userType === 'admin' ? 'default' : 'secondary'}>
                          {user.userType === 'admin' ? 'Administrador' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.userType === 'normal' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageBranchRoles(user)}
                              title="Asignar Sedes y Roles"
                            >
                              <Building2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700"
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

      <UserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <UserBranchRolesDialog
        open={showBranchRoles}
        onOpenChange={setShowBranchRoles}
        user={selectedUser}
        branches={branches}
        roles={roles}
        currentAssignments={userBranchRoles}
        onSave={() => {
          setShowBranchRoles(false);
          toast.success('Asignaciones guardadas');
        }}
      />
    </>
  );
}

export default UsersModule;
