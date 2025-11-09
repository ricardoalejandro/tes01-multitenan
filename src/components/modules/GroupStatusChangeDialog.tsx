'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  group: {
    id: string;
    name: string;
    status: string;
  } | null;
  onStatusChanged: () => void;
}

interface EnrolledStudent {
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
}

export function GroupStatusChangeDialog({ open, onClose, group, onStatusChanged }: Props) {
  const [newStatus, setNewStatus] = useState<string>('');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  // Fusión
  const [targetGroupId, setTargetGroupId] = useState('');
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (open && group) {
      setNewStatus(group.status);
      setObservation('');
      setTargetGroupId('');
      setSelectedStudents([]);
      if (group.status !== 'merged') {
        loadGroups();
        loadEnrolledStudents();
      }
    }
  }, [open, group]);

  const loadGroups = async () => {
    try {
      const data = await api.getGroups('', 1, 100);
      setAvailableGroups(data.groups.filter((g: any) => g.id !== group?.id && g.status === 'active'));
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadEnrolledStudents = async () => {
    if (!group) return;
    try {
      const data = await api.getGroupStudents(group.id);
      setEnrolledStudents(data);
      setSelectedStudents(data.map((s: any) => s.id));
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!group) return;
    if (newStatus === 'merged' && (!targetGroupId || selectedStudents.length === 0)) {
      alert('Para fusionar debes seleccionar un grupo destino y al menos un estudiante');
      return;
    }

    setLoading(true);
    try {
      await api.changeGroupStatus(group.id, {
        newStatus,
        observation: observation.trim() || undefined,
        targetGroupId: newStatus === 'merged' ? targetGroupId : undefined,
        studentIdsToTransfer: newStatus === 'merged' ? selectedStudents : undefined,
      });
      onStatusChanged();
      onClose();
    } catch (error: any) {
      console.error('Error changing status:', error);
      alert(error.message || 'Error al cambiar el estado');
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  const isMerging = newStatus === 'merged';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Cambiar Estado del Grupo</DialogTitle>
        <DialogDescription>
          Grupo: <strong>{group.name}</strong> (Estado actual: {group.status})
        </DialogDescription>

        <div className="space-y-4 pt-4">
          <div>
            <Label>Nuevo Estado</Label>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="active">Activo</option>
              <option value="closed">Cerrado</option>
              <option value="finished">Finalizado</option>
              <option value="eliminado">Eliminado</option>
              <option value="merged">Fusionado</option>
            </Select>
          </div>

          {isMerging && (
            <>
              <div>
                <Label>Grupo Destino</Label>
                <Select value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}>
                  <option value="">Selecciona el grupo destino...</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.branch_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Estudiantes a Transferir</Label>
                <div className="border border-neutral-4 rounded-lg p-3 mt-1 max-h-60 overflow-y-auto space-y-2">
                  {enrolledStudents.length === 0 ? (
                    <div className="text-sm text-neutral-10">No hay estudiantes inscritos</div>
                  ) : (
                    enrolledStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-2 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          {student.firstName} {student.paternalLastName} {student.maternalLastName || ''} - DNI: {student.dni}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-neutral-10 mt-1">
                  Los estudiantes no seleccionados quedarán libres para inscribirse en otros grupos
                </p>
              </div>
            </>
          )}

          <div>
            <Label>Observación</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Motivo del cambio de estado..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Cambiar Estado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
