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

  // Template states
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CourseTemplate | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'cards'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-neutral-11 hover:bg-neutral-2'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-x border-neutral-4 ${viewMode === 'compact'
                ? 'bg-accent-9 text-white'
                : 'bg-white text-neutral-11 hover:bg-neutral-2'
                }`}
            >
              Compacta
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'list'
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
          {/* Template Selector - Available for both new and existing courses */}
          {templates.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-accent-2 to-accent-3 rounded-lg border border-accent-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent-9" />
                  <Label className="text-base font-semibold text-accent-11">
                    {editingCourse ? 'Importar desde Plantilla' : 'Usar Plantilla'} (Opcional)
                  </Label>
                </div>
                {selectedTemplate && (
                  <Badge variant="default" className="bg-accent-9">
                    {selectedTemplate.name}
                  </Badge>
                )}
              </div>
              
              {editingCourse && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2">
                  ⚠️ Al importar una plantilla se <strong>reemplazarán todos los temas</strong> del curso actual
                </p>
              )}
              
              {!showTemplateSelector ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowTemplateSelector(true)}
                    className="flex-1 justify-between bg-white"
                  >
                    <span className="text-neutral-9">
                      {selectedTemplate 
                        ? `✓ ${selectedTemplate.name} (${selectedTemplate.topicsCount} temas)`
                        : editingCourse ? 'Importar temas de plantilla...' : 'Seleccionar plantilla...'
                      }
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {selectedTemplate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(null);
                        if (!editingCourse) {
                          setFormData({ ...formData, themes: [] });
                        }
                      }}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-white rounded-lg p-2 border">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-2 hover:bg-neutral-2 rounded-lg cursor-pointer group"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-neutral-9 truncate">{template.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{template.topicsCount} temas</Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTemplate(template);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplateSelector(false)}
                    className="w-full"
                  >
                    Cerrar selector
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-accent-10 mt-2">
                💡 {editingCourse 
                  ? 'Importa los temas de una plantilla para reemplazar el contenido actual' 
                  : 'Selecciona una plantilla para cargar los temas automáticamente'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-neutral-2 rounded-lg space-y-4">
              <h3 className="font-semibold text-neutral-11 flex items-center gap-2">
                📝 Información del Curso
              </h3>
              <div>
                <Label>Nombre del Curso *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Filosofía Básica I"
                  required
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del curso..."
                  rows={2}
                />
              </div>
            </div>

            {/* Course Topics Editor with Import/Export */}
            <CourseTopicsEditor
              courseId={editingCourse?.id}
              initialTopics={formData.themes}
              onChange={(topics) => setFormData({ ...formData, themes: topics })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
              {editingCourse ? 'Actualizar' : 'Crear'} Curso
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
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
                        <span className="font-medium">{topic.title}</span>
                      </div>
                      {topic.description && (
                        <p className="text-sm text-neutral-9 mt-1 ml-8">{topic.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPreviewTemplate(null)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                if (previewTemplate) {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
              className="bg-accent-9 hover:bg-accent-10"
            >
              Usar esta plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
