'use client';

import { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Upload, Download, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface CourseTopic {
  id?: string;
  orderIndex: number;
  title: string;
  description?: string;
  _status?: 'new' | 'modified' | 'deleted';
}

interface CourseTopicsEditorProps {
  courseId?: string;
  initialTopics?: CourseTopic[];
  onChange: (topics: CourseTopic[]) => void;
}

export default function CourseTopicsEditor({ courseId, initialTopics = [], onChange }: CourseTopicsEditorProps) {
  const [topics, setTopics] = useState<CourseTopic[]>(initialTopics);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [exportIncludeData, setExportIncludeData] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CourseTopic[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);

  const addTopic = () => {
    const newTopic: CourseTopic = {
      orderIndex: topics.length + 1,
      title: '',
      description: '',
      _status: 'new',
    };
    const updated = [...topics, newTopic];
    setTopics(updated);
    onChange(updated);
  };

  const updateTopic = (index: number, field: keyof CourseTopic, value: string) => {
    const updated = topics.map((topic, i) => {
      if (i === index) {
        return {
          ...topic,
          [field]: value,
          _status: (topic.id ? 'modified' : 'new') as 'new' | 'modified',
        };
      }
      return topic;
    });
    setTopics(updated);
    onChange(updated);
  };

  const removeTopic = (index: number) => {
    const updated = topics.filter((_, i) => i !== index).map((topic, idx) => ({
      ...topic,
      orderIndex: idx + 1,
    }));
    setTopics(updated);
    onChange(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...topics];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((topic, idx) => {
      topic.orderIndex = idx + 1;
    });
    setTopics(updated);
    onChange(updated);
  };

  const moveDown = (index: number) => {
    if (index === topics.length - 1) return;
    const updated = [...topics];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((topic, idx) => {
      topic.orderIndex = idx + 1;
    });
    setTopics(updated);
    onChange(updated);
  };

  const handleExport = async () => {
    if (!courseId) {
      toast.error('Guarda el curso primero antes de exportar', { duration: 1500 });
      return;
    }

    try {
      const url = `/courses/${courseId}/export?format=${exportFormat}&includeData=${exportIncludeData}`;
      const response = await api.axiosInstance.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `curso_temas.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Archivo exportado exitosamente', { duration: 1500 });
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Error al exportar archivo', { duration: 1500 });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.axiosInstance.post(
        `/courses/${courseId || 'temp'}/import-preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setImportPreview(response.data.themes);
        toast.success(`${response.data.count} temas encontrados`, { duration: 1500 });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar archivo', { duration: 1500 });
      setImportFile(null);
    } finally {
      setIsImporting(false);
    }
  };

  const applyImport = () => {
    setTopics(importPreview.map((t, idx) => ({
      ...t,
      orderIndex: idx + 1,
      _status: 'new',
    })));
    onChange(importPreview);
    setShowImportDialog(false);
    setImportFile(null);
    setImportPreview([]);
    toast.success('Temas importados. Guarda el curso para aplicar cambios.', { duration: 2000 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Temas del Curso</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!courseId}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button type="button" size="sm" onClick={addTopic}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir Tema
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {topics.length === 0 ? (
          <div className="text-center py-8 text-neutral-9">
            No hay temas añadidos. Haz clic en &quot;Añadir Tema&quot; o importa una plantilla.
          </div>
        ) : (
          topics.map((topic, index) => (
            <div key={index} className="border border-neutral-4 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveDown(index)}
                    disabled={index === topics.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    ↓
                  </Button>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm text-neutral-10">
                      Tema #{index + 1} - Título
                    </Label>
                    <Input
                      value={topic.title}
                      onChange={(e) => updateTopic(index, 'title', e.target.value)}
                      placeholder="Título del tema"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-neutral-10">Descripción</Label>
                    <Textarea
                      value={topic.description}
                      onChange={(e) => updateTopic(index, 'description', e.target.value)}
                      placeholder="Descripción detallada del tema"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTopic(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Temas</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label>Formato</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={exportFormat === 'excel' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('excel')}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('csv')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV (.csv)
                  </Button>
                </div>
              </div>
              <div>
                <Label>Contenido</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={exportIncludeData ? 'default' : 'outline'}
                    onClick={() => setExportIncludeData(true)}
                    className="flex-1"
                  >
                    Con datos actuales
                  </Button>
                  <Button
                    type="button"
                    variant={!exportIncludeData ? 'default' : 'outline'}
                    onClick={() => setExportIncludeData(false)}
                    className="flex-1"
                  >
                    Plantilla vacía
                  </Button>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} className="bg-accent-9 hover:bg-accent-10">
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Temas</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-neutral-4 rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                  disabled={isImporting}
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-neutral-9 mb-2" />
                  <p className="text-sm font-medium text-neutral-11">
                    Haz clic para seleccionar archivo
                  </p>
                  <p className="text-xs text-neutral-9 mt-1">
                    Formatos soportados: Excel (.xlsx) o CSV (.csv)
                  </p>
                </label>
              </div>

              {importFile && (
                <div className="text-sm text-neutral-10">
                  Archivo seleccionado: <span className="font-medium">{importFile.name}</span>
                </div>
              )}

              {importPreview.length > 0 && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">⚠️ Advertencia</p>
                      <p className="mt-1">
                        Esto reemplazará TODOS los temas actuales del curso ({topics.length} temas)
                        con los {importPreview.length} temas del archivo. Los cambios se aplicarán
                        en memoria y deberás guardar el curso para confirmar.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-neutral-4 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-2 sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-medium">#</th>
                          <th className="p-2 text-left font-medium">Título</th>
                          <th className="p-2 text-left font-medium">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((topic, idx) => (
                          <tr key={idx} className="border-t border-neutral-4">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-medium">{topic.title}</td>
                            <td className="p-2 text-neutral-9 truncate max-w-xs">
                              {topic.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={applyImport}
              disabled={importPreview.length === 0}
              className="bg-accent-9 hover:bg-accent-10"
            >
              Aplicar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
