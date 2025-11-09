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
  branchId: string;
  onStatusChanged: () => void;
}

interface EnrolledStudent {
  id: string;
  studentId: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
}

export function GroupStatusChangeDialog({ open, onClose, group, branchId, onStatusChanged }: Props) {
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
    if (!branchId) return;
    try {
      const response = await api.getGroups(branchId, 1, 100);
      const groups = Array.isArray(response.data) ? response.data : [];
      setAvailableGroups(groups.filter((g: any) => g.id !== group?.id && g.status === 'active'));
    } catch (error) {
      console.error('Error loading groups:', error);
      setAvailableGroups([]);
    }
  };

  const loadEnrolledStudents = async () => {
    if (!group) return;
    try {
      const response = await api.getGroupStudents(group.id);
      const students = Array.isArray(response.data) ? response.data : [];
      setEnrolledStudents(students);
      setSelectedStudents(students.map((s: any) => s.studentId || s.id));
    } catch (error) {
      console.error('Error loading students:', error);
      setEnrolledStudents([]);
      setSelectedStudents([]);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!group) return;
    
    // Validar observación
    if (!observation.trim() || observation.trim().length < 5) {
      alert('La observación es requerida y debe tener al menos 5 caracteres');
      return;
    }
    
    if (newStatus === 'merged' && (!targetGroupId || selectedStudents.length === 0)) {
      alert('Para fusionar debes seleccionar un grupo destino y al menos un estudiante');
      return;
    }

    setLoading(true);
    try {
      await api.changeGroupStatus(group.id, {
        status: newStatus,
        observation: observation.trim(),
        targetGroupId: newStatus === 'merged' ? targetGroupId : undefined,
        transferStudentIds: newStatus === 'merged' ? selectedStudents : undefined,
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
            <Label htmlFor="newStatus">Nuevo Estado</Label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-neutral-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-9 focus:border-transparent"
            >
              <option value="active">Activo</option>
              <option value="closed">Cerrado</option>
              <option value="finished">Finalizado</option>
              <option value="eliminado">Eliminado</option>
              <option value="merged">Fusionado</option>
            </select>
          </div>

          {isMerging && (
            <>
              <div>
                <Label htmlFor="targetGroup">Grupo Destino</Label>
                <select
                  id="targetGroup"
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-neutral-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-9 focus:border-transparent"
                >
                  <option value="">Selecciona el grupo destino...</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.branch_name}
                    </option>
                  ))}
                </select>
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
                          checked={selectedStudents.includes(student.studentId)}
                          onChange={() => toggleStudent(student.studentId)}
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
            <Label htmlFor="observation">Observación (mínimo 5 caracteres)</Label>
            <Textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Motivo del cambio de estado... (mínimo 5 caracteres)"
              rows={3}
              className="mt-1"
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
