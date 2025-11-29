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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Types
interface NotebookSession {
  id: string;
  number: number;
  date: string;
  status: 'pendiente' | 'dictada';
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

interface NotebookStudent {
  id: string;
  enrollmentId: string;
  fullName: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  dni: string | null;
  sessions: Record<string, string>;
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

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'asistio':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case 'no_asistio':
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      );
    case 'tarde':
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      );
    case 'justificado':
    case 'permiso':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
  
  // Filters state
  const [page, setPage] = useState(1);
  const [sessionsPerPage, setSessionsPerPage] = useState(5);
  const [studentFilter, setStudentFilter] = useState<'all' | 'critical' | 'search'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'absences'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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
      });
      setData(response);
    } catch (error) {
      console.error('Error loading notebook:', error);
      toast.error('Error al cargar el cuaderno de asistencia');
    } finally {
      setLoading(false);
    }
  }, [groupId, page, sessionsPerPage, studentFilter, searchTerm, sortBy, sortOrder, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Export to CSV
  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Alumno', 'DNI', ...data.sessions.map(s => `Sesión ${s.number} (${formatDate(s.date)})`), '% Asistencia', 'Asistencias', 'Faltas'];
    const rows = data.students.map(student => [
      student.fullName,
      student.dni || '',
      ...data.sessions.map(s => getStatusLabel(student.sessions[s.id] || 'pendiente')),
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
              {(startDate || endDate || studentFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setStudentFilter('all');
                    setSearchTerm('');
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
                      {data.sessions.map((session) => (
                        <th
                          key={session.id}
                          className={cn(
                            'p-2 text-center min-w-[80px]',
                            session.status === 'pendiente' && 'bg-gray-100 dark:bg-gray-800'
                          )}
                        >
                          <div className="text-xs font-medium">Ses. {session.number}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(session.date)}</div>
                          {session.status === 'pendiente' && (
                            <Badge variant="secondary" className="text-[10px] mt-1">Pend.</Badge>
                          )}
                        </th>
                      ))}
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
                          {data.sessions.map((session) => (
                            <td
                              key={session.id}
                              className={cn(
                                'p-2 text-center',
                                session.status === 'pendiente' && 'bg-gray-50 dark:bg-gray-800/50'
                              )}
                            >
                              <Tooltip>
                                <TooltipTrigger className="mx-auto">
                                  <StatusIcon status={student.sessions[session.id] || 'pendiente'} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {getStatusLabel(student.sessions[session.id] || 'pendiente')}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          ))}
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
                <StatusIcon status="asistio" />
                <span>Asistió</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="no_asistio" />
                <span>Falta</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="tarde" />
                <span>Tardanza</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="justificado" />
                <span>Justificado/Permiso</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="pendiente" />
                <span>Pendiente</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Asistencia crítica (&lt;70%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
