'use client';

import { useState, useEffect } from 'react';
import { History, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Transaction {
  id: string;
  transactionType: 'Alta' | 'Baja';
  description: string;
  observation: string | null;
  transactionDate: string;
  branchName: string | null;
  userName: string | null;
}

interface StudentTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    firstName: string;
    paternalLastName: string;
  } | null;
  branchId?: string;
}

export function StudentTransactionsDialog({
  open,
  onOpenChange,
  student,
  branchId,
}: StudentTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      loadTransactions();
    }
  }, [open, student, branchId]);

  const loadTransactions = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const response = await api.getStudentTransactions(student.id, branchId);
      setTransactions(response.data || []);
    } catch (error) {
      toast.error('Error al cargar el historial', { duration: 2000 });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!student) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Historial de Transacciones"
    >
      <div className="space-y-4">
        {/* Student Info */}
        <div className="bg-neutral-2 rounded-lg p-4">
          <p className="font-semibold text-neutral-11">
            {student.firstName} {student.paternalLastName}
          </p>
          <p className="text-sm text-neutral-10 mt-1">
            {branchId ? 'Filial actual' : 'Todas las filiales'}
          </p>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-9 mx-auto"></div>
            <p className="text-sm text-neutral-9 mt-3">Cargando historial...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center">
            <History className="h-12 w-12 text-neutral-6 mx-auto mb-3" />
            <p className="text-neutral-10">No hay transacciones registradas</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-4 overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-neutral-9" />
                          <span className="text-sm">
                            {formatDate(transaction.transactionDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.transactionType === 'Alta'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {transaction.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-neutral-11">
                            {transaction.description}
                          </p>
                          {transaction.observation && (
                            <div className="flex items-start gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-neutral-8 mt-0.5 shrink-0" />
                              <p className="text-xs text-neutral-9 italic">
                                {transaction.observation}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-10">
                        {transaction.branchName || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-10">
                        {transaction.userName || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
