'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, X, BookOpen, Eye, FileDown, ChevronDown } from 'lucide-react';
import { CourseCardsView, CourseCompactView, CourseListView } from './CourseViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import CourseTopicsEditor from './CourseTopicsEditor';

interface CourseTopic {
  id?: string;
  orderIndex: number;
  title: string;
  description?: string;
  _status?: 'new' | 'modified' | 'deleted';
}

interface Course {
  id: string;
  name: string;
  description: string;
  themes?: CourseTopic[];
}

interface CourseTemplate {
  id: string;
  name: string;
  description?: string;
  topicsCount: number;
  topics?: CourseTopic[];
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
  const [viewMode, setViewMode] = useState<ViewMode>('cards'); // Default to cards for mobile
  const [isMobile, setIsMobile] = useState(false);
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

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Force cards view on mobile
      if (mobile && viewMode === 'list') {
        setViewMode('cards');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  // Template states
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CourseTemplate | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await api.axiosInstance.get('/course-templates');
        setTemplates(response.data.data || []);
      } catch (error) {
        // Silently fail - templates are optional
        setTemplates([]);
      }
    };
    loadTemplates();
  }, []);

  const loadCourses = useCallback(async () => {
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
  }, [branchId, page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

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
  }, [loadCourses]);

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
      themes: (course.themes && course.themes.length > 0)
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
    setSelectedTemplate(null);
    setShowTemplateSelector(false);
  };

  // Apply template to form
  const applyTemplate = async (template: CourseTemplate) => {
    try {
      // Fetch full template with topics
      const response = await api.axiosInstance.get(`/course-templates/${template.id}`);
      const fullTemplate = response.data;

      // Si es curso existente, confirmar reemplazo
      if (editingCourse && formData.themes.length > 0) {
        const confirmed = confirm(
          `¿Deseas reemplazar los ${formData.themes.length} temas actuales con los ${fullTemplate.topics?.length || 0} temas de la plantilla "${template.name}"?`
        );
        if (!confirmed) return;
      }

      setFormData({
        ...formData,
        name: formData.name || fullTemplate.name, // Keep name if already set
        description: formData.description || fullTemplate.description || '',
        themes: (fullTemplate.topics || []).map((t: CourseTopic, idx: number) => ({
          orderIndex: idx + 1,
          title: t.title,
          description: t.description || '',
          _status: 'new' as const,
        })),
      });

      setSelectedTemplate(template);
      setShowTemplateSelector(false);

      if (editingCourse) {
        toast.success(`Temas reemplazados con plantilla "${template.name}" (${fullTemplate.topics?.length || 0} temas). Guarda para aplicar cambios.`);
      } else {
        toast.success(`Plantilla "${template.name}" aplicada con ${fullTemplate.topics?.length || 0} temas`);
      }
    } catch (error) {
      toast.error('Error al cargar plantilla');
    }
  };

  // Preview template
  const handlePreviewTemplate = async (template: CourseTemplate) => {
    try {
      const response = await api.axiosInstance.get(`/course-templates/${template.id}`);
      setPreviewTemplate(response.data);
    } catch (error) {
      toast.error('Error al cargar vista previa');
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* FAB - Floating Action Button for Mobile */}
      <button
        onClick={() => { resetForm(); setIsDialogOpen(true); }}
        className="fixed right-4 bottom-20 z-50 md:hidden bg-accent-9 hover:bg-accent-10 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nuevo Curso"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* HEADER FIJO - Siempre visible */}
      <div className="flex-none pb-4 md:pb-5 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Gestión de Cursos
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 hidden sm:block">Administra cursos y sus temas</p>
          </div>
          {/* Desktop button - hidden on mobile (using FAB instead) */}
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-accent-9 hover:bg-accent-10 text-white hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Curso
          </Button>
        </div>

        <div className="flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 h-10"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* VIEW MODE SELECTOR - Mobile version (only Cards and Compact) */}
          <div className="flex md:hidden border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'cards'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${viewMode === 'compact'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Compacta
            </button>
          </div>

          {/* VIEW MODE SELECTOR - Desktop version (includes List) */}
          <div className="hidden md:flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'cards'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-x border-gray-200 ${viewMode === 'compact'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Compacta
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SCROLLEABLE */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-3">Cargando cursos...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron cursos</div>
          ) : (
            <>
              {/* CONDITIONAL VIEW RENDERING */}
              {viewMode === 'cards' && (
                <CourseCardsView
                  courses={courses}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'compact' && (
                <CourseCompactView
                  courses={courses}
                  onView={handleEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              {viewMode === 'list' && (
                <CourseListView
                  courses={courses}
                  onView={handleEdit}
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
        defaultMaximized={isMobile}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECCIÓN 1: Plantilla (Opcional) */}
          {templates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-9 text-white text-xs flex items-center justify-center">1</span>
                {editingCourse ? 'Importar desde Plantilla' : 'Usar Plantilla'} (Opcional)
              </h3>
              <div className="p-3 bg-gradient-to-r from-accent-2 to-accent-3 rounded-lg border border-accent-4">
                {editingCourse && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2">
                    ⚠️ Importar reemplazará los temas actuales
                  </p>
                )}

                {!showTemplateSelector ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowTemplateSelector(true)}
                      className="flex-1 justify-between bg-white h-11"
                    >
                      <span className="text-neutral-9 truncate">
                        {selectedTemplate
                          ? `✓ ${selectedTemplate.name}`
                          : 'Seleccionar plantilla...'
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    </Button>
                    {selectedTemplate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTemplate(null);
                          if (!editingCourse) {
                            setFormData({ ...formData, themes: [] });
                          }
                        }}
                        className="text-red-600 h-11 w-11"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-lg p-2 border">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-2 hover:bg-neutral-2 rounded-lg cursor-pointer active:bg-neutral-3"
                          onClick={() => applyTemplate(template)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{template.name}</div>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs">{template.topicsCount} temas</Badge>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplateSelector(false)}
                      className="w-full h-10"
                    >
                      Cerrar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: Información del Curso */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-9 text-white text-xs flex items-center justify-center">{templates.length > 0 ? '2' : '1'}</span>
              Información del Curso
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre del Curso *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Filosofía Básica I"
                  required
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del curso..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Temas del Curso */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-9 text-white text-xs flex items-center justify-center">{templates.length > 0 ? '3' : '2'}</span>
              Temas del Curso
            </h3>
            <CourseTopicsEditor
              courseId={editingCourse?.id}
              initialTopics={formData.themes}
              onChange={(topics) => setFormData({ ...formData, themes: topics })}
              isMobile={isMobile}
            />
          </div>

          {/* Botones de acción - Sticky en móvil */}
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white py-4 -mx-4 px-4 md:relative md:mx-0 md:px-0 md:py-0 md:border-t-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 h-11"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-11 bg-accent-9 hover:bg-accent-10 text-white">
              {editingCourse ? 'Actualizar' : 'Crear'} Curso
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="overflow-y-auto">
            {previewTemplate?.description && (
              <p className="text-neutral-9 mb-4">{previewTemplate.description}</p>
            )}
            <div className="space-y-2">
              <h4 className="font-semibold text-neutral-11">
                Temas ({previewTemplate?.topics?.length || 0})
              </h4>
              {previewTemplate?.topics?.length === 0 ? (
                <p className="text-neutral-9 italic">Sin temas definidos</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {previewTemplate?.topics?.map((topic, idx) => (
                    <div key={idx} className="p-3 bg-neutral-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{idx + 1}</Badge>
                        <span className="font-medium text-sm">{topic.title}</span>
                      </div>
                      {topic.description && (
                        <p className="text-xs text-neutral-9 mt-1 ml-8">{topic.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setPreviewTemplate(null)} className="w-full sm:w-auto">
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
              className="bg-accent-9 hover:bg-accent-10 w-full sm:w-auto"
            >
              Usar esta plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
