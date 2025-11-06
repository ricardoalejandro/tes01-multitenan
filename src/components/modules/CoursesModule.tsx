'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Course {
  id: string;
  name: string;
  description: string;
  themes: Array<{ title: string; orderIndex: number }>;
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

  useEffect(() => {
    loadCourses();
  }, [branchId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/courses?branchId=${branchId}`);
      setCourses(data || []);
    } catch (error) {
      toast.error('Error al cargar cursos');
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
        await api.put(`/courses/${editingCourse.id}`, { ...formData, branchId, themes: themesData });
        toast.success('Curso actualizado');
      } else {
        await api.post('/courses', { ...formData, branchId, themes: themesData });
        toast.success('Curso creado');
      }
      setIsDialogOpen(false);
      resetForm();
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
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
    if (!confirm('¿Está seguro de eliminar este curso?')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Curso eliminado');
      loadCourses();
    } catch (error) {
      toast.error('Error al eliminar');
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

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-9 to-accent-secondary-9 bg-clip-text text-transparent">
            Cursos
          </h1>
          <p className="text-neutral-10 mt-1">Gestión de cursos y temas</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-gradient-to-r from-accent-9 to-accent-10 hover:from-accent-10 hover:to-accent-11 shadow-lg"
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

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-6">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">No se encontraron cursos</div>
        ) : (
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
              {filteredCourses.map((course) => (
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
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Editar' : 'Nuevo'} Curso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody>
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
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-accent-9 to-accent-10">
                {editingCourse ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
