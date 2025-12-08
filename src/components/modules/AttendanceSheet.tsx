'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquarePlus,
  User,
  FileText,
  CalendarDays,
  Loader2,
  Send,
  History,
  UserCheck,
  UserX,
  Timer,
  ShieldCheck,
  HandHeart,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Types
interface SessionTopic {
  id: string;
  courseId: string;
  topicTitle: string;
  topicDescription?: string;
  instructorId: string | null;
  courseName: string;
  instructorName: string | null;
}

interface SessionExecution {
  id: string;
  actualInstructorId: string | null;
  actualAssistantId: string | null;
  actualTopic: string | null;
  actualDate: string;
  notes: string | null;
  actualInstructorName: string | null;
  actualAssistantName: string | null;
}

interface GroupAssistant {
  id: string;
  fullName: string;
}

interface Observation {
  id: string;
  content: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
}

interface StudentAttendance {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  dni: string;
  phone: string | null;
  email: string | null;
  fullName: string;
  attendanceId: string;
  attendanceStatus: AttendanceStatus;
  observations: Observation[];
}

interface Instructor {
  id: string;
  fullName: string;
}

interface GroupSession {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'pendiente' | 'dictada' | 'suspendida';
  suspensionReason?: string | null;
  topics: SessionTopic[];
}

interface GroupWithStats {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface SessionDetail {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'pendiente' | 'dictada';
  groupId: string;
  groupName: string;
  startTime: string;
  endTime: string;
}

type AttendanceStatus = 'pendiente' | 'asistio' | 'no_asistio' | 'tarde' | 'justificado' | 'permiso';

const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  asistio: {
    label: 'Asistió',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: UserCheck,
  },
  no_asistio: {
    label: 'No asistió',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: UserX,
  },
  tarde: {
    label: 'Tarde',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Timer,
  },
  justificado: {
    label: 'Justificado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: ShieldCheck,
  },
  permiso: {
    label: 'Permiso',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: HandHeart,
  },
};

interface AttendanceSheetProps {
  session: GroupSession;
  group: GroupWithStats;
  onBack: () => void;
  onSessionCompleted: () => void;
}

