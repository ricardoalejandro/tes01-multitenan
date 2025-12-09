'use client';

import { useState, useEffect } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <ResponsiveDialog 
      open={open} 
      onOpenChange={onClose}
      title="Historial de Transacciones"
      description={`Grupo: ${groupName}`}
      footer={
        <Button variant="secondary" onClick={onClose} className="h-11">
          Cerrar
        </Button>
      }
    >
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-neutral-10">Cargando historial...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-neutral-10">No hay transacciones registradas</div>
          ) : (
            <>
              {/* Mobile: Cards view */}
              <div className="md:hidden space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border border-neutral-4 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {transactionTypeLabels[tx.transaction_type] || tx.transaction_type}
                      </Badge>
                      <span className="text-xs text-neutral-10">{formatDate(tx.performed_at)}</span>
                    </div>
                    <p className="text-sm text-neutral-12">{tx.description}</p>
                    {tx.observation && (
                      <p className="text-xs text-neutral-10 mt-1 italic">{tx.observation}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden md:block border border-neutral-4 rounded-lg overflow-hidden">
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
                          <Badge variant="secondary" className="text-xs">
                            {transactionTypeLabels[tx.transaction_type] || tx.transaction_type}
                          </Badge>
                        </td>
                        <td className="p-3">{tx.description}</td>
                        <td className="p-3 text-neutral-10">{tx.observation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
    </ResponsiveDialog>
  );
}
