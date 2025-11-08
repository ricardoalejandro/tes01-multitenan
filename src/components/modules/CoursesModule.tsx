'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Course {
  id: string;
  name: string;
  description: string;
  themes: Array<{ title: string; orderIndex: number }>;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CoursesModule({ branchId }: { branchId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    themes: ['']
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadCourses();
  }, [branchId]);

  useEffect(() => {
    loadCourses();
  }, [page, pageSize, search]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await api.getCourses(branchId, page, pageSize, search);
      
      if (response.data) {
        setCourses(response.data);
      } else {
        setCourses([]);
      }
      
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      toast.error('Error al cargar cursos', { duration: 1500 });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const themesData = formData.themes.filter(t => t.trim()).map((title, idx) => ({
        title,
        orderIndex: idx + 1
      }));

      if (editingCourse) {
        await api.updateCourse(editingCourse.id, { ...formData, branchId, themes: themesData });
        toast.success('Curso actualizado', { duration: 1500 });
      } else {
        await api.createCourse({ ...formData, branchId, themes: themesData });
        toast.success('Curso creado', { duration: 1500 });
      }
      setIsDialogOpen(false);
      resetForm();
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar', { duration: 1500 });
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      themes: course.themes.length > 0 ? course.themes.map(t => t.title) : ['']
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este curso definitivamente? Esta acción marcará el registro como eliminado y no se mostrará en el sistema.')) return;
    try {
      await api.deleteCourse(id);
      toast.success('Curso eliminado', { duration: 1500 });
      loadCourses();
    } catch (error) {
      toast.error('Error al eliminar', { duration: 1500 });
    }
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({ name: '', description: '', themes: [''] });
  };

  const addTheme = () => {
    setFormData({ ...formData, themes: [...formData.themes, ''] });
  };

  const removeTheme = (index: number) => {
    setFormData({ ...formData, themes: formData.themes.filter((_, i) => i !== index) });
  };

  const updateTheme = (index: number, value: string) => {
    const newThemes = [...formData.themes];
    newThemes[index] = value;
    setFormData({ ...formData, themes: newThemes });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-11">
            Cursos
          </h1>
          <p className="text-neutral-9 mt-1">Gestión de cursos y temas</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-accent-9 hover:bg-accent-10 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Curso
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
        <Input
          placeholder="Buscar curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-4">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">No se encontraron cursos</div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead># Temas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell className="max-w-md truncate">{course.description || '-'}</TableCell>
                  <TableCell>{course.themes?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(course)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(course.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </div>

      <ResponsiveDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        title={`${editingCourse ? 'Editar' : 'Nuevo'} Curso`}
      >
          <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Nombre del Curso</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Temas</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addTheme}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar Tema
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.themes.map((theme, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={theme}
                          onChange={(e) => updateTheme(index, e.target.value)}
                          placeholder={`Tema ${index + 1}`}
                        />
                        {formData.themes.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeTheme(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
                  {editingCourse ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
          </form>
      </ResponsiveDialog>
    </div>
  );
}
