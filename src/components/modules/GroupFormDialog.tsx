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
import { TimeRangePicker } from '@/components/ui/time-picker';
import { AssistantForm, Assistant } from './AssistantForm';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [assistants, setAssistants] = useState<Assistant[]>([]);

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

  // Control de sesiones dictadas
  const [hasDictatedSessions, setHasDictatedSessions] = useState(false);
  const [dictatedSessionsCount, setDictatedSessionsCount] = useState(0);

  // Validación y alertas
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

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
      setStartTime(details.startTime || details.start_time || '');
      setEndTime(details.endTime || details.end_time || '');
      setAssistants(details.assistants || []);
      
      // Verificar si hay sesiones dictadas
      setHasDictatedSessions(details.hasDictatedSessions || false);
      setDictatedSessionsCount(details.dictatedSessionsCount || 0);
      
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
    setStartTime('');
    setEndTime('');
    setAssistants([]);
    setSelectedCourses([]);
    setRecurrence({
      frequency: 'weekly',
      interval: 1,
      days: ['monday'],
      startDate: new Date().toISOString().split('T')[0],
    });
    setGeneratedSessions([]);
    setHasDictatedSessions(false);
    setDictatedSessionsCount(0);
    setValidationWarnings([]);
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
      branchId, // Incluir branchId para filtrar feriados provinciales
    };
    
    console.log('🚀 Enviando a generateCalendar:', JSON.stringify(payload, null, 2));

    setLoading(true);
    try {
      const response = await api.generateCalendar(payload);
      console.log('📥 Respuesta del backend:', JSON.stringify(response, null, 2));
      console.log('📅 Primera sesión:', response.sessions?.[0]);
      setGeneratedSessions(response.sessions);
      
      // Mostrar mensaje de feriados saltados si corresponde
      if (response.skippedHolidays && response.skippedHolidays.length > 0) {
        const holidayNames = response.skippedHolidays
          .map((h: { date: string; name: string }) => `${h.name} (${new Date(h.date + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })})`)
          .join(', ');
        toast.info(`📅 Se omitieron ${response.skippedHolidays.length} fecha(s) por feriado: ${holidayNames}`);
      }
      
      setStep(4);
    } catch (error) {
      console.error('Error generating calendar:', error);
      alert('Error al generar el calendario');
    } finally {
      setLoading(false);
    }
  };

  // Función para validar el calendario antes de guardar
  const validateCalendar = (): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validar hora de fin > hora de inicio
    if (startTime && endTime && endTime <= startTime) {
      errors.push('La hora de fin debe ser mayor a la hora de inicio');
    }

    // 2. Validar orden de fechas (ascendente)
    for (let i = 1; i < generatedSessions.length; i++) {
      const prevDate = new Date(generatedSessions[i - 1].sessionDate);
      const currDate = new Date(generatedSessions[i].sessionDate);
      if (currDate <= prevDate) {
        errors.push(`La fecha de la sesión ${i + 1} (${generatedSessions[i].sessionDate}) debe ser posterior a la sesión ${i} (${generatedSessions[i - 1].sessionDate})`);
      }
    }

    // 3. Validar que no haya temas vacíos
    const emptySessions: number[] = [];
    generatedSessions.forEach((session) => {
      const hasEmptyTopic = session.topics.some(t => !t.topicTitle || t.topicTitle.trim() === '');
      if (hasEmptyTopic) {
        emptySessions.push(session.sessionNumber);
      }
    });
    if (emptySessions.length > 0) {
      errors.push(`Las siguientes sesiones tienen temas vacíos: ${emptySessions.join(', ')}. Complete todos los temas antes de guardar.`);
    }

    // 4. Detectar gaps en la frecuencia (warning, no error)
    if (recurrence.frequency === 'weekly' && generatedSessions.length > 1) {
      const intervalDays = (recurrence.interval || 1) * 7;
      const maxExpectedGap = intervalDays + 3; // Permitir algo de margen

      for (let i = 1; i < generatedSessions.length; i++) {
        const prevDate = new Date(generatedSessions[i - 1].sessionDate);
        const currDate = new Date(generatedSessions[i].sessionDate);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > maxExpectedGap) {
          const weeksGap = Math.round(diffDays / 7);
          warnings.push(`Sesiones ${i} y ${i + 1}: hay ${weeksGap} semana(s) de diferencia (frecuencia: ${recurrence.interval || 1} semana). Posible feriado o día especial.`);
        }
      }
    }

    return { errors, warnings };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error('Debes seleccionar al menos un curso');
      return;
    }
    if (generatedSessions.length === 0) {
      toast.error('Debes generar el calendario antes de guardar');
      return;
    }

    // Ejecutar validaciones
    const { errors, warnings } = validateCalendar();

    // Si hay errores bloqueantes, mostrarlos y detener
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    // Si hay warnings, mostrar diálogo de confirmación
    if (warnings.length > 0) {
      setValidationWarnings(warnings);
      setShowWarningDialog(true);
      return;
    }

    // Si no hay errores ni warnings, guardar directamente
    await performSave();
  };

  const performSave = async () => {
    setLoading(true);
    try {
      const payload = {
        branchId,
        name,
        description: description.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        assistants: assistants.length > 0 ? assistants : undefined,
        courses: selectedCourses,
        recurrence: recurrence,
        sessions: generatedSessions,
      };

      if (group) {
        await api.updateGroup(group.id, payload);
        toast.success('Grupo actualizado correctamente');
      } else {
        await api.createGroup(payload);
        toast.success('Grupo creado correctamente');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving group:', error);
      toast.error(error.message || 'Error al guardar el grupo');
    } finally {
      setLoading(false);
    }
  };

  const canGenerateCalendar = () => {
    if (selectedCourses.length === 0) return false;
    if (!selectedCourses.every(c => c.courseId && c.instructorId)) return false;
    if (!recurrence.startDate) return false;
    if (recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0)) return false;
    
    // OBLIGATORIO: Debe tener fecha de fin O número máximo de sesiones
    const hasEndDate = recurrence.endDate && recurrence.endDate.trim().length > 0;
    const hasMaxOccurrences = recurrence.maxOccurrences && recurrence.maxOccurrences > 0;
    if (!hasEndDate && !hasMaxOccurrences) return false;
    
    // Validar que fecha de fin sea posterior a fecha de inicio
    if (hasEndDate && recurrence.endDate && recurrence.endDate <= recurrence.startDate) return false;
    
    return true;
  };

  const canGoNext = () => {
    if (step === 1) {
      // Nombre y horarios obligatorios
      return name.trim().length > 0 && startTime.trim().length > 0 && endTime.trim().length > 0;
    }
    if (step === 2) {
      // Al menos un curso con instructor válido
      return selectedCourses.length > 0 && selectedCourses.every(c => c.courseId && c.instructorId);
    }
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
              variant="secondary"
              onClick={() => setStep(step - 1)}
              disabled={loading}
            >
              Anterior
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext() || loading}>
              Siguiente
            </Button>
          )}
          {step === 3 && (
            <Button 
              onClick={handleGenerateCalendar} 
              disabled={loading || !canGenerateCalendar() || hasDictatedSessions}
              title={hasDictatedSessions ? 'No se puede regenerar el calendario porque hay sesiones dictadas' : ''}
            >
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
            <div className="space-y-6 max-w-2xl mx-auto">
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
                  rows={3}
                />
              </div>
              
              {/* Horarios */}
              <div className="pt-4 border-t">
                <Label className="text-base font-medium mb-3 block">Horario de Clases *</Label>
                <TimeRangePicker
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
                {(!startTime || !endTime) && (
                  <p className="text-sm text-amber-600 mt-2">⚠️ El horario de inicio y fin es obligatorio</p>
                )}
              </div>

              {/* Asistentes */}
              <div className="pt-4 border-t">
                <AssistantForm
                  assistants={assistants}
                  onChange={setAssistants}
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
            <div className="max-w-3xl mx-auto space-y-4">
              {hasDictatedSessions && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Calendario bloqueado</p>
                    <p className="text-sm">
                      Este grupo tiene {dictatedSessionsCount} sesión(es) ya dictada(s). 
                      No es posible regenerar el calendario para proteger los registros de asistencia existentes.
                    </p>
                  </div>
                </div>
              )}
              <RecurrenceConfigPanel value={recurrence} onChange={setRecurrence} />
            </div>
          )}

          {/* STEP 4: Calendario */}
          {step === 4 && (
            <div className="max-w-6xl mx-auto space-y-4">
              {hasDictatedSessions && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Edición limitada</p>
                    <p className="text-sm">
                      Este grupo tiene {dictatedSessionsCount} sesión(es) ya dictada(s). 
                      Solo puedes modificar la información básica del grupo (nombre, descripción, horarios).
                      Las sesiones dictadas no pueden ser eliminadas ni modificadas.
                    </p>
                  </div>
                </div>
              )}
              {generatedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-10 mb-4">
                    El calendario aún no ha sido generado
                  </p>
                  <Button onClick={handleGenerateCalendar} disabled={loading || hasDictatedSessions}>
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

      {/* Dialog de advertencias no bloqueantes */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Advertencias Detectadas
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Se detectaron las siguientes situaciones que podrían requerir su atención:
                </p>
                <ul className="space-y-2">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium pt-2">
                  Esto podría deberse a feriados o días especiales. ¿Desea continuar de todas formas?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar y revisar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowWarningDialog(false);
              performSave();
            }}>
              Crear de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveDialog>
  );
}