export function AttendanceSheet({
  session,
  group,
  onBack,
  onSessionCompleted,
}: AttendanceSheetProps) {
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [topics, setTopics] = useState<SessionTopic[]>([]);
  const [execution, setExecution] = useState<SessionExecution | null>(null);
  const [assistants, setAssistants] = useState<GroupAssistant[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Curso seleccionado para asistencia por curso
  const [selectedCourseId, setSelectedCourseId] = useState<string>('_all_');

  // Form state for execution
  const [actualInstructorId, setActualInstructorId] = useState<string>('');
  const [actualAssistantId, setActualAssistantId] = useState<string>('_none_');
  const [actualTopic, setActualTopic] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [notes, setNotes] = useState('');

  // Observation sheet state
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [observationOpen, setObservationOpen] = useState(false);
  const [newObservation, setNewObservation] = useState('');
  const [addingObservation, setAddingObservation] = useState(false);

  // Complete session dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isReadOnly = session.status === 'dictada';

  // Load session data
  const loadSessionData = useCallback(async () => {
    try {
      setLoading(true);

      // Load session detail and instructors first
      const [detailRes, instructorsRes] = await Promise.all([
        api.getSessionDetail(session.id),
        api.getAttendanceInstructors(),
      ]);

      setSessionDetail(detailRes.session);
      setTopics(detailRes.topics || []);
      setExecution(detailRes.execution);
      setAssistants(detailRes.assistants || []);
      setInstructors(instructorsRes.data || []);

      // Initialize form with execution data or defaults
      if (detailRes.execution) {
        setActualInstructorId(detailRes.execution.actualInstructorId || '');
        setActualAssistantId(detailRes.execution.actualAssistantId || '_none_');
        setActualTopic(detailRes.execution.actualTopic || '');
        setActualDate(detailRes.execution.actualDate || session.sessionDate);
        setNotes(detailRes.execution.notes || '');
      } else {
        setActualDate(session.sessionDate);
        // Default instructor from first topic
        if (detailRes.topics && detailRes.topics.length > 0 && detailRes.topics[0].instructorId) {
          setActualInstructorId(detailRes.topics[0].instructorId);
        }
        // Default topic from first topic
        if (detailRes.topics && detailRes.topics.length > 0) {
          setActualTopic(detailRes.topics[0].topicTitle);
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      toast.error('Error al cargar datos de la sesión');
    } finally {
      setLoading(false);
    }
  }, [session.id, session.sessionDate]);

  // Load students with attendance (by course if selected)
  const loadStudents = useCallback(async () => {
    try {
      const courseIdParam = selectedCourseId !== '_all_' ? selectedCourseId : undefined;
      const studentsRes = await api.getSessionStudents(session.id, courseIdParam);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Error al cargar estudiantes');
    }
  }, [session.id, selectedCourseId]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Reload students when course selection changes
  useEffect(() => {
    if (!loading) {
      loadStudents();
    }
  }, [loadStudents, loading]);

  // Update attendance status
  const handleStatusChange = async (student: StudentAttendance, newStatus: AttendanceStatus) => {
    if (isReadOnly) return;

    try {
      // Cuando es "_all_", obtener todos los courseIds de los topics
      const isAllCourses = selectedCourseId === '_all_';
      const courseIdParam = !isAllCourses ? selectedCourseId : undefined;
      const courseIdsParam = isAllCourses && topics.length > 0
        ? [...new Set(topics.map(t => t.courseId))] // Unique courseIds
        : undefined;

      await api.updateAttendanceBySessionStudent(
        session.id,
        student.studentId,
        newStatus,
        courseIdParam,
        courseIdsParam
      );

      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === student.studentId
            ? { ...s, attendanceStatus: newStatus }
            : s
        )
      );

      toast.success(`Asistencia actualizada: ${ATTENDANCE_STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Error al actualizar asistencia');
    }
  };

  // Add observation
  const handleAddObservation = async () => {
    if (!selectedStudent || !newObservation.trim()) return;

    try {
      setAddingObservation(true);
      const result = await api.addAttendanceObservation(
        selectedStudent.attendanceId,
        newObservation.trim()
      );

      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.attendanceId === selectedStudent.attendanceId
            ? {
              ...s,
              observations: [
                {
                  id: result.data.id,
                  content: result.data.content,
                  createdAt: result.data.createdAt,
                  userId: result.data.userId,
                  userName: result.data.userName,
                },
                ...s.observations,
              ],
            }
            : s
        )
      );

      // Update selected student
      setSelectedStudent((prev) =>
        prev
          ? {
            ...prev,
            observations: [
              {
                id: result.data.id,
                content: result.data.content,
                createdAt: result.data.createdAt,
                userId: result.data.userId,
                userName: result.data.userName,
              },
              ...prev.observations,
            ],
          }
          : null
      );

      setNewObservation('');
      toast.success('Observación agregada');
    } catch (error) {
      console.error('Error adding observation:', error);
      toast.error('Error al agregar observación');
    } finally {
      setAddingObservation(false);
    }
  };

  // Save execution data
  const handleSaveExecution = async () => {
    if (isReadOnly) return;

    try {
      setSaving(true);
      await api.updateSessionExecution(session.id, {
        actualInstructorId: actualInstructorId || null,
        actualAssistantId: actualAssistantId === '_none_' ? null : actualAssistantId || null,
        actualTopic: actualTopic || null,
        actualDate: actualDate,
        notes: notes || null,
      });

      toast.success('Datos de ejecución guardados');
    } catch (error) {
      console.error('Error saving execution:', error);
      toast.error('Error al guardar datos de ejecución');
    } finally {
      setSaving(false);
    }
  };

  // Complete session (mark as dictada)
  const handleCompleteSession = async () => {
    try {
      setCompleting(true);

      // First save execution data
      await api.updateSessionExecution(session.id, {
        actualInstructorId: actualInstructorId || null,
        actualAssistantId: actualAssistantId === '_none_' ? null : actualAssistantId || null,
        actualTopic: actualTopic || null,
        actualDate: actualDate,
        notes: notes || null,
      });

      // Then mark as complete
      await api.completeSession(session.id);

      toast.success('Sesión marcada como dictada');
      setCompleteDialogOpen(false);
      onSessionCompleted();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Error al completar la sesión');
    } finally {
      setCompleting(false);
    }
  };

  // Quick status buttons
  const QuickStatusButton = ({
    status,
    student,
  }: {
    status: AttendanceStatus;
    student: StudentAttendance;
  }) => {
    const config = ATTENDANCE_STATUS_CONFIG[status];
    const Icon = config.icon;
    const isActive = student.attendanceStatus === status;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 transition-all',
                isActive && config.bgColor,
                isActive && config.color,
                isReadOnly && 'opacity-50 cursor-not-allowed'
              )}
              disabled={isReadOnly}
              onClick={() => handleStatusChange(student, status)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Calculate summary
  const attendanceSummary = {
    total: students.length,
    asistio: students.filter((s) => s.attendanceStatus === 'asistio').length,
    no_asistio: students.filter((s) => s.attendanceStatus === 'no_asistio').length,
    tarde: students.filter((s) => s.attendanceStatus === 'tarde').length,
    justificado: students.filter((s) => s.attendanceStatus === 'justificado').length,
    permiso: students.filter((s) => s.attendanceStatus === 'permiso').length,
    pendiente: students.filter((s) => s.attendanceStatus === 'pendiente').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Volver a sesiones
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">
                Sesión #{session.sessionNumber}
              </h2>
              {isReadOnly ? (
                <Badge className="bg-green-600">Dictada</Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                  Pendiente
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {group.name} •{' '}
              {new Date(session.sessionDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleSaveExecution} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
            <Button
              onClick={() => setCompleteDialogOpen(true)}
              disabled={attendanceSummary.pendiente > 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar Sesión
            </Button>
          </div>
        )}
      </div>

      {/* Session Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Planned Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planificado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(session.sessionDate).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {group.startTime?.slice(0, 5)} - {group.endTime?.slice(0, 5)}
              </span>
            </div>
            {topics.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Temas:</span>
                </div>
                <ul className="ml-6 space-y-1">
                  {topics.map((topic) => (
                    <li key={topic.id} className="text-sm">
                      <span className="font-medium">{topic.topicTitle}</span>
                      {topic.instructorName && (
                        <span className="text-muted-foreground">
                          {' '}
                          - {topic.instructorName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Info (Editable) */}
        <Card className={cn(isReadOnly && 'bg-muted/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ejecución Real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Fecha de dictado</Label>
              <Input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                disabled={isReadOnly}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Instructor</Label>
              <Select
                value={actualInstructorId}
                onValueChange={setActualInstructorId}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Seleccionar instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assistants.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Asistente</Label>
                <Select
                  value={actualAssistantId}
                  onValueChange={setActualAssistantId}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Seleccionar asistente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Sin asistente</SelectItem>
                    {assistants.map((asst) => (
                      <SelectItem key={asst.id} value={asst.id}>
                        {asst.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Tema dictado</Label>
              <Input
                value={actualTopic}
                onChange={(e) => setActualTopic(e.target.value)}
                placeholder="Tema de la sesión"
                disabled={isReadOnly}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones generales de la sesión..."
                disabled={isReadOnly}
                className="h-16 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-around">
            {Object.entries(ATTENDANCE_STATUS_CONFIG).map(([status, config]) => {
              const count = attendanceSummary[status as AttendanceStatus];
              const Icon = config.icon;

              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-full', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warning if there are pending */}
      {attendanceSummary.pendiente > 0 && !isReadOnly && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-700">
              Hay {attendanceSummary.pendiente} estudiantes sin registrar. Debes completar
              todas las asistencias para finalizar la sesión.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lista de Estudiantes ({students.length})
              </CardTitle>
              <CardDescription>
                Registra la asistencia de cada estudiante
              </CardDescription>
            </div>

            {/* Selector de curso para asistencia por curso */}
            {topics.length > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Asistencia por curso:</Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">Todos los cursos</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.courseId} value={topic.courseId}>
                        {topic.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {students.map((student, index) => {
                const statusConfig = ATTENDANCE_STATUS_CONFIG[student.attendanceStatus];

                return (
                  <div
                    key={student.attendanceId}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      student.attendanceStatus === 'pendiente' && 'bg-gray-50',
                      student.attendanceStatus === 'asistio' && 'bg-green-50 border-green-200',
                      student.attendanceStatus === 'no_asistio' && 'bg-red-50 border-red-200',
                      student.attendanceStatus === 'tarde' && 'bg-amber-50 border-amber-200',
                      student.attendanceStatus === 'justificado' && 'bg-blue-50 border-blue-200',
                      student.attendanceStatus === 'permiso' && 'bg-purple-50 border-purple-200'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Index number */}
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>

                      {/* Student info */}
                      <div>
                        <p className="font-medium">{student.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          DNI: {student.dni}
                          {student.phone && ` • ${student.phone}`}
                        </p>
                      </div>

                      {/* Observations indicator */}
                      {student.observations.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          <MessageSquarePlus className="h-3 w-3 mr-1" />
                          {student.observations.length}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick status buttons */}
                      <div className="flex items-center gap-1 border rounded-lg p-1">
                        <QuickStatusButton status="asistio" student={student} />
                        <QuickStatusButton status="tarde" student={student} />
                        <QuickStatusButton status="no_asistio" student={student} />
                        <QuickStatusButton status="justificado" student={student} />
                        <QuickStatusButton status="permiso" student={student} />
                      </div>

                      {/* Observations button */}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedStudent(student);
                          setObservationOpen(true);
                        }}
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Observation Sheet */}
      <Sheet open={observationOpen} onOpenChange={setObservationOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Observaciones
            </SheetTitle>
            <SheetDescription>
              {selectedStudent?.fullName}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Add new observation */}
            {!isReadOnly && (
              <div className="space-y-2">
                <Label>Nueva observación</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    placeholder="Escribe una observación..."
                    className="flex-1 resize-none"
                    rows={2}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddObservation}
                  disabled={!newObservation.trim() || addingObservation}
                  className="w-full"
                >
                  {addingObservation ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Agregar Observación
                </Button>
              </div>
            )}

            <Separator />

            {/* Observation history */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Historial</Label>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {selectedStudent?.observations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-1"
                    >
                      <p className="text-sm">{obs.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {obs.userName || 'Sistema'} •{' '}
                        {new Date(obs.createdAt).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                  {selectedStudent?.observations.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay observaciones registradas
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Complete Session Dialog */}
      <ResponsiveDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        title="Finalizar Sesión"
        description="¿Estás seguro de que deseas marcar esta sesión como dictada? Esta acción no se puede deshacer y los datos de asistencia quedarán bloqueados para edición."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completing}
            >
              Cancelar
            </Button>
            <Button onClick={handleCompleteSession} disabled={completing}>
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Finalizar Sesión
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-green-50">
            <p className="text-2xl font-bold text-green-600">
              {attendanceSummary.asistio}
            </p>
            <p className="text-xs text-green-600">Asistieron</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50">
            <p className="text-2xl font-bold text-red-600">
              {attendanceSummary.no_asistio}
            </p>
            <p className="text-xs text-red-600">No asistieron</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50">
            <p className="text-2xl font-bold text-amber-600">
              {attendanceSummary.tarde +
                attendanceSummary.justificado +
                attendanceSummary.permiso}
            </p>
            <p className="text-xs text-amber-600">Otros</p>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
