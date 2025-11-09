'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface StudentStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    firstName: string;
    paternalLastName: string;
    status: 'Alta' | 'Baja';
  } | null;
  branchId: string;
  onSuccess: () => void;
}

export function StudentStatusChangeDialog({
  open,
  onOpenChange,
  student,
  branchId,
  onSuccess,
}: StudentStatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState<'Alta' | 'Baja'>('Alta');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!student) return;

    if (observation.trim().length < 5) {
      toast.error('La observación debe tener al menos 5 caracteres', { duration: 2000 });
      return;
    }

    try {
      setLoading(true);
      await api.changeStudentStatus(student.id, {
        branchId,
        status: newStatus,
        observation: observation.trim(),
      });

      toast.success('Estado actualizado correctamente', { duration: 1500 });
      onOpenChange(false);
      setObservation('');
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al cambiar estado';
      toast.error(errorMessage, { duration: 2500 });
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setObservation('');
          setNewStatus('Alta');
        }
      }}
      title="Cambiar Estado del Probacionista"
    >
      <form onSubmit={handleStatusChange} className="space-y-6">
        {/* Student Info */}
        <div className="bg-neutral-2 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-neutral-11">
            {student.firstName} {student.paternalLastName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-10">Estado actual:</span>
            <Badge variant={student.status === 'Alta' ? 'success' : 'danger'}>
              {student.status}
            </Badge>
          </div>
        </div>

        {/* New Status */}
        <div>
          <Label htmlFor="new-status">Nuevo Estado *</Label>
          <Select
            id="new-status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as 'Alta' | 'Baja')}
            required
          >
            <option value="Alta">Alta</option>
            <option value="Baja">Baja</option>
          </Select>
        </div>

        {/* Observation (mandatory) */}
        <div>
          <Label htmlFor="observation">Observación * (mínimo 5 caracteres)</Label>
          <Textarea
            id="observation"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Describe el motivo del cambio de estado..."
            rows={4}
            required
            minLength={5}
            className={observation.length > 0 && observation.length < 5 ? 'border-red-500' : ''}
          />
          <p className="text-sm text-neutral-9 mt-1">
            {observation.length}/5 caracteres mínimos
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-accent-9 hover:bg-accent-10 text-white"
            disabled={loading || observation.trim().length < 5}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Cambiar Estado
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
