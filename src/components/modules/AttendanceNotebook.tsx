'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  AlertTriangle,
  Users,
  Calendar,
  Loader2,
  ArrowUpDown,
  Check,
  X,
  Clock,
  FileCheck,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Types
interface SessionExecution {
  actualInstructorId: string | null;
  actualTopic: string | null;
  actualDate: string | null;
  notes: string | null;
}

interface NotebookSession {
  id: string;
  number: number;
  date: string;
  status: 'pendiente' | 'dictada';
  execution: SessionExecution | null;
}

interface StudentStats {
  attended: number;
  absences: number;
  late: number;
  justified: number;
  total: number;
  percentage: number;
  isCritical: boolean;
}

interface StudentObservation {
  id: string;
  content: string;
  createdAt: string;
  userName: string | null;
}

interface NotebookStudent {
  id: string;
  enrollmentId: string;
  fullName: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  dni: string | null;
  sessions: Record<string, { status: string; attendanceId: string | null; observationCount: number }>;
  stats: StudentStats;
}

interface SessionStat {
  sessionId: string;
  attended: number;
  total: number;
  percentage: number;
}

interface GlobalStats {
  totalStudents: number;
  totalSessions: number;
  completedSessions: number;
  averageAttendance: number;
  criticalStudents: number;
}

interface Instructor {
  id: string;
  fullName: string;
}

interface NotebookData {
  group: {
    id: string;
    name: string;
    startDate: string;
    totalSessions: number;
  };
  sessions: NotebookSession[];
  students: NotebookStudent[];
  sessionStats: SessionStat[];
  globalStats: GlobalStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    sessionsPerPage: number;
    totalSessions: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    startDate: string | null;
    endDate: string | null;
    studentFilter: string;
    searchTerm: string;
    sortBy: string;
    sortOrder: string;
  };
}

interface AttendanceNotebookProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

// Status options for dropdown
const STATUS_OPTIONS = [
  { value: 'asistio', label: 'Asistió', icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'no_asistio', label: 'Falta', icon: X, color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'tarde', label: 'Tardanza', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: 'justificado', label: 'Justificado', icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'permiso', label: 'Permiso', icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-100' },
];

// Status icon component
const StatusIcon = ({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  switch (status) {
    case 'asistio':
      return (
        <div className={cn(sizeClass, 'rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center')}>
          <Check className={cn(iconSize, 'text-green-600 dark:text-green-400')} />
        </div>
      );
    case 'no_asistio':
      return (
        <div className={cn(sizeClass, 'rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center')}>
          <X className={cn(iconSize, 'text-red-600 dark:text-red-400')} />
        </div>
      );
    case 'tarde':
      return (
        <div className={cn(sizeClass, 'rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center')}>
          <Clock className={cn(iconSize, 'text-amber-600 dark:text-amber-400')} />
        </div>
      );
    case 'justificado':
      return (
        <div className={cn(sizeClass, 'rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center')}>
          <FileCheck className={cn(iconSize, 'text-blue-600 dark:text-blue-400')} />
        </div>
      );
    case 'permiso':
      return (
        <div className={cn(sizeClass, 'rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center')}>
          <FileCheck className={cn(iconSize, 'text-purple-600 dark:text-purple-400')} />
        </div>
      );
    default:
      return (
        <div className={cn(sizeClass, 'rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center')}>
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        </div>
      );
  }
};

// Status label for tooltips
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    asistio: 'Asistió',
    no_asistio: 'Falta',
    tarde: 'Tardanza',
    justificado: 'Justificado',
    permiso: 'Permiso',
    pendiente: 'Pendiente',
  };
  return labels[status] || status;
};

