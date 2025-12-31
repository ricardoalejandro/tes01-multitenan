'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
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
  const [statusSubtype, setStatusSubtype] = useState('');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-select the opposite status when dialog opens
  useEffect(() => {
    if (student && open) {
      setNewStatus(student.status === 'Alta' ? 'Baja' : 'Alta');
      setStatusSubtype('');
      setObservation('');
    }
  }, [student, open]);

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
        transactionSubtype: statusSubtype,
        observation: observation.trim(),
      });

      toast.success('Estado actualizado correctamente', { duration: 1500 });
      onOpenChange(false);
      setObservation('');
      onSuccess();
    } catch (error: any) {
      const responseData = error.response?.data;

      // Special handling for unique Alta violation
      if (responseData?.type === 'unique_alta_violation') {
        toast.error(
          `El probacionista ya está de Alta en: ${responseData.activeBranchName}. ${responseData.message}`,
          { duration: 5000 }
        );
      } else {
        const errorMessage = responseData?.error || 'Error al cambiar estado';
        toast.error(errorMessage, { duration: 2500 });
      }
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
          setStatusSubtype('');
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
            value={newStatus}
            onValueChange={(value) => setNewStatus(value as 'Alta' | 'Baja')}
            required
          >
            <SelectTrigger id="new-status">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Alta" disabled={student.status === 'Alta'}>
                Alta {student.status === 'Alta' && '(estado actual)'}
              </SelectItem>
              <SelectItem value="Baja" disabled={student.status === 'Baja'}>
                Baja {student.status === 'Baja' && '(estado actual)'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Subtype (Conditional) */}
        {newStatus === 'Baja' && (
          <div>
            <Label htmlFor="status-subtype">Motivo de Baja *</Label>
            <Select
              value={statusSubtype}
              onValueChange={setStatusSubtype}
              required
            >
              <SelectTrigger id="status-subtype">
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Académica">Baja Académica</SelectItem>
                <SelectItem value="Disciplinaria">Baja Disciplinaria</SelectItem>
                <SelectItem value="Voluntaria">Retiro Voluntario</SelectItem>
                <SelectItem value="Administrativa">Administrativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {newStatus === 'Alta' && (
          <div>
            <Label htmlFor="status-subtype">Tipo de Reingreso *</Label>
            <Select
              value={statusSubtype}
              onValueChange={setStatusSubtype}
              required
            >
              <SelectTrigger id="status-subtype">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Recuperado">Recuperado</SelectItem>
                <SelectItem value="Reingreso">Reingreso Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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
            variant="secondary"
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
