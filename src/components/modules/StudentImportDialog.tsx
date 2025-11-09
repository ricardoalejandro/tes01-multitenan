'use client';

import { useState } from 'react';
import { Import, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ExistingStudent {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  dni: string;
  email: string | null;
  branches: Array<{
    branchId: string;
    branchName: string;
    status: 'Alta' | 'Baja';
  }>;
}

interface StudentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingStudent: ExistingStudent | null;
  currentBranchId: string;
  onSuccess: () => void;
}

export function StudentImportDialog({
  open,
  onOpenChange,
  existingStudent,
  currentBranchId,
  onSuccess,
}: StudentImportDialogProps) {
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!existingStudent) return;

    try {
      setLoading(true);
      await api.importStudent(existingStudent.id, {
        branchId: currentBranchId,
        admissionDate,
        observation: observation.trim() || undefined,
      });

      toast.success('Probacionista importado exitosamente', { duration: 1500 });
      onOpenChange(false);
      setObservation('');
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al importar probacionista';
      toast.error(errorMessage, { duration: 2500 });
    } finally {
      setLoading(false);
    }
  };

  if (!existingStudent) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setObservation('');
          setAdmissionDate(new Date().toISOString().split('T')[0]);
        }
      }}
      title="Probacionista Ya Registrado"
    >
      <form onSubmit={handleImport} className="space-y-6">
        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Este probacionista ya está registrado en el sistema
            </p>
            <p className="text-sm text-amber-700">
              Puedes importarlo a la filial actual para gestionar su información aquí
            </p>
          </div>
        </div>

        {/* Existing Student Info */}
        <div className="bg-neutral-2 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm text-neutral-10">Nombre Completo</p>
            <p className="font-semibold text-neutral-11">
              {existingStudent.firstName} {existingStudent.paternalLastName}{' '}
              {existingStudent.maternalLastName}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-10">DNI</p>
              <p className="font-medium text-neutral-11">{existingStudent.dni}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-10">Email</p>
              <p className="font-medium text-neutral-11">
                {existingStudent.email || '-'}
              </p>
            </div>
          </div>

          {/* Branches */}
          <div>
            <p className="text-sm text-neutral-10 mb-2">Filiales Actuales</p>
            <div className="flex flex-wrap gap-2">
              {existingStudent.branches.map((branch) => (
                <div
                  key={branch.branchId}
                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-neutral-4"
                >
                  <span className="text-sm font-medium text-neutral-11">
                    {branch.branchName}
                  </span>
                  <Badge
                    variant={branch.status === 'Alta' ? 'success' : 'danger'}
                    className="text-xs"
                  >
                    {branch.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Import Form */}
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="admission-date">Fecha de Admisión *</Label>
            <Input
              id="admission-date"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="observation">Observación (opcional)</Label>
            <Textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Notas sobre la importación..."
              rows={3}
            />
          </div>
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
            disabled={loading}
          >
            {loading ? (
              <>
                <Import className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Import className="mr-2 h-4 w-4" />
                Importar a Esta Filial
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
