'use client';

import { useState, useEffect } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <ResponsiveDialog 
      open={open} 
      onOpenChange={onClose}
      title="Cambiar Estado del Grupo"
      description={`Grupo: ${group.name} (Estado actual: ${group.status})`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading} className="h-11">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="h-11">
            {loading ? 'Guardando...' : 'Cambiar Estado'}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div>
            <Label htmlFor="newStatus" className="text-xs">Nuevo Estado</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value)}
            >
              <SelectTrigger id="newStatus" className="w-full mt-1 h-11">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
                <SelectItem value="finished">Finalizado</SelectItem>
                <SelectItem value="eliminado">Eliminado</SelectItem>
                <SelectItem value="merged">Fusionado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isMerging && (
            <>
              <div>
                <Label htmlFor="targetGroup" className="text-xs">Grupo Destino</Label>
                <Select
                  value={targetGroupId}
                  onValueChange={(value) => setTargetGroupId(value)}
                >
                  <SelectTrigger id="targetGroup" className="w-full mt-1 h-11">
                    <SelectValue placeholder="Selecciona el grupo destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} - {g.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Estudiantes a Transferir</Label>
                <div className="border border-neutral-4 rounded-lg p-2 md:p-3 mt-1 max-h-48 md:max-h-60 overflow-y-auto space-y-1">
                  {enrolledStudents.length === 0 ? (
                    <div className="text-sm text-neutral-10 py-4 text-center">No hay estudiantes inscritos</div>
                  ) : (
                    enrolledStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-2 p-2 rounded min-h-[44px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.studentId)}
                          onChange={() => toggleStudent(student.studentId)}
                          className="w-5 h-5"
                        />
                        <span className="text-sm">
                          {student.firstName} {student.paternalLastName} - {student.dni}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-neutral-10 mt-1">
                  Los no seleccionados quedarán libres para otros grupos
                </p>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="observation" className="text-xs">Observación (mínimo 5 caracteres)</Label>
            <Textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Motivo del cambio de estado..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
    </ResponsiveDialog>
  );
}
