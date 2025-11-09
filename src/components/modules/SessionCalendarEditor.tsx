'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

interface Topic {
  courseId: string;
  courseName: string;
  topicMode: 'auto' | 'selected' | 'manual';
  topicTitle: string;
  topicDescription: string;
  instructorId: string;
  orderIndex: number;
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
}

export default function SessionCalendarEditor({ sessions, onChange, courseTopics, instructors }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set([1]));

  const toggleSession = (sessionNumber: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionNumber)) {
      newExpanded.delete(sessionNumber);
    } else {
      newExpanded.add(sessionNumber);
    }
    setExpandedSessions(newExpanded);
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
      topics: lastSession.topics.map((t) => ({ ...t })),
    };
    onChange([...sessions, newSession]);
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.sessionNumber.toString().includes(searchTerm) ||
      s.sessionDate.includes(searchTerm) ||
      s.topics.some((t) => t.topicTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
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

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredSessions.map((session, sessionIndex) => {
          const isExpanded = expandedSessions.has(session.sessionNumber);
          return (
            <div key={session.sessionNumber} className="border border-neutral-4 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSession(session.sessionNumber)}
                className="w-full px-4 py-3 bg-neutral-2 hover:bg-neutral-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <span className="font-semibold">Sesión {session.sessionNumber}</span>
                  <span className="text-neutral-10">- {new Date(session.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(sessionIndex);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Fecha de la sesión</label>
                    <Input
                      type="date"
                      value={session.sessionDate}
                      onChange={(e) => {
                        const newSessions = [...sessions];
                        newSessions[sessionIndex].sessionDate = e.target.value;
                        onChange(newSessions);
                      }}
                    />
                  </div>

                  {session.topics.map((topic, topicIndex) => (
                    <div key={topicIndex} className="border border-neutral-3 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-accent-11">📚 {topic.courseName}</h4>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Modo del tema</label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={topic.topicMode === 'auto' ? 'default' : 'outline'}
                            onClick={() => updateTopic(sessionIndex, topicIndex, 'topicMode', 'auto')}
                          >
                            Auto
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={topic.topicMode === 'selected' ? 'default' : 'outline'}
                            onClick={() => updateTopic(sessionIndex, topicIndex, 'topicMode', 'selected')}
                          >
                            Seleccionar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={topic.topicMode === 'manual' ? 'default' : 'outline'}
                            onClick={() => updateTopic(sessionIndex, topicIndex, 'topicMode', 'manual')}
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
                            onChange={(e) => {
                              const selectedTheme = courseTopics[topic.courseId]?.find((t) => t.title === e.target.value);
                              updateTopic(sessionIndex, topicIndex, 'topicTitle', e.target.value);
                              if (selectedTheme) {
                                updateTopic(sessionIndex, topicIndex, 'topicDescription', selectedTheme.description || '');
                              }
                            }}
                          >
                            {courseTopics[topic.courseId]?.map((theme: any) => (
                              <option key={theme.id} value={theme.title}>
                                {theme.title}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}

                      {topic.topicMode === 'manual' && (
                        <div>
                          <label className="text-sm font-medium">Título del tema (manual)</label>
                          <Input
                            value={topic.topicTitle}
                            onChange={(e) => updateTopic(sessionIndex, topicIndex, 'topicTitle', e.target.value)}
                            placeholder="Escribe el tema manualmente"
                          />
                        </div>
                      )}

                      {topic.topicMode === 'auto' && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-800">
                          <strong>Automático:</strong> {topic.topicTitle}
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium">Descripción</label>
                        <Textarea
                          value={topic.topicDescription}
                          onChange={(e) => updateTopic(sessionIndex, topicIndex, 'topicDescription', e.target.value)}
                          rows={2}
                          placeholder="Descripción del tema"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Instructor</label>
                        <Select
                          value={topic.instructorId}
                          onChange={(e) => updateTopic(sessionIndex, topicIndex, 'instructorId', e.target.value)}
                        >
                          {instructors.map((instructor) => (
                            <option key={instructor.id} value={instructor.id}>
                              {instructor.firstName} {instructor.paternalLastName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-8 text-neutral-9">
          No se encontraron sesiones con ese criterio de búsqueda.
        </div>
      )}
    </div>
  );
}
