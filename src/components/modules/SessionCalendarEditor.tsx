'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, ChevronDown, ChevronRight, Trash2, Plus, 
  GripVertical, AlertTriangle, CheckCircle2, XCircle,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Topic {
  courseId: string;
  courseName: string;
  topicMode: 'auto' | 'selected' | 'manual';
  topicTitle: string;
  topicDescription: string;
  instructorId: string;
  orderIndex: number;
  isEmpty?: boolean;
}

interface Session {
  sessionNumber: number;
  sessionDate: string;
  topics: Topic[];
}

interface Props {
  sessions: Session[];
  onChange: (sessions: Session[]) => void;
  courseTopics: Record<string, any[]>; // courseId -> themes[]
  instructors: any[];
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
}

// Componente para sesión ordenable
interface SortableSessionProps {
  session: Session;
  sessionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (field: string, value: any) => void;
  onUpdateTopic: (topicIndex: number, field: string, value: any) => void;
  courseTopics: Record<string, any[]>;
  instructors: any[];
  validation: SessionValidation;
}

interface SessionValidation {
  dateError?: string;
  gapWarning?: string;
  hasEmptyTopics: boolean;
  emptyTopicIndices: number[];
}

function SortableSession({
  session,
  sessionIndex,
  isExpanded,
  onToggle,
  onDelete,
  onUpdate,
  onUpdateTopic,
  courseTopics,
  instructors,
  validation,
}: SortableSessionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.sessionNumber });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Función para parsear fecha sin problemas de timezone
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  };

  const formatSessionDate = (dateString: string): string => {
    if (!dateString) return 'Fecha no definida';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const hasIssues = validation.dateError || validation.gapWarning || validation.hasEmptyTopics;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        isDragging && "opacity-50 shadow-lg",
        validation.dateError && "border-red-400 bg-red-50/30",
        !validation.dateError && validation.hasEmptyTopics && "border-amber-400 bg-amber-50/30",
        !validation.dateError && !validation.hasEmptyTopics && validation.gapWarning && "border-yellow-400 bg-yellow-50/30",
        !hasIssues && "border-neutral-4"
      )}
    >
      <div className="w-full px-4 py-3 bg-neutral-2 hover:bg-neutral-3 flex items-center justify-between transition-colors">
        {/* Handle de arrastre */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-neutral-4 rounded mr-2"
        >
          <GripVertical className="h-5 w-5 text-neutral-9" />
        </div>

        <div 
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={onToggle}
        >
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <span className="font-semibold">Sesión {session.sessionNumber}</span>
          <span className="text-neutral-10">- {formatSessionDate(session.sessionDate)}</span>
          
          {/* Indicadores de estado */}
          <div className="flex items-center gap-1 ml-2">
            {validation.dateError && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Error fecha
              </Badge>
            )}
            {validation.hasEmptyTopics && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Tema vacío
              </Badge>
            )}
            {validation.gapWarning && !validation.dateError && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 bg-yellow-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Gap
              </Badge>
            )}
            {!hasIssues && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Mensajes de validación */}
      {(validation.dateError || validation.gapWarning) && (
        <div className="px-4 py-2 border-b border-neutral-3 space-y-1">
          {validation.dateError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validation.dateError}</span>
            </div>
          )}
          {validation.gapWarning && !validation.dateError && (
            <div className="flex items-center gap-2 text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{validation.gapWarning}</span>
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha de la sesión
            </label>
            <Input
              type="date"
              value={session.sessionDate}
              onChange={(e) => onUpdate('sessionDate', e.target.value)}
              className={cn(validation.dateError && "border-red-400")}
            />
          </div>

          {(session.topics || []).map((topic, topicIndex) => {
            const isEmptyTopic = validation.emptyTopicIndices.includes(topicIndex);
            
            return (
              <div 
                key={topicIndex} 
                className={cn(
                  "border rounded-lg p-4 space-y-3",
                  isEmptyTopic ? "border-amber-400 bg-amber-50/50" : "border-neutral-3"
                )}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-accent-11">📚 {topic.courseName}</h4>
                  {isEmptyTopic && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Tema pendiente
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Modo del tema</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={topic.topicMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => onUpdateTopic(topicIndex, 'topicMode', 'auto')}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={topic.topicMode === 'selected' ? 'default' : 'outline'}
                      onClick={() => onUpdateTopic(topicIndex, 'topicMode', 'selected')}
                    >
                      Seleccionar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={topic.topicMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => onUpdateTopic(topicIndex, 'topicMode', 'manual')}
                    >
                      Manual
                    </Button>
                  </div>
                </div>

                {topic.topicMode === 'selected' && (
                  <div>
                    <label className="text-sm font-medium">Seleccionar tema del curso</label>
                    <Select
                      value={topic.topicTitle}
                      onValueChange={(value) => {
                        const selectedTheme = courseTopics[topic.courseId]?.find((t) => t.title === value);
                        onUpdateTopic(topicIndex, 'topicTitle', value);
                        if (selectedTheme) {
                          onUpdateTopic(topicIndex, 'topicDescription', selectedTheme.description || '');
                        }
                      }}
                    >
                      <SelectTrigger className={cn(isEmptyTopic && !topic.topicTitle && "border-amber-400")}>
                        <SelectValue placeholder="Seleccionar tema" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseTopics[topic.courseId]?.map((theme: any) => (
                          <SelectItem key={theme.id} value={theme.title}>
                            {theme.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {topic.topicMode === 'manual' && (
                  <div>
                    <label className="text-sm font-medium">Título del tema (manual) *</label>
                    <Input
                      value={topic.topicTitle}
                      onChange={(e) => onUpdateTopic(topicIndex, 'topicTitle', e.target.value)}
                      placeholder="Escribe el tema manualmente"
                      className={cn(isEmptyTopic && !topic.topicTitle && "border-amber-400")}
                    />
                    {isEmptyTopic && !topic.topicTitle && (
                      <p className="text-xs text-amber-600 mt-1">Este tema es obligatorio</p>
                    )}
                  </div>
                )}

                {topic.topicMode === 'auto' && (
                  <div className={cn(
                    "border rounded p-2 text-sm",
                    topic.topicTitle 
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  )}>
                    {topic.topicTitle ? (
                      <>
                        <strong>Automático:</strong> {topic.topicTitle}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        <strong>Sin tema asignado.</strong> Cambie a modo &quot;Manual&quot; o &quot;Seleccionar&quot; para definir el tema.
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={topic.topicDescription}
                    onChange={(e) => onUpdateTopic(topicIndex, 'topicDescription', e.target.value)}
                    rows={2}
                    placeholder="Descripción del tema"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Instructor</label>
                  <Select
                    value={topic.instructorId}
                    onValueChange={(value) => onUpdateTopic(topicIndex, 'instructorId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.firstName} {instructor.paternalLastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SessionCalendarEditor({ 
  sessions, 
  onChange, 
  courseTopics, 
  instructors,
  recurrenceFrequency = 'weekly',
  recurrenceInterval = 1,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set([1]));

  // Sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calcular validaciones para cada sesión
  const sessionValidations = useMemo((): Map<number, SessionValidation> => {
    const validations = new Map<number, SessionValidation>();
    
    sessions.forEach((session, index) => {
      const validation: SessionValidation = {
        hasEmptyTopics: false,
        emptyTopicIndices: [],
      };

      // Validar orden de fechas
      if (index > 0) {
        const prevDate = new Date(sessions[index - 1].sessionDate);
        const currDate = new Date(session.sessionDate);
        if (currDate <= prevDate) {
          validation.dateError = `La fecha debe ser posterior a la sesión ${index} (${sessions[index - 1].sessionDate})`;
        }
      }

      // Detectar gaps en la frecuencia
      if (index > 0 && !validation.dateError && recurrenceFrequency === 'weekly') {
        const prevDate = new Date(sessions[index - 1].sessionDate);
        const currDate = new Date(session.sessionDate);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedDays = recurrenceInterval * 7;
        const maxExpectedGap = expectedDays + 3;
        
        if (diffDays > maxExpectedGap) {
          const weeksGap = Math.round(diffDays / 7);
          validation.gapWarning = `${weeksGap} semanas de diferencia (esperado: ${recurrenceInterval}). Posible feriado.`;
        }
      }

      // Detectar temas vacíos
      session.topics.forEach((topic, topicIndex) => {
        if (!topic.topicTitle || topic.topicTitle.trim() === '') {
          validation.hasEmptyTopics = true;
          validation.emptyTopicIndices.push(topicIndex);
        }
      });

      validations.set(session.sessionNumber, validation);
    });

    return validations;
  }, [sessions, recurrenceFrequency, recurrenceInterval]);

  const toggleSession = (sessionNumber: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionNumber)) {
      newExpanded.delete(sessionNumber);
    } else {
      newExpanded.add(sessionNumber);
    }
    setExpandedSessions(newExpanded);
  };

  const updateSession = (sessionIndex: number, field: string, value: any) => {
    const newSessions = [...sessions];
    (newSessions[sessionIndex] as any)[field] = value;
    onChange(newSessions);
  };

  const updateTopic = (sessionIndex: number, topicIndex: number, field: string, value: any) => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].topics[topicIndex] = {
      ...newSessions[sessionIndex].topics[topicIndex],
      [field]: value,
    };
    onChange(newSessions);
  };

  const deleteSession = (sessionIndex: number) => {
    const newSessions = sessions.filter((_, i) => i !== sessionIndex);
    // Renumerar sesiones
    newSessions.forEach((session, i) => {
      session.sessionNumber = i + 1;
    });
    onChange(newSessions);
  };

  const addSession = () => {
    const lastSession = sessions[sessions.length - 1];
    if (!lastSession) return;

    const newSession: Session = {
      sessionNumber: sessions.length + 1,
      sessionDate: lastSession.sessionDate, // Usuario debe editar
      topics: lastSession.topics.map((t) => ({ 
        ...t, 
        topicTitle: '', 
        topicDescription: '',
        topicMode: 'manual' as const,
      })),
    };
    onChange([...sessions, newSession]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sessions.findIndex((s) => s.sessionNumber === active.id);
      const newIndex = sessions.findIndex((s) => s.sessionNumber === over.id);

      const reordered = arrayMove(sessions, oldIndex, newIndex);
      
      // Renumerar después del reordenamiento
      reordered.forEach((session, i) => {
        session.sessionNumber = i + 1;
      });

      onChange(reordered);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      (s.sessionNumber?.toString() || '').includes(searchTerm) ||
      (s.sessionDate || '').includes(searchTerm) ||
      (s.topics || []).some((t) => (t.topicTitle || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Resumen de validación
  const totalErrors = Array.from(sessionValidations.values()).filter(v => v.dateError).length;
  const totalEmptyTopics = Array.from(sessionValidations.values()).filter(v => v.hasEmptyTopics).length;
  const totalWarnings = Array.from(sessionValidations.values()).filter(v => v.gapWarning && !v.dateError).length;

  return (
    <div className="space-y-4">
      {/* Resumen de validación */}
      <div className="flex items-center gap-4 p-3 bg-neutral-2 rounded-lg">
        <span className="text-sm font-medium">Estado del calendario:</span>
        <div className="flex items-center gap-3">
          {totalErrors > 0 ? (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              {totalErrors} error{totalErrors > 1 ? 'es' : ''} de fecha
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Fechas OK
            </Badge>
          )}
          
          {totalEmptyTopics > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {totalEmptyTopics} sesión{totalEmptyTopics > 1 ? 'es' : ''} sin tema
            </Badge>
          )}
          
          {totalWarnings > 0 && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {totalWarnings} gap{totalWarnings > 1 ? 's' : ''} detectado{totalWarnings > 1 ? 's' : ''}
            </Badge>
          )}

          {totalErrors === 0 && totalEmptyTopics === 0 && totalWarnings === 0 && (
            <Badge variant="outline" className="border-green-500 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Todo listo
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-9" />
          <Input
            placeholder="🔍 Buscar sesión, fecha, tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSession}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir Sesión
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Arrastra las sesiones con el ícono ≡ para reordenarlas. Las fechas deben editarse manualmente.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredSessions.map(s => s.sessionNumber)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredSessions.map((session) => {
              const validation = sessionValidations.get(session.sessionNumber) || {
                hasEmptyTopics: false,
                emptyTopicIndices: [],
              };

              return (
                <SortableSession
                  key={session.sessionNumber}
                  session={session}
                  sessionIndex={sessions.findIndex(s => s.sessionNumber === session.sessionNumber)}
                  isExpanded={expandedSessions.has(session.sessionNumber)}
                  onToggle={() => toggleSession(session.sessionNumber)}
                  onDelete={() => deleteSession(sessions.findIndex(s => s.sessionNumber === session.sessionNumber))}
                  onUpdate={(field, value) => updateSession(sessions.findIndex(s => s.sessionNumber === session.sessionNumber), field, value)}
                  onUpdateTopic={(topicIndex, field, value) => updateTopic(sessions.findIndex(s => s.sessionNumber === session.sessionNumber), topicIndex, field, value)}
                  courseTopics={courseTopics}
                  instructors={instructors}
                  validation={validation}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {filteredSessions.length === 0 && (
        <div className="text-center py-8 text-neutral-9">
          No se encontraron sesiones con ese criterio de búsqueda.
        </div>
      )}
    </div>
  );
}
