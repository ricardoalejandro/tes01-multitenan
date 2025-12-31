'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Copy, Eye, BookOpen, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface TemplateTopic {
  id?: string;
  orderIndex: number;
  title: string;
  description?: string;
}

interface CourseTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  topicsCount: number;
  creatorName?: string;
  topics?: TemplateTopic[];
  createdAt: string;
  updatedAt: string;
}

export default function CourseTemplatesModule() {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CourseTemplate | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topics: [] as TemplateTopic[],
  });

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.axiosInstance.get('/course-templates', {
        params: { search, includeInactive: 'true' },
      });
      setTemplates(response.data.data || []);
    } catch (error) {
      toast.error('Error al cargar plantillas');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => loadTemplates(), 300);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        topics: formData.topics.filter(t => t.title.trim()).map((t, idx) => ({
          orderIndex: idx + 1,
          title: t.title,
          description: t.description || '',
        })),
      };

      if (editingTemplate) {
        await api.axiosInstance.put(`/course-templates/${editingTemplate.id}`, payload);
        toast.success('Plantilla actualizada');
      } else {
        await api.axiosInstance.post('/course-templates', payload);
        toast.success('Plantilla creada');
      }

      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleEdit = async (template: CourseTemplate) => {
    try {
      // Fetch full template with topics
      const response = await api.axiosInstance.get(`/course-templates/${template.id}`);
      const fullTemplate = response.data;
      
      setEditingTemplate(fullTemplate);
      setFormData({
        name: fullTemplate.name,
        description: fullTemplate.description || '',
        topics: fullTemplate.topics || [],
      });
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Error al cargar plantilla');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta plantilla? Las filiales ya no podrán usarla.')) return;
    
    try {
      await api.axiosInstance.delete(`/course-templates/${id}`);
      toast.success('Plantilla desactivada');
      loadTemplates();
    } catch (error) {
      toast.error('Error al desactivar');
    }
  };

  const handleDuplicate = async (template: CourseTemplate) => {
    try {
      await api.axiosInstance.post(`/course-templates/${template.id}/duplicate`);
      toast.success('Plantilla duplicada');
      loadTemplates();
    } catch (error) {
      toast.error('Error al duplicar');
    }
  };

  const handlePreview = async (template: CourseTemplate) => {
    try {
      const response = await api.axiosInstance.get(`/course-templates/${template.id}`);
      setPreviewTemplate(response.data);
    } catch (error) {
      toast.error('Error al cargar vista previa');
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '', topics: [] });
    setExpandedTopics(new Set());
  };

  // Topic management
  const addTopic = () => {
    const newTopic: TemplateTopic = {
      orderIndex: formData.topics.length + 1,
      title: '',
      description: '',
    };
    setFormData({ ...formData, topics: [...formData.topics, newTopic] });
    setExpandedTopics(new Set([...expandedTopics, formData.topics.length]));
  };

  const updateTopic = (index: number, field: keyof TemplateTopic, value: string) => {
    const updated = formData.topics.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    );
    setFormData({ ...formData, topics: updated });
  };

  const removeTopic = (index: number) => {
    const updated = formData.topics.filter((_, i) => i !== index);
    setFormData({ ...formData, topics: updated });
    expandedTopics.delete(index);
    setExpandedTopics(new Set(expandedTopics));
  };

  const toggleTopicExpand = (index: number) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTopics(newExpanded);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newTopics = [...formData.topics];
    const draggedItem = newTopics[draggedIndex];
    newTopics.splice(draggedIndex, 1);
    newTopics.splice(index, 0, draggedItem);
    
    // Update order indices
    newTopics.forEach((t, i) => t.orderIndex = i + 1);
    
    setFormData({ ...formData, topics: newTopics });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none bg-neutral-2 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-11">Plantillas de Cursos</h1>
            <p className="text-neutral-9 mt-1">Crea plantillas globales que las filiales pueden usar</p>
          </div>
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-accent-9 hover:bg-accent-10 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-9 h-5 w-5" />
          <Input
            placeholder="Buscar plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-9" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-neutral-6" />
            <h3 className="mt-4 text-lg font-medium text-neutral-11">Sin plantillas</h3>
            <p className="mt-2 text-neutral-9">Crea tu primera plantilla de curso</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Crear Plantilla
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className={`transition-all hover:shadow-lg ${!template.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={template.isActive ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {template.topicsCount} temas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-neutral-9 mb-4">
                    <span>Creado por: {template.creatorName || 'Sistema'}</span>
                    {!template.isActive && (
                      <Badge variant="secondary" className="text-orange-600 border-orange-300">
                        Inactiva
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handlePreview(template)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDuplicate(template)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {template.isActive && (
                      <Button size="sm" variant="secondary" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="p-4 bg-neutral-2 rounded-lg space-y-4">
              <h3 className="font-semibold text-neutral-11 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Información de la Plantilla
              </h3>
              <div>
                <Label>Nombre de la Plantilla *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Filosofía Nivel Básico"
                  required
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el contenido y objetivo de esta plantilla..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Topics Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Temas de la Plantilla ({formData.topics.length})
              </Label>
              <Button type="button" size="sm" onClick={addTopic}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir Tema
              </Button>
            </div>

            {formData.topics.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-neutral-4 rounded-lg">
                <BookOpen className="mx-auto h-8 w-8 text-neutral-6" />
                <p className="mt-2 text-neutral-9">Sin temas. Añade el primer tema.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {formData.topics.map((topic, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border rounded-lg bg-white transition-all ${
                      draggedIndex === index ? 'opacity-50 border-accent-9' : 'border-neutral-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 p-3">
                      <div className="cursor-grab hover:bg-neutral-2 rounded p-1">
                        <GripVertical className="h-4 w-4 text-neutral-6" />
                      </div>
                      <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        {expandedTopics.has(index) ? (
                          <Input
                            value={topic.title}
                            onChange={(e) => updateTopic(index, 'title', e.target.value)}
                            placeholder="Título del tema"
                            className="font-medium"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium truncate block">
                            {topic.title || 'Sin título'}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleTopicExpand(index)}
                      >
                        {expandedTopics.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => removeTopic(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {expandedTopics.has(index) && (
                      <div className="px-3 pb-3 pt-0 border-t border-neutral-3">
                        <div className="pl-8 mt-3">
                          <Label className="text-sm text-neutral-9">Descripción</Label>
                          <Textarea
                            value={topic.description}
                            onChange={(e) => updateTopic(index, 'description', e.target.value)}
                            placeholder="Descripción detallada del tema..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent-9 hover:bg-accent-10 text-white">
              {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* Preview Dialog */}
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
                <div className="max-h-[400px] overflow-y-auto space-y-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
