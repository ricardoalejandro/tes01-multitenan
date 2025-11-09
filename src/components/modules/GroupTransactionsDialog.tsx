'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  groupName: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  performed_by: string;
  performed_at: string;
  description: string;
  observation?: string;
}

const transactionTypeLabels: Record<string, string> = {
  created: 'Creación',
  updated: 'Modificación',
  status_changed: 'Cambio de Estado',
  student_enrolled: 'Inscripción de Estudiante',
  student_unenrolled: 'Desinscripción',
  merged: 'Fusión',
};

export function GroupTransactionsDialog({ open, onClose, groupId, groupName }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && groupId) {
      loadTransactions();
    }
  }, [open, groupId]);

  const loadTransactions = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await api.getGroupTransactions(groupId);
      const data = Array.isArray(response.data) ? response.data : [];
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogTitle>Historial de Transacciones</DialogTitle>
        <DialogDescription>
          Grupo: <strong>{groupName}</strong>
        </DialogDescription>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="text-center py-8 text-neutral-10">Cargando historial...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-neutral-10">No hay transacciones registradas</div>
          ) : (
            <div className="border border-neutral-4 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-2 border-b border-neutral-4">
                  <tr>
                    <th className="p-3 text-left">Fecha</th>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Descripción</th>
                    <th className="p-3 text-left">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-neutral-3 hover:bg-neutral-1">
                      <td className="p-3 whitespace-nowrap">{formatDate(tx.performed_at)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-3 text-accent-11">
                          {transactionTypeLabels[tx.transaction_type] || tx.transaction_type}
                        </span>
                      </td>
                      <td className="p-3">{tx.description}</td>
                      <td className="p-3 text-neutral-10">{tx.observation || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
