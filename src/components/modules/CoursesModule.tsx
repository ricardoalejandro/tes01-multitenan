'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { CourseCardsView, CourseCompactView, CourseListView } from './CourseViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import CourseTopicsEditor from './CourseTopicsEditor';

interface CourseTopic {
  id?: string;
  orderIndex: number;
  title: string;
  description: string;
  _status?: 'new' | 'modified' | 'deleted';
}

interface Course {
  id: string;
  name: string;
  description: string;
  themes: CourseTopic[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = 'cards' | 'compact' | 'list';

export default function CoursesModule({ branchId }: { branchId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    themes: CourseTopic[];
  }>({
    name: '',
    description: '',
    themes: []
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

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadCourses();
  }, [page, pageSize, debouncedSearch]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await api.getCourses(branchId, page, pageSize, debouncedSearch);
      
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
      const themesData = formData.themes
        .filter(t => t.title.trim())
        .map((theme, idx) => ({
          title: theme.title,
          description: theme.description || '',
          orderIndex: idx + 1
        }));

      if (editingCourse) {
        await api.updateCourse(editingCourse.id, { 
          name: formData.name,
          description: formData.description,
          branchId, 
          themes: themesData 
        });
        toast.success('Curso actualizado', { duration: 1500 });
      } else {
        await api.createCourse({ 
          name: formData.name,
          description: formData.description,
          branchId, 
          themes: themesData 
        });
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
      themes: course.themes.length > 0 
        ? course.themes.map((t, idx) => ({
            id: t.id,
            orderIndex: t.orderIndex || idx + 1,
            title: t.title,
            description: t.description || '',
          }))
        : []
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
    setFormData({ name: '', description: '', themes: [] });
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none bg-neutral-2 pb-6 space-y-4">
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

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-9 h-5 w-5" />
            <Input
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* VIEW MODE SELECTOR */}
          <div className="flex border border-neutral-4 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-x border-neutral-4 ${
                viewMode === 'compact' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Compacta
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-accent-9 text-white' 
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SCROLLEABLE */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-4">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9 mx-auto"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-neutral-10">No se encontraron cursos</div>
        ) : (
          <>
          {/* CONDITIONAL VIEW RENDERING */}
          {viewMode === 'cards' && (
            <CourseCardsView 
              courses={courses}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          {viewMode === 'compact' && (
            <CourseCompactView 
              courses={courses}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          {viewMode === 'list' && (
            <CourseListView 
              courses={courses}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
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
                
                {/* Course Topics Editor with Import/Export */}
                <CourseTopicsEditor
                  courseId={editingCourse?.id}
                  initialTopics={formData.themes}
                  onChange={(topics) => setFormData({ ...formData, themes: topics })}
                />
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
