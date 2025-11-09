'use client';

import { useState, useEffect } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
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
  days?: string[];
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

interface GeneratedSession {
  sessionNumber: number;
  sessionDate: string; // Backend devuelve sessionDate, no scheduledDate
  topics: Array<{
    courseId: string;
    courseName?: string;
    topicName?: string; // Puede venir como topicName
    topicTitle?: string; // O como topicTitle
    topicDescription?: string;
    instructorId: string;
    topicMode: 'auto' | 'selected' | 'manual';
    orderIndex?: number; // Agregado para evitar errores de tipo
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
    days: ['monday'], // Lunes por defecto
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
      
      // Cargar cursos e instructores disponibles primero
      await loadCoursesAndInstructors();
      
      setName(details.name);
      setDescription(details.description || '');
      
      // Mapear cursos (el backend puede retornar camelCase o snake_case)
      setSelectedCourses(
        (details.courses || []).map((c: any, idx: number) => ({
          courseId: c.courseId || c.course_id,
          instructorId: c.instructorId || c.instructor_id,
          orderIndex: idx + 1,
        }))
      );

      // Mapear recurrencia
      const daysFromDB = details.recurrenceDays || details.recurrence_days;
      const parsedDays = daysFromDB ? 
        (typeof daysFromDB === 'string' ? JSON.parse(daysFromDB) : daysFromDB) 
        : ['monday'];
      
      setRecurrence({
        frequency: details.recurrenceFrequency || details.recurrence_frequency || 'weekly',
        interval: details.recurrenceInterval || details.recurrence_interval || 1,
        days: parsedDays,
        startDate: details.startDate || details.start_date || new Date().toISOString().split('T')[0],
        endDate: details.endDate || details.end_date,
        maxOccurrences: details.maxOccurrences || details.max_occurrences,
      });

      // Mapear sesiones (backend retorna camelCase)
      setGeneratedSessions(
        (details.sessions || []).map((s: any) => ({
          sessionNumber: s.sessionNumber || s.session_number,
          sessionDate: s.sessionDate || s.session_date || s.scheduledDate || s.scheduled_date,
          topics: (s.topics || []).map((t: any) => ({
            courseId: t.courseId || t.course_id,
            topicTitle: t.topicTitle || t.topic_title || t.topicName || t.topic_name || 'Tema pendiente',
            topicDescription: t.topicDescription || t.topic_description || '',
            instructorId: t.instructorId || t.instructor_id,
            topicMode: t.topicMode || t.topic_mode || 'auto',
            orderIndex: t.orderIndex || t.order_index || 1,
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
      days: ['monday'],
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

    // Validar que si es semanal, tenga días seleccionados
    if (recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0)) {
      alert('Debes seleccionar al menos un día de la semana');
      return;
    }

    // Limpiar recurrence para enviar solo valores válidos
    const cleanRecurrence: any = {
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      startDate: recurrence.startDate,
    };
    
    if (recurrence.days && recurrence.days.length > 0) {
      cleanRecurrence.days = recurrence.days;
    }
    
    if (recurrence.endDate && recurrence.endDate.trim()) {
      cleanRecurrence.endDate = recurrence.endDate;
    }
    
    if (recurrence.maxOccurrences && recurrence.maxOccurrences > 0) {
      cleanRecurrence.maxOccurrences = recurrence.maxOccurrences;
    }

    const payload = {
      courses: selectedCourses,
      recurrence: cleanRecurrence,
    };
    
    console.log('🚀 Enviando a generateCalendar:', JSON.stringify(payload, null, 2));

    setLoading(true);
    try {
      const response = await api.generateCalendar(payload);
      console.log('📥 Respuesta del backend:', JSON.stringify(response, null, 2));
      console.log('📅 Primera sesión:', response.sessions?.[0]);
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
        recurrence: recurrence,
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

  const canGenerateCalendar = () => {
    if (selectedCourses.length === 0) return false;
    if (!recurrence.startDate) return false;
    if (recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0)) return false;
    // Si tiene endDate, asegurarse que no esté vacío
    if (recurrence.endDate && !recurrence.endDate.trim()) return false;
    return true;
  };

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedCourses.length > 0;
    if (step === 3) return canGenerateCalendar();
    return false;
  };

  const getStepDescription = () => {
    if (step === 1) return 'Información básica del grupo';
    if (step === 2) return 'Selecciona cursos y asigna instructores';
    if (step === 3) return 'Configura la recurrencia del calendario';
    if (step === 4) return 'Revisa y edita el calendario generado';
    return '';
  };

  return (
    <ResponsiveDialog 
      open={open} 
      onOpenChange={onClose}
      title={`${group ? 'Editar Grupo' : 'Crear Grupo'} - Paso ${step} de 4`}
      description={getStepDescription()}
      defaultMaximized={true}
      footer={
        <>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={loading}
            >
              Anterior
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext() || loading}>
              Siguiente
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleGenerateCalendar} disabled={loading || !canGenerateCalendar()}>
              {loading ? 'Generando...' : 'Generar Calendario'}
            </Button>
          )}
          {step === 4 && generatedSessions.length > 0 && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : group ? 'Actualizar' : 'Crear Grupo'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
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
                    sessionDate: s.sessionDate,
                    topics: (s.topics || []).map(t => ({
                      courseId: t.courseId,
                      courseName: availableCourses.find(c => c.id === t.courseId)?.name || '',
                      topicMode: t.topicMode || 'auto',
                      topicTitle: t.topicTitle || t.topicName || 'Tema pendiente',
                      topicDescription: t.topicDescription || '',
                      instructorId: t.instructorId,
                      orderIndex: t.orderIndex || 0,
                    })),
                  }))}
                  onChange={(sessions) => {
                    setGeneratedSessions(sessions.map(s => ({
                      sessionNumber: s.sessionNumber,
                      sessionDate: s.sessionDate,
                      topics: (s.topics || []).map((t, index) => ({
                        courseId: t.courseId,
                        topicTitle: t.topicTitle,
                        topicDescription: t.topicDescription,
                        instructorId: t.instructorId,
                        topicMode: t.topicMode,
                        orderIndex: index + 1,
                      })),
                    })));
                  }}
                  courseTopics={availableCourses.reduce((acc, course) => {
                    acc[course.id] = course.themes || [];
                    return acc;
                  }, {} as Record<string, any[]>)}
                  instructors={availableInstructors}
                />
              )}
            </div>
          )}
      </div>
    </ResponsiveDialog>
  );
}
