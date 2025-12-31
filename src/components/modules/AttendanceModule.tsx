'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ClipboardList,
  Clock,
  AlertCircle,
  ChevronRight,
  Users,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ListChecks,
  CalendarDays,
  Timer,
  GitGraph,
  BookOpen,
  RotateCcw,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AttendanceSheet } from './AttendanceSheet';
import { AttendanceNotebook } from './AttendanceNotebook';
import { cn } from '@/lib/utils';

// Types
interface GroupWithStats {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  frequency: string;
  startTime: string;
  endTime: string;
  totalSessions: number;
  dictadas: number;
  pendientes: number;
  enrolledStudents: number;
}

interface SessionTopic {
  id: string;
  courseId: string;
  topicTitle: string;
  instructorId: string | null;
  courseName: string;
  instructorName: string | null;
}

interface GroupSession {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'pendiente' | 'dictada' | 'suspendida';
  suspensionReason?: string | null;
  topics: SessionTopic[];
  hasExecution: boolean;
}

interface PendingSession {
  sessionId: string;
  sessionNumber: number;
  sessionDate: string;
  groupId: string;
  groupName: string;
  daysOverdue: number;
  isToday: boolean;
}

type ViewMode = 'list' | 'calendar' | 'pending' | 'timeline' | 'notebook';

// Helper function to parse date strings without timezone issues
const parseDate = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};

// Helper function to format dates consistently
const formatSessionDate = (dateStr: string, options: Intl.DateTimeFormatOptions): string => {
  return parseDate(dateStr).toLocaleDateString('es-ES', options);
};