export function AttendanceNotebook({ groupId, groupName, onBack }: AttendanceNotebookProps) {
  const [data, setData] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  
  // Tecla Escape = botón Volver
  useEscapeKey(onBack);
  
  // Filters state
  const [page, setPage] = useState(1);
  const [sessionsPerPage, setSessionsPerPage] = useState(5);
  const [studentFilter, setStudentFilter] = useState<'all' | 'critical' | 'search'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'absences'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('_all_');

  // Session finalization modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<NotebookSession | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    actualDate: '',
    actualInstructorId: '',
    actualTopic: '',
    notes: '',
  });
  const [savingSession, setSavingSession] = useState(false);

  // Observations modal
  const [observationsModalOpen, setObservationsModalOpen] = useState(false);
  const [selectedStudentForObs, setSelectedStudentForObs] = useState<{
    student: NotebookStudent;
    sessionId: string;
    attendanceId: string | null;
  } | null>(null);
  const [loadedObservations, setLoadedObservations] = useState<StudentObservation[]>([]);
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [newObservation, setNewObservation] = useState('');
  const [savingObservation, setSavingObservation] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAttendanceNotebook(groupId, {
        page,
        sessionsPerPage,
        studentFilter,
        searchTerm: studentFilter === 'search' ? searchTerm : undefined,
        sortBy,
        sortOrder,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        courseId: selectedCourseId !== '_all_' ? selectedCourseId : undefined,
      });
      setData(response);
    } catch (error) {
      console.error('Error loading notebook:', error);
      toast.error('Error al cargar el cuaderno de asistencia');
    } finally {
      setLoading(false);
    }
  }, [groupId, page, sessionsPerPage, studentFilter, searchTerm, sortBy, sortOrder, startDate, endDate, selectedCourseId]);

  // Load instructors and group courses
  const loadInstructors = useCallback(async () => {
    try {
      const [instructorsRes, groupCoursesRes] = await Promise.all([
        api.getAttendanceInstructors(),
        api.axiosInstance.get(`/groups/${groupId}/courses`),
      ]);
      setInstructors(instructorsRes.data || []);
      
      // Extract unique courses from group courses
      const groupCourses = groupCoursesRes.data?.data || [];
      const uniqueCourses = groupCourses.reduce((acc: { id: string; name: string }[], gc: any) => {
        if (!acc.find(c => c.id === gc.courseId)) {
          acc.push({ id: gc.courseId, name: gc.courseName });
        }
        return acc;
      }, []);
      setCourses(uniqueCourses);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
    loadInstructors();
  }, [loadData, loadInstructors]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [sessionsPerPage, startDate, endDate]);

  // Handle sort toggle
  const toggleSort = (field: 'name' | 'attendance' | 'absences') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Check if session is dictada
  const isSessionDictada = (sessionId: string): boolean => {
    const session = data?.sessions.find(s => s.id === sessionId);
    return session?.status === 'dictada';
  };

  // Handle attendance status change
  const handleStatusChange = async (studentId: string, sessionId: string, attendanceId: string | null, newStatus: string) => {
    // Check if session is already dictada
    if (isSessionDictada(sessionId)) {
      toast.error('Esta sesión ya está finalizada. Debe reabrir la sesión para editar la asistencia.', {
        duration: 4000,
        action: {
          label: 'Reabrir',
          onClick: () => {
            const session = data?.sessions.find(s => s.id === sessionId);
            if (session) openSessionModal(session);
          }
        }
      });
      return;
    }

    try {
      if (attendanceId) {
        // Update existing attendance record
        await api.updateAttendanceStatus(attendanceId, newStatus);
      } else {
        // Create new attendance record using upsert endpoint with courseId
        const courseIdToUse = selectedCourseId !== '_all_' ? selectedCourseId : undefined;
        await api.upsertAttendanceWithCourse(sessionId, studentId, newStatus, courseIdToUse);
      }
      toast.success('Asistencia actualizada');
      loadData();
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      if (error?.response?.status === 403) {
        toast.error('Esta sesión ya está finalizada. Debe reabrir la sesión para editar.');
      } else {
        toast.error('Error al actualizar asistencia');
      }
    }
  };

  // Handle reopen session
  const handleReopenSession = async () => {
    if (!selectedSession) return;

    try {
      setSavingSession(true);
      await api.reopenSession(selectedSession.id);
      toast.success('Sesión reabierta. Ahora puede editar la asistencia.');
      setSessionModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error reopening session:', error);
      toast.error('Error al reabrir la sesión');
    } finally {
      setSavingSession(false);
    }
  };

  // Open session finalization modal
  const openSessionModal = (session: NotebookSession) => {
    setSelectedSession(session);
    // Cargar datos existentes de ejecución si existen, sino usar valores por defecto
    setSessionFormData({
      actualDate: session.execution?.actualDate || session.date,
      actualInstructorId: session.execution?.actualInstructorId || '',
      actualTopic: session.execution?.actualTopic || '',
      notes: session.execution?.notes || '',
    });
    setSessionModalOpen(true);
  };

  // Handle session finalization
  const handleFinalizeSession = async () => {
    if (!selectedSession) return;

    try {
      setSavingSession(true);
      
      // Update execution data
      await api.updateSessionExecution(selectedSession.id, {
        actualDate: sessionFormData.actualDate,
        actualInstructorId: sessionFormData.actualInstructorId || null,
        actualTopic: sessionFormData.actualTopic || null,
        notes: sessionFormData.notes || null,
      });

      // Mark session as completed
      await api.completeSession(selectedSession.id);

      toast.success('Sesión finalizada correctamente');
      setSessionModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error finalizing session:', error);
      toast.error('Error al finalizar la sesión');
    } finally {
      setSavingSession(false);
    }
  };

  // Open observations modal
  const openObservationsModal = async (student: NotebookStudent, sessionId: string, attendanceId: string | null) => {
    setSelectedStudentForObs({ student, sessionId, attendanceId });
    setNewObservation('');
    setLoadedObservations([]);
    setObservationsModalOpen(true);

    // Load observations from backend if we have an attendanceId
    if (attendanceId) {
      setLoadingObservations(true);
      try {
        const result = await api.getAttendanceObservations(attendanceId);
        setLoadedObservations(result.data || []);
      } catch (error) {
        console.error('Error loading observations:', error);
      } finally {
        setLoadingObservations(false);
      }
    }
  };

  // Add observation
  const handleAddObservation = async () => {
    if (!selectedStudentForObs || !newObservation.trim()) return;

    // If there's no attendanceId, we need to create the attendance first
    let attendanceId = selectedStudentForObs.attendanceId;

    try {
      setSavingObservation(true);

      // If no attendance record exists, create one with status 'pendiente' first
      if (!attendanceId) {
        const result = await api.upsertAttendance(
          selectedStudentForObs.sessionId,
          selectedStudentForObs.student.id,
          'pendiente'
        );
        attendanceId = result.data?.id;
        if (!attendanceId) {
          throw new Error('No se pudo crear el registro de asistencia');
        }
        // Update the state with the new attendanceId
        setSelectedStudentForObs({
          ...selectedStudentForObs,
          attendanceId,
        });
      }

      await api.addAttendanceObservation(attendanceId, newObservation.trim());
      toast.success('Observación agregada');
      setNewObservation('');
      
      // Reload observations
      const result = await api.getAttendanceObservations(attendanceId);
      setLoadedObservations(result.data || []);
      
      // Refresh main data to update the observation count
      loadData();
    } catch (error) {
      console.error('Error adding observation:', error);
      toast.error('Error al agregar observación');
    } finally {
      setSavingObservation(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Alumno', 'DNI', ...data.sessions.map(s => `Sesión ${s.number} (${formatDate(s.date)})`), '% Asistencia', 'Asistencias', 'Faltas'];
    const rows = data.students.map(student => [
      student.fullName,
      student.dni || '',
      ...data.sessions.map(s => getStatusLabel(student.sessions[s.id]?.status || 'pendiente')),
      `${student.stats.percentage}%`,
      student.stats.attended.toString(),
      student.stats.absences.toString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${groupName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Archivo CSV descargado');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No se pudo cargar el cuaderno de asistencia</p>
      </div>
    );
  }

  // Check if all attendance in a session is marked (no "pendiente")
  const isSessionReadyToFinalize = (sessionId: string) => {
    return data.students.every(student => {
      const status = student.sessions[sessionId]?.status || 'pendiente';
      return status !== 'pendiente';
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold">📋 Cuaderno de Asistencia</h2>
              <p className="text-muted-foreground">{groupName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Alumnos</span>
              </div>
              <p className="text-2xl font-bold">{data.globalStats.totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sesiones</span>
              </div>
              <p className="text-2xl font-bold">
                {data.globalStats.completedSessions}/{data.globalStats.totalSessions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Asist. Promedio</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{data.globalStats.averageAttendance}%</p>
            </CardContent>
          </Card>
          <Card className={cn(data.globalStats.criticalStudents > 0 && 'border-amber-300 bg-amber-50 dark:bg-amber-950/20')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn('h-4 w-4', data.globalStats.criticalStudents > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                <span className="text-sm text-muted-foreground">Críticos (&lt;70%)</span>
              </div>
              <p className={cn('text-2xl font-bold', data.globalStats.criticalStudents > 0 && 'text-amber-600')}>
                {data.globalStats.criticalStudents}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Página</span>
              </div>
              <p className="text-2xl font-bold">
                {data.pagination.currentPage}/{data.pagination.totalPages || 1}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Sessions per page */}
              <div className="space-y-1">
                <Label className="text-xs">Sesiones/página</Label>
                <Select value={sessionsPerPage.toString()} onValueChange={(v: string) => setSessionsPerPage(parseInt(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student filter */}
              <div className="space-y-1">
                <Label className="text-xs">Filtrar alumnos</Label>
                <Select value={studentFilter} onValueChange={(v: string) => setStudentFilter(v as 'all' | 'critical' | 'search')}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="critical">Críticos (&lt;70%)</SelectItem>
                    <SelectItem value="search">Buscar...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course filter */}
              {courses.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs">Asistencia por curso</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos los cursos</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Search input */}
              {studentFilter === 'search' && (
                <div className="space-y-1">
                  <Label className="text-xs">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre o DNI..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-48"
                    />
                  </div>
                </div>
              )}

              {/* Date range */}
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>

              {/* Clear filters */}
              {(startDate || endDate || studentFilter !== 'all' || selectedCourseId !== '_all_') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setStudentFilter('all');
                    setSearchTerm('');
                    setSelectedCourseId('_all_');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}

              {/* Pagination controls */}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sesiones {((page - 1) * sessionsPerPage) + 1}-{Math.min(page * sessionsPerPage, data.pagination.totalSessions)} de {data.pagination.totalSessions}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasNext}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Matrix */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-max">
                <table className="w-full border-collapse">
                  {/* Header */}
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="sticky left-0 bg-muted/50 z-10 p-3 text-left min-w-[200px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-2"
                          onClick={() => toggleSort('name')}
                        >
                          Alumno
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      {data.sessions.map((session) => {
                        const isReady = isSessionReadyToFinalize(session.id);
                        const isPending = session.status === 'pendiente';
                        
                        return (
                          <th
                            key={session.id}
                            className={cn(
                              'p-2 text-center min-w-[100px] cursor-pointer transition-colors',
                              isPending && isReady && 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100',
                              isPending && !isReady && 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100',
                              !isPending && 'bg-gray-100 dark:bg-gray-800'
                            )}
                            onClick={() => openSessionModal(session)}
                          >
                            <div className="text-xs font-medium">Ses. {session.number}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(session.date)}</div>
                            {isPending ? (
                              isReady ? (
                                <Badge variant="success" className="text-[10px] mt-1 cursor-pointer">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Listo
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px] mt-1">
                                  Pendiente
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="text-[10px] mt-1">
                                ✓ Dictada
                              </Badge>
                            )}
                          </th>
                        );
                      })}
                      <th className="p-2 text-center min-w-[100px] bg-muted/80">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => toggleSort('attendance')}
                        >
                          % Total
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="p-2 text-center min-w-[80px] bg-muted/80">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => toggleSort('absences')}
                        >
                          Faltas
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {data.students.length === 0 ? (
                      <tr>
                        <td colSpan={data.sessions.length + 3} className="p-8 text-center text-muted-foreground">
                          No hay alumnos que mostrar con los filtros actuales
                        </td>
                      </tr>
                    ) : (
                      data.students.map((student, idx) => (
                        <tr
                          key={student.id}
                          className={cn(
                            'border-b hover:bg-muted/30 transition-colors',
                            student.stats.isCritical && 'bg-amber-50/50 dark:bg-amber-950/10',
                            idx % 2 === 0 && 'bg-muted/10'
                          )}
                        >
                          <td className="sticky left-0 bg-inherit z-10 p-3 border-r">
                            <div className="flex items-center gap-2">
                              {student.stats.isCritical && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Asistencia crítica</TooltipContent>
                                </Tooltip>
                              )}
                              <div>
                                <div className="font-medium text-sm">{student.fullName}</div>
                                {student.dni && (
                                  <div className="text-xs text-muted-foreground">{student.dni}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {data.sessions.map((session) => {
                            const sessionData = student.sessions[session.id] || { status: 'pendiente', attendanceId: null, observationCount: 0 };
                            const hasObservations = sessionData.observationCount > 0;
                            
                            return (
                              <td
                                key={session.id}
                                className={cn(
                                  'p-2 text-center',
                                  session.status === 'pendiente' && 'bg-gray-50/50 dark:bg-gray-800/30'
                                )}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {/* Attendance dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="focus:outline-none hover:scale-110 transition-transform">
                                        <StatusIcon status={sessionData.status} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center">
                                      {STATUS_OPTIONS.map((option) => (
                                        <DropdownMenuItem
                                          key={option.value}
                                          onClick={() => handleStatusChange(student.id, session.id, sessionData.attendanceId, option.value)}
                                          className="gap-2"
                                        >
                                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', option.bg)}>
                                            <option.icon className={cn('h-3 w-3', option.color)} />
                                          </div>
                                          {option.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Observations indicator/button */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => openObservationsModal(student, session.id, sessionData.attendanceId)}
                                        className={cn(
                                          'text-xs flex items-center gap-0.5 hover:underline',
                                          hasObservations ? 'text-blue-600' : 'text-gray-400'
                                        )}
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        {hasObservations && <span>{sessionData.observationCount}</span>}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {hasObservations 
                                        ? `${sessionData.observationCount} observación(es)` 
                                        : 'Agregar observación'}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-2 text-center bg-muted/30">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={cn(
                                  'font-bold',
                                  student.stats.percentage >= 90 && 'text-green-600',
                                  student.stats.percentage >= 70 && student.stats.percentage < 90 && 'text-amber-600',
                                  student.stats.percentage < 70 && 'text-red-600'
                                )}
                              >
                                {student.stats.percentage}%
                              </span>
                              <Progress
                                value={student.stats.percentage}
                                className={cn(
                                  'h-1.5 w-16',
                                  student.stats.percentage >= 90 && '[&>div]:bg-green-500',
                                  student.stats.percentage >= 70 && student.stats.percentage < 90 && '[&>div]:bg-amber-500',
                                  student.stats.percentage < 70 && '[&>div]:bg-red-500'
                                )}
                              />
                            </div>
                          </td>
                          <td className="p-2 text-center bg-muted/30">
                            <span className={cn(
                              'font-medium',
                              student.stats.absences > 0 && 'text-red-600'
                            )}>
                              {student.stats.absences}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Footer - Session stats */}
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50">
                      <td className="sticky left-0 bg-muted/50 z-10 p-3 font-medium border-r">
                        📊 % Asistencia Sesión
                      </td>
                      {data.sessionStats.map((stat) => (
                        <td key={stat.sessionId} className="p-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={cn(
                                'font-bold text-sm',
                                stat.percentage >= 90 && 'text-green-600',
                                stat.percentage >= 70 && stat.percentage < 90 && 'text-amber-600',
                                stat.percentage < 70 && 'text-red-600'
                              )}
                            >
                              {stat.percentage}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {stat.attended}/{stat.total}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="p-2 text-center bg-muted/80">
                        <span className="font-bold text-green-600">
                          {data.globalStats.averageAttendance}%
                        </span>
                      </td>
                      <td className="p-2 text-center bg-muted/80">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium">Leyenda:</span>
              <div className="flex items-center gap-2">
                <StatusIcon status="asistio" size="sm" />
                <span>Asistió</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="no_asistio" size="sm" />
                <span>Falta</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="tarde" size="sm" />
                <span>Tardanza</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="justificado" size="sm" />
                <span>Justificado</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="permiso" size="sm" />
                <span>Permiso</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="pendiente" size="sm" />
                <span>Pendiente</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Asistencia crítica (&lt;70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span>Click para observaciones</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Finalization Modal */}
        <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedSession?.status === 'dictada' ? 'Detalles de Sesión' : 'Finalizar Sesión'}
              </DialogTitle>
              <DialogDescription>
                Sesión #{selectedSession?.number} - {selectedSession && formatFullDate(selectedSession.date)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Session status indicator */}
              {selectedSession?.status === 'pendiente' && (
                <div className={cn(
                  'p-3 rounded-lg',
                  isSessionReadyToFinalize(selectedSession?.id || '') 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                )}>
                  {isSessionReadyToFinalize(selectedSession?.id || '') ? (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Todas las asistencias están marcadas. Puede finalizar la sesión.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Aún hay asistencias pendientes de marcar.
                    </p>
                  )}
                </div>
              )}

              {/* Actual date */}
              <div className="space-y-2">
                <Label>Fecha real de dictado</Label>
                <Input
                  type="date"
                  value={sessionFormData.actualDate}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, actualDate: e.target.value }))}
                  disabled={selectedSession?.status === 'dictada'}
                />
              </div>

              {/* Instructor */}
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Select
                  value={sessionFormData.actualInstructorId}
                  onValueChange={(v: string) => setSessionFormData(prev => ({ ...prev, actualInstructorId: v }))}
                  disabled={selectedSession?.status === 'dictada'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar instructor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <Label>Tema dictado</Label>
                <Input
                  placeholder="Tema de la sesión..."
                  value={sessionFormData.actualTopic}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, actualTopic: e.target.value }))}
                  disabled={selectedSession?.status === 'dictada'}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas / Observaciones</Label>
                <Textarea
                  placeholder="Observaciones de la sesión..."
                  value={sessionFormData.notes}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  disabled={selectedSession?.status === 'dictada'}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSessionModalOpen(false)}>
                Cancelar
              </Button>
              {selectedSession?.status === 'pendiente' && (
                <Button
                  onClick={handleFinalizeSession}
                  disabled={savingSession}
                  className="gap-2"
                >
                  {savingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Finalizar Sesión
                </Button>
              )}
              {selectedSession?.status === 'dictada' && (
                <Button
                  onClick={handleReopenSession}
                  disabled={savingSession}
                  variant="outline"
                  className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  {savingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Reabrir Sesión
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Observations Modal */}
        <Dialog open={observationsModalOpen} onOpenChange={setObservationsModalOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Observaciones
              </DialogTitle>
              <DialogDescription>
                {selectedStudentForObs?.student.fullName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Existing observations */}
              {selectedStudentForObs && (
                <div className="space-y-2">
                  <Label>Historial de observaciones</Label>
                  <ScrollArea className="h-40 border rounded-lg p-2">
                    {loadingObservations ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : loadedObservations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay observaciones registradas
                      </p>
                    ) : (
                      loadedObservations.map((obs: StudentObservation, idx: number) => (
                        <div key={obs.id || idx} className="p-2 bg-muted/50 rounded mb-2">
                          <p className="text-sm">{obs.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {obs.userName || 'Usuario'} - {new Date(obs.createdAt).toLocaleString('es-ES')}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Add new observation */}
              <div className="space-y-2">
                <Label>Nueva observación</Label>
                <Textarea
                  placeholder="Escribir observación..."
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setObservationsModalOpen(false)}>
                Cerrar
              </Button>
              <Button
                onClick={handleAddObservation}
                disabled={savingObservation || !newObservation.trim()}
                className="gap-2"
              >
                {savingObservation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
