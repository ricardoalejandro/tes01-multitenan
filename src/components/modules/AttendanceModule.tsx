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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AttendanceSheet } from './AttendanceSheet';
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
  status: 'pendiente' | 'dictada';
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

type ViewMode = 'list' | 'calendar' | 'pending' | 'timeline';

export default function AttendanceModule({ branchId }: { branchId: string }) {
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithStats | null>(null);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showAttendanceSheet, setShowAttendanceSheet] = useState(false);

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
        {/* Header con navegación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToGroups} className="gap-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Volver a grupos
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
              <p className="text-muted-foreground">
                {selectedGroup.enrolledStudents} estudiantes • {selectedGroup.totalSessions} sesiones
              </p>
            </div>
          </div>
          {/* View mode toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <ListChecks className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Timer className="h-4 w-4" />
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <GitGraph className="h-4 w-4" />
                Timeline
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
        ) : viewMode === 'list' ? (
          <SessionListView
            sessions={sessions}
            onSelectSession={handleSelectSession}
          />
        ) : viewMode === 'calendar' ? (
          <SessionCalendarView
            sessions={sessions}
            onSelectSession={handleSelectSession}
          />
        ) : viewMode === 'pending' ? (
          <SessionPendingView
            sessions={sessions.filter((s) => s.status === 'pendiente')}
            onSelectSession={handleSelectSession}
          />
        ) : (
          <SessionTimelineView
            sessions={sessions}
            onSelectSession={handleSelectSession}
          />
        )}
      </div>
    );
  }

  // Render group selection
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Registro de Asistencias
          </h2>
          <p className="text-muted-foreground">
            Selecciona un grupo para registrar asistencia de sus sesiones
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
                    className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
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
                      <div>
                        <p className="font-medium">{pending.groupName}</p>
                        <p className="text-sm text-muted-foreground">
                          Sesión #{pending.sessionNumber} •{' '}
                          {new Date(pending.sessionDate).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pending.isToday ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {pending.daysOverdue} días de atraso
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPendingSession(pending)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSelect={() => handleSelectGroup(group)}
            />
          ))}
        </div>
      )}
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
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          {group.pendientes > 0 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              {group.pendientes} pendientes
            </Badge>
          )}
        </div>
        {group.description && (
          <CardDescription className="line-clamp-2">{group.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {group.enrolledStudents} estudiantes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {group.totalSessions} sesiones
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">
              {group.dictadas}/{group.totalSessions}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {group.startTime?.slice(0, 5)} - {group.endTime?.slice(0, 5)} • {group.frequency || 'No definido'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// SESSION LIST VIEW
// ============================================

function SessionListView({
  sessions,
  onSelectSession,
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const isPast = session.sessionDate < today;
        const isToday = session.sessionDate === today;

        return (
          <Card
            key={session.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              session.status === 'dictada' && 'bg-green-50 dark:bg-green-950/20 border-green-200',
              session.status === 'pendiente' && isPast && 'bg-amber-50 dark:bg-amber-950/20 border-amber-200',
              isToday && session.status === 'pendiente' && 'ring-2 ring-primary ring-offset-2'
            )}
            onClick={() => onSelectSession(session)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Session number indicator */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
                      session.status === 'dictada'
                        ? 'bg-green-100 text-green-700'
                        : isPast
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {session.sessionNumber}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Sesión #{session.sessionNumber}</p>
                      {session.status === 'dictada' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.sessionDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {session.topics.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {session.topics.map((t) => t.topicTitle).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {session.status === 'dictada' ? (
                    <Badge className="bg-green-600">Dictada</Badge>
                  ) : isPast ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Por registrar
                    </Badge>
                  ) : isToday ? (
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Hoy
                    </Badge>
                  ) : (
                    <Badge variant="outline">Programada</Badge>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
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
    const sessionDate = new Date(s.sessionDate);
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
            variant="outline"
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
            variant="outline"
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
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
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
              (new Date(today).getTime() - new Date(session.sessionDate).getTime()) /
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
                          {new Date(session.sessionDate).toLocaleDateString('es-ES', {
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
                          variant="outline"
                          className="bg-amber-100 text-amber-700 border-amber-300"
                        >
                          Hoy
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
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
                        {new Date(session.sessionDate).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Programada</Badge>
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
}: {
  sessions: GroupSession[];
  onSelectSession: (session: GroupSession) => void;
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

                    {session.status === 'dictada' ? (
                      <Badge className="bg-green-600">Dictada</Badge>
                    ) : isPast ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-700 border-amber-300"
                      >
                        Por registrar
                      </Badge>
                    ) : isToday ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-700 border-blue-300"
                      >
                        Hoy
                      </Badge>
                    ) : (
                      <Badge variant="outline">Programada</Badge>
                    )}
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