export default function AttendanceModule({ branchId }: { branchId: string }) {
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithStats | null>(null);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');  // Default to list view (mobile-compatible)
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showAttendanceSheet, setShowAttendanceSheet] = useState(false);

  // Suspension dialog state
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [sessionToSuspend, setSessionToSuspend] = useState<GroupSession | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Predefined suspension reasons
  const SUSPENSION_REASONS = [
    { value: 'feriado', label: 'Feriado no programado' },
    { value: 'clima', label: 'Condiciones climáticas' },
    { value: 'luz', label: 'Corte de luz' },
    { value: 'agua', label: 'Corte de agua' },
    { value: 'instructor', label: 'Instructor ausente' },
    { value: 'local', label: 'Local no disponible' },
    { value: 'otro', label: 'Otro (especificar)' },
  ];

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAttendanceGroups(branchId);
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // Load pending sessions
  const loadPendingSessions = useCallback(async () => {
    try {
      const response = await api.getPendingSessions(branchId);
      setPendingSessions(response.data || []);
    } catch (error) {
      console.error('Error loading pending sessions:', error);
    }
  }, [branchId]);

  // Load sessions for a group
  const loadSessions = useCallback(async (groupId: string) => {
    try {
      setLoadingSessions(true);
      const response = await api.getGroupSessions(groupId, 'all');
      setSessions(response.data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Error al cargar sesiones');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadPendingSessions();
  }, [loadGroups, loadPendingSessions]);

  useEffect(() => {
    if (selectedGroup) {
      loadSessions(selectedGroup.id);
    }
  }, [selectedGroup, loadSessions]);

  const handleSelectGroup = (group: GroupWithStats) => {
    setSelectedGroup(group);
    setSelectedSession(null);
    setShowAttendanceSheet(false);
  };

  const handleSelectSession = (session: GroupSession) => {
    setSelectedSession(session);
    setShowAttendanceSheet(true);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setSelectedSession(null);
    setSessions([]);
    setShowAttendanceSheet(false);
    loadGroups();
    loadPendingSessions();
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setShowAttendanceSheet(false);
    if (selectedGroup) {
      loadSessions(selectedGroup.id);
    }
  };

  const handleSessionCompleted = () => {
    if (selectedGroup) {
      loadSessions(selectedGroup.id);
    }
    loadGroups();
    loadPendingSessions();
    setSelectedSession(null);
    setShowAttendanceSheet(false);
  };

  // Handle reopen session from any view
  const handleReopenSession = async (session: GroupSession) => {
    try {
      await api.reopenSession(session.id);
      toast.success('Sesión reabierta. Ahora puede editar la asistencia.');
      // Reload sessions to reflect the change
      if (selectedGroup) {
        loadSessions(selectedGroup.id);
      }
      loadGroups();
      loadPendingSessions();
    } catch (error) {
      console.error('Error reopening session:', error);
      toast.error('Error al reabrir la sesión');
    }
  };

  // Open suspend dialog
  const handleSuspendSession = (session: GroupSession) => {
    setSessionToSuspend(session);
    setSuspendReason('');
    setCustomReason('');
    setSuspendDialogOpen(true);
  };

  // Confirm suspension
  const confirmSuspendSession = async () => {
    if (!sessionToSuspend) return;

    const finalReason = suspendReason === 'otro'
      ? customReason
      : SUSPENSION_REASONS.find(r => r.value === suspendReason)?.label || suspendReason;

    if (!finalReason || finalReason.trim().length < 3) {
      toast.error('Debe especificar una razón para suspender');
      return;
    }

    try {
      setSuspending(true);
      await api.postponeSession(sessionToSuspend.id, finalReason);
      toast.success('Sesión suspendida exitosamente');
      setSuspendDialogOpen(false);
      setSessionToSuspend(null);

      // Reload sessions to reflect the change
      if (selectedGroup) {
        loadSessions(selectedGroup.id);
      }
      loadGroups();
      loadPendingSessions();
    } catch (error: any) {
      console.error('Error suspending session:', error);
      toast.error(error.response?.data?.error || 'Error al suspender la sesión');
    } finally {
      setSuspending(false);
    }
  };

  // Reactivate suspended session
  const handleReactivateSession = async (session: GroupSession) => {
    try {
      await api.reactivateSession(session.id);
      toast.success('Sesión reactivada. Ahora puede registrar asistencia.');

      if (selectedGroup) {
        loadSessions(selectedGroup.id);
      }
      loadGroups();
      loadPendingSessions();
    } catch (error: any) {
      console.error('Error reactivating session:', error);
      toast.error(error.response?.data?.error || 'Error al reactivar la sesión');
    }
  };

  const handleOpenPendingSession = (pending: PendingSession) => {
    // Encontrar el grupo
    const group = groups.find((g) => g.id === pending.groupId);
    if (group) {
      setSelectedGroup(group);
      // Cargar sesiones y seleccionar la pendiente
      api.getGroupSessions(pending.groupId, 'all').then((response) => {
        setSessions(response.data || []);
        const session = response.data.find((s: GroupSession) => s.id === pending.sessionId);
        if (session) {
          setSelectedSession(session);
          setShowAttendanceSheet(true);
        }
      });
    }
  };

  // Render attendance sheet when a session is selected
  if (showAttendanceSheet && selectedSession && selectedGroup) {
    return (
      <AttendanceSheet
        session={selectedSession}
        group={selectedGroup}
        onBack={handleBackToSessions}
        onSessionCompleted={handleSessionCompleted}
      />
    );
  }

  // Render session list when a group is selected
  if (selectedGroup && !showAttendanceSheet) {
    return (
      <div className="space-y-6">
        {/* Header con navegación - Responsive */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" onClick={handleBackToGroups} className="gap-1 md:gap-2 px-2 md:px-3">
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span className="hidden sm:inline">Volver a grupos</span>
              <span className="sm:hidden">Volver</span>
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{selectedGroup.name}</h2>
              <p className="text-gray-500 text-xs md:text-sm truncate">
                {selectedGroup.enrolledStudents} estudiantes • {selectedGroup.totalSessions} sesiones
              </p>
            </div>
          </div>
          {/* View mode toggle - Compact on mobile */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9 md:h-10">
              <TabsTrigger value="list" className="gap-1 md:gap-2 px-2 md:px-3">
                <ListChecks className="h-4 w-4" />
                <span className="hidden md:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="notebook" className="gap-1 md:gap-2 px-2 md:px-3 hidden sm:flex">
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">Cuaderno</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1 md:gap-2 px-2 md:px-3 hidden sm:flex">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden md:inline">Calendario</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1 md:gap-2 px-2 md:px-3">
                <Timer className="h-4 w-4" />
                <span className="hidden md:inline">Pendientes</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1 md:gap-2 px-2 md:px-3 hidden sm:flex">
                <GitGraph className="h-4 w-4" />
                <span className="hidden md:inline">Timeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progreso del grupo</span>
              <span className="text-sm font-medium">
                {selectedGroup.dictadas} de {selectedGroup.totalSessions} sesiones dictadas
              </span>
            </div>
            <Progress
              value={
                selectedGroup.totalSessions > 0
                  ? (selectedGroup.dictadas / selectedGroup.totalSessions) * 100
                  : 0
              }
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Sessions View */}
        {loadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'notebook' ? (
          <AttendanceNotebook
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onBack={handleBackToGroups}
          />
        ) : viewMode === 'list' ? (
          <SessionListView
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onReopenSession={handleReopenSession}
            onSuspendSession={handleSuspendSession}
            onReactivateSession={handleReactivateSession}
          />
        ) : viewMode === 'calendar' ? (
          <SessionCalendarView
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onReopenSession={handleReopenSession}
            onSuspendSession={handleSuspendSession}
            onReactivateSession={handleReactivateSession}
          />
        ) : viewMode === 'pending' ? (
          <SessionPendingView
            sessions={sessions.filter((s) => s.status === 'pendiente')}
            onSelectSession={handleSelectSession}
            onReopenSession={handleReopenSession}
            onSuspendSession={handleSuspendSession}
            onReactivateSession={handleReactivateSession}
          />
        ) : (
          <SessionTimelineView
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onReopenSession={handleReopenSession}
            onSuspendSession={handleSuspendSession}
            onReactivateSession={handleReactivateSession}
          />
        )}
      </div>
    );
  }

  // Render group selection
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Responsive */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Registro de Asistencias
          </h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5 hidden sm:block">
            Selecciona un grupo para registrar asistencia
          </p>
        </div>
      </div>

      {/* Pending sessions alert */}
      {pendingSessions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Sesiones Pendientes de Registro
            </CardTitle>
            <CardDescription className="text-amber-600/80">
              Tienes {pendingSessions.length} sesiones que requieren registro de asistencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {pendingSessions.slice(0, 5).map((pending) => (
                  <div
                    key={pending.sessionId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-amber-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                          pending.isToday
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-red-100 text-red-600'
                        )}
                      >
                        {pending.isToday ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{pending.groupName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Sesión #{pending.sessionNumber} •{' '}
                          {formatSessionDate(pending.sessionDate, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                      {pending.isToday ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="whitespace-nowrap">
                          {pending.daysOverdue} días atraso
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenPendingSession(pending)}
                        className="flex-shrink-0"
                      >
                        Registrar
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingSessions.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    Y {pendingSessions.length - 5} más...
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Groups grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay grupos activos</h3>
            <p className="text-muted-foreground">
              No hay grupos activos con sesiones programadas en esta sucursal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSelect={() => handleSelectGroup(group)}
            />
          ))}
        </div>
      )}

      {/* Suspension Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-purple-600" />
              Suspender Sesión
            </DialogTitle>
            <DialogDescription>
              {sessionToSuspend && (
                <>
                  Sesión #{sessionToSuspend.sessionNumber} - {formatSessionDate(sessionToSuspend.sessionDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">¿Por qué se suspende la sesión?</Label>
              <Select value={suspendReason} onValueChange={setSuspendReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una razón..." />
                </SelectTrigger>
                <SelectContent>
                  {SUSPENSION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {suspendReason === 'otro' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Especifique la razón</Label>
                <Input
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Ej: Problemas con el local..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} disabled={suspending}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSuspendSession}
              disabled={suspending || !suspendReason || (suspendReason === 'otro' && !customReason.trim())}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {suspending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suspendiendo...
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Suspender Sesión
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// GROUP CARD COMPONENT
// ============================================

function GroupCard({
  group,
  onSelect,
}: {
  group: GroupWithStats;
  onSelect: () => void;
}) {
  const progress = group.totalSessions > 0
    ? (group.dictadas / group.totalSessions) * 100
    : 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 p-3"
      onClick={onSelect}
    >
      <div className="space-y-2">
        {/* Header compacto */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
          {group.pendientes > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300 text-xs px-1.5 py-0">
              {group.pendientes}
            </Badge>
          )}
        </div>

        {/* Stats compactos en una línea */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.enrolledStudents}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {group.dictadas}/{group.totalSessions}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {group.startTime?.slice(0, 5)}
          </span>
        </div>

        {/* Progress bar compacto */}
        <Progress value={progress} className="h-1.5" />
      </div>
    </Card>
  );
}

// ============================================
// SESSION LIST VIEW
// ============================================

function SessionListView({
  sessions,
  onSelectSession,
  onReopenSession,
  onSuspendSession,
  onReactivateSession,
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
  onReopenSession: (session: GroupSession) => void;
  onSuspendSession: (session: GroupSession) => void;
  onReactivateSession: (session: GroupSession) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const isPast = session.sessionDate < today;
        const isToday = session.sessionDate === today;
        const isSuspended = session.status === 'suspendida';

        return (
          <Card
            key={session.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              session.status === 'dictada' && 'bg-green-50 dark:bg-green-950/20 border-green-200',
              isSuspended && 'bg-purple-50 dark:bg-purple-950/20 border-purple-200',
              session.status === 'pendiente' && isPast && 'bg-amber-50 dark:bg-amber-950/20 border-amber-200',
              isToday && session.status === 'pendiente' && 'ring-2 ring-primary ring-offset-2'
            )}
            onClick={() => !isSuspended && onSelectSession(session)}
          >
            <CardContent className="py-3 px-3 sm:py-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Session number indicator */}
                  <div
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0',
                      session.status === 'dictada'
                        ? 'bg-green-100 text-green-700'
                        : isSuspended
                          ? 'bg-purple-100 text-purple-700'
                          : isPast
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {isSuspended ? <PauseCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : session.sessionNumber}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">Sesión #{session.sessionNumber}</p>
                      {session.status === 'dictada' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {isSuspended && (
                        <PauseCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {formatSessionDate(session.sessionDate, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    {isSuspended && session.suspensionReason && (
                      <p className="text-xs sm:text-sm text-purple-600 mt-1 truncate">
                        Razón: {session.suspensionReason}
                      </p>
                    )}
                    {!isSuspended && session.topics.length > 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                        {session.topics.map((t) => t.topicTitle).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                  {session.status === 'dictada' ? (
                    <>
                      <Badge className="bg-green-600 text-xs">Dictada</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onReopenSession(session);
                        }}
                        title="Reabrir sesión"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 sm:px-3"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Reabrir</span>
                      </Button>
                    </>
                  ) : isSuspended ? (
                    <>
                      <Badge className="bg-purple-600 text-xs">Suspendida</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onReactivateSession(session);
                        }}
                        title="Reactivar sesión"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 sm:px-3"
                      >
                        <PlayCircle className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Reactivar</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      {isPast ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300 text-xs whitespace-nowrap">
                          Registrar
                        </Badge>
                      ) : isToday ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Programada</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onSuspendSession(session);
                        }}
                        title="Suspender sesión"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 sm:px-3"
                      >
                        <PauseCircle className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Suspender</span>
                      </Button>
                    </>
                  )}
                  {!isSuspended && <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {sessions.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay sesiones</h3>
            <p className="text-muted-foreground">
              Este grupo no tiene sesiones programadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// SESSION CALENDAR VIEW
// ============================================

function SessionCalendarView({
  sessions,
  onSelectSession,
  onReopenSession,
  onSuspendSession,
  onReactivateSession,
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
  onReopenSession: (session: GroupSession) => void;
  onSuspendSession: (session: GroupSession) => void;
  onReactivateSession: (session: GroupSession) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthSessions = sessions.filter((s) => {
    const sessionDate = parseDate(s.sessionDate);
    return (
      sessionDate.getMonth() === currentMonth.getMonth() &&
      sessionDate.getFullYear() === currentMonth.getFullYear()
    );
  });

  const getSessionForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return monthSessions.find((s) => s.sessionDate === dateStr);
  };

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentMonth.getMonth() &&
    today.getFullYear() === currentMonth.getFullYear();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
              )
            }
          >
            Anterior
          </Button>
          <h3 className="font-medium">
            {currentMonth.toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
              )
            }
          >
            Siguiente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-20" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const session = getSessionForDay(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <div
                key={day}
                className={cn(
                  'h-20 border rounded-lg p-1 relative',
                  isToday && 'ring-2 ring-primary',
                  session && 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={() => session && onSelectSession(session)}
              >
                <span
                  className={cn(
                    'text-sm',
                    isToday && 'font-bold text-primary'
                  )}
                >
                  {day}
                </span>
                {session && (
                  <div
                    className={cn(
                      'absolute bottom-1 left-1 right-1 rounded px-1 py-0.5 text-xs truncate',
                      session.status === 'dictada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    S#{session.sessionNumber}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// SESSION PENDING VIEW
// ============================================

function SessionPendingView({
  sessions,
  onSelectSession,
  onReopenSession,
  onSuspendSession,
  onReactivateSession,
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
  onReopenSession: (session: GroupSession) => void;
  onSuspendSession: (session: GroupSession) => void;
  onReactivateSession: (session: GroupSession) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  const sortedSessions = [...sessions].sort((a, b) =>
    a.sessionDate.localeCompare(b.sessionDate)
  );

  const overdueOrToday = sortedSessions.filter((s) => s.sessionDate <= today);
  const upcoming = sortedSessions.filter((s) => s.sessionDate > today);

  return (
    <div className="space-y-6">
      {overdueOrToday.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Requieren registro inmediato
          </h3>
          {overdueOrToday.map((session) => {
            const isToday = session.sessionDate === today;
            const daysOverdue = Math.floor(
              (parseDate(today).getTime() - parseDate(session.sessionDate).getTime()) /
              (1000 * 60 * 60 * 24)
            );

            return (
              <Card
                key={session.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isToday
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-red-300 bg-red-50'
                )}
                onClick={() => onSelectSession(session)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          isToday
                            ? 'bg-amber-200 text-amber-700'
                            : 'bg-red-200 text-red-700'
                        )}
                      >
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">Sesión #{session.sessionNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatSessionDate(session.sessionDate, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isToday ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700 border-amber-300"
                        >
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          {daysOverdue} días de atraso
                        </Badge>
                      )}
                      <Button size="sm">Registrar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Próximas sesiones</h3>
          {upcoming.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => onSelectSession(session)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold">
                      {session.sessionNumber}
                    </div>
                    <div>
                      <p className="font-medium">Sesión #{session.sessionNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatSessionDate(session.sessionDate, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Programada</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">¡Todo al día!</h3>
            <p className="text-muted-foreground">
              No hay sesiones pendientes de registro
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// SESSION TIMELINE VIEW
// ============================================

function SessionTimelineView({
  sessions,
  onSelectSession,
  onReopenSession,
  onSuspendSession,
  onReactivateSession,
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
  onReopenSession: (session: GroupSession) => void;
  onSuspendSession: (session: GroupSession) => void;
  onReactivateSession: (session: GroupSession) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {sessions.map((session, index) => {
          const isPast = session.sessionDate < today;
          const isToday = session.sessionDate === today;

          return (
            <div
              key={session.id}
              className="relative pl-14 cursor-pointer"
              onClick={() => onSelectSession(session)}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute left-4 w-5 h-5 rounded-full border-4 border-background',
                  session.status === 'dictada'
                    ? 'bg-green-500'
                    : isPast
                      ? 'bg-amber-500'
                      : isToday
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                )}
              />

              <Card
                className={cn(
                  'transition-all hover:shadow-md',
                  session.status === 'dictada' && 'border-green-200',
                  session.status === 'pendiente' && isPast && 'border-amber-200',
                  isToday && 'ring-1 ring-blue-500'
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Sesión #{session.sessionNumber}</span>
                        {session.status === 'dictada' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.sessionDate).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.status === 'dictada' ? (
                        <>
                          <Badge className="bg-green-600">Dictada</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onReopenSession(session);
                            }}
                            title="Reabrir sesión"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : isPast ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700 border-amber-300"
                        >
                          Por registrar
                        </Badge>
                      ) : isToday ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 border-blue-300"
                        >
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Programada</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
