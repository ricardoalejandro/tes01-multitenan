'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import CourseSelectorWithInstructors from './CourseSelectorWithInstructors';
import RecurrenceConfigPanel from './RecurrenceConfigPanel';
import SessionCalendarEditor from './SessionCalendarEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  branchId: string;
  group: any | null;
  onSaved: () => void;
}

interface CourseWithInstructor {
  courseId: string;
  instructorId: string;
  orderIndex: number;
}

interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

interface GeneratedSession {
  sessionNumber: number;
  scheduledDate: string;
  topics: Array<{
    courseId: string;
    topicName: string;
    instructorId: string;
    topicMode: 'auto' | 'selected' | 'manual';
  }>;
}

export function GroupFormDialog({ open, onClose, branchId, group, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Información básica
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Cursos e instructores
  const [selectedCourses, setSelectedCourses] = useState<CourseWithInstructor[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<any[]>([]);

  // Step 3: Recurrencia
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [1], // Lunes por defecto
    startDate: new Date().toISOString().split('T')[0],
  });

  // Step 4: Calendario generado
  const [generatedSessions, setGeneratedSessions] = useState<GeneratedSession[]>([]);

  useEffect(() => {
    if (open) {
      if (group) {
        loadGroupData();
      } else {
        resetForm();
        loadCoursesAndInstructors();
      }
    }
  }, [open, group]);

  const loadCoursesAndInstructors = async () => {
    try {
      const [coursesData, instructorsData] = await Promise.all([
        api.getCourses(branchId),
        api.getInstructors(branchId),
      ]);
      setAvailableCourses(coursesData.data || []);
      setAvailableInstructors(instructorsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadGroupData = async () => {
    if (!group) return;
    try {
      const details = await api.getGroupDetails(group.id);
      setName(details.name);
      setDescription(details.description || '');
      
      // Mapear cursos
      setSelectedCourses(
        details.courses.map((c: any, idx: number) => ({
          courseId: c.course_id,
          instructorId: c.instructor_id,
          orderIndex: idx,
        }))
      );

      // Mapear recurrencia
      setRecurrence({
        frequency: details.recurrence_frequency || 'weekly',
        interval: details.recurrence_interval || 1,
        daysOfWeek: details.recurrence_days_of_week || [1],
        startDate: details.recurrence_start_date || new Date().toISOString().split('T')[0],
        endDate: details.recurrence_end_date,
        maxOccurrences: details.recurrence_max_occurrences,
      });

      // Mapear sesiones
      setGeneratedSessions(
        details.sessions.map((s: any) => ({
          sessionNumber: s.session_number,
          scheduledDate: s.scheduled_date,
          topics: s.topics.map((t: any) => ({
            courseId: t.course_id,
            topicName: t.topic_name,
            instructorId: t.instructor_id,
            topicMode: t.topic_mode,
          })),
        }))
      );

      setStep(4); // Ir directo al calendario en edición
    } catch (error) {
      console.error('Error loading group:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedCourses([]);
    setRecurrence({
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1],
      startDate: new Date().toISOString().split('T')[0],
    });
    setGeneratedSessions([]);
    setStep(1);
  };

  const handleGenerateCalendar = async () => {
    if (selectedCourses.length === 0) {
      alert('Debes seleccionar al menos un curso');
      return;
    }

    setLoading(true);
    try {
      const response = await api.generateCalendar({
        courseIds: selectedCourses.map((c) => c.courseId),
        instructorIds: selectedCourses.map((c) => c.instructorId),
        recurrenceConfig: recurrence,
      });
      setGeneratedSessions(response.sessions);
      setStep(4);
    } catch (error) {
      console.error('Error generating calendar:', error);
      alert('Error al generar el calendario');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('El nombre del grupo es obligatorio');
      return;
    }
    if (selectedCourses.length === 0) {
      alert('Debes seleccionar al menos un curso');
      return;
    }
    if (generatedSessions.length === 0) {
      alert('Debes generar el calendario antes de guardar');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        branchId,
        name,
        description: description.trim() || undefined,
        courses: selectedCourses,
        recurrenceConfig: recurrence,
        sessions: generatedSessions,
      };

      if (group) {
        await api.updateGroup(group.id, payload);
      } else {
        await api.createGroup(payload);
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving group:', error);
      alert(error.message || 'Error al guardar el grupo');
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedCourses.length > 0;
    if (step === 3) return true;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col">
        <DialogTitle>
          {group ? 'Editar Grupo' : 'Crear Grupo'} - Paso {step} de 4
        </DialogTitle>
        <DialogDescription>
          {step === 1 && 'Información básica del grupo'}
          {step === 2 && 'Selecciona cursos y asigna instructores'}
          {step === 3 && 'Configura la recurrencia del calendario'}
          {step === 4 && 'Revisa y edita el calendario generado'}
        </DialogDescription>

        <div className="flex-1 overflow-y-auto py-4">
          {/* STEP 1: Información básica */}
          {step === 1 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <Label>Nombre del Grupo *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Grupo A - Matemáticas Avanzadas"
                  autoFocus
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción opcional del grupo..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Cursos e instructores */}
          {step === 2 && (
            <div className="max-w-4xl mx-auto">
              <CourseSelectorWithInstructors
                value={selectedCourses}
                onChange={setSelectedCourses}
                availableCourses={availableCourses}
                availableInstructors={availableInstructors}
              />
            </div>
          )}

          {/* STEP 3: Recurrencia */}
          {step === 3 && (
            <div className="max-w-3xl mx-auto">
              <RecurrenceConfigPanel value={recurrence} onChange={setRecurrence} />
            </div>
          )}

          {/* STEP 4: Calendario */}
          {step === 4 && (
            <div className="max-w-6xl mx-auto">
              {generatedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-10 mb-4">
                    El calendario aún no ha sido generado
                  </p>
                  <Button onClick={handleGenerateCalendar} disabled={loading}>
                    {loading ? 'Generando...' : 'Generar Calendario'}
                  </Button>
                </div>
              ) : (
                <SessionCalendarEditor
                  sessions={generatedSessions.map(s => ({
                    sessionNumber: s.sessionNumber,
                    sessionDate: s.scheduledDate,
                    topics: s.topics.map(t => ({
                      courseId: t.courseId,
                      courseName: '',
                      topicMode: t.topicMode,
                      topicTitle: t.topicName,
                      topicDescription: '',
                      instructorId: t.instructorId,
                      orderIndex: 0,
                    })),
                  }))}
                  onChange={(sessions) => {
                    setGeneratedSessions(sessions.map(s => ({
                      sessionNumber: s.sessionNumber,
                      scheduledDate: s.sessionDate,
                      topics: s.topics.map(t => ({
                        courseId: t.courseId,
                        topicName: t.topicTitle,
                        instructorId: t.instructorId,
                        topicMode: t.topicMode,
                      })),
                    })));
                  }}
                  courseTopics={{}}
                  instructors={availableInstructors}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer con navegación */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-4">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>

            {step < 3 && (
              <Button onClick={() => setStep(step + 1)} disabled={!canGoNext() || loading}>
                Siguiente
              </Button>
            )}

            {step === 3 && (
              <Button onClick={handleGenerateCalendar} disabled={loading}>
                {loading ? 'Generando...' : 'Generar Calendario'}
              </Button>
            )}

            {step === 4 && generatedSessions.length > 0 && (
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : group ? 'Actualizar' : 'Crear Grupo'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
