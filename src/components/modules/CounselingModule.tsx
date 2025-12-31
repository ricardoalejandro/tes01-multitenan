'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { CounselingFormDialog } from './CounselingFormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Counseling {
  id: string;
  counselingDate: string;
  indicator: 'frio' | 'tibio' | 'caliente';
  observations: string;
  groupName: string;
  groupCode?: string;
}

interface CounselingModuleProps {
  studentId: string;
}

export function CounselingModule({ studentId }: CounselingModuleProps) {
  const [counselings, setCounselings] = useState<Counseling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCounseling, setSelectedCounseling] = useState<Counseling | null>(null);

  useEffect(() => {
    loadCounselings();
  }, [studentId]);

  const loadCounselings = async () => {
    try {
      setLoading(true);
      const res = await api.getCounselings(studentId);
      setCounselings(res.counselings || []);
    } catch (error) {
      toast.error('Error al cargar asesorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCounseling(null);
    setShowForm(true);
  };

  const handleEdit = (counseling: Counseling) => {
    setSelectedCounseling(counseling);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta asesoría?')) return;

    try {
      await api.deleteCounseling(studentId, id);
      toast.success('Asesoría eliminada');
      loadCounselings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar asesoría');
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedCounseling) {
        await api.updateCounseling(studentId, selectedCounseling.id, data);
        toast.success('Asesoría actualizada');
      } else {
        await api.createCounseling(studentId, data);
        toast.success('Asesoría creada');
      }
      setShowForm(false);
      loadCounselings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar asesoría');
    }
  };

  const getIndicatorBadge = (indicator: string) => {
    const config = {
      frio: { label: '❄️ Frío', variant: 'secondary' as const },
      tibio: { label: '😐 Tibio', variant: 'default' as const },
      caliente: { label: '🔥 Caliente', variant: 'danger' as const },
    };
    const ind = config[indicator as keyof typeof config];
    return <Badge variant={ind.variant}>{ind.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-9 mx-auto"></div>
          <p className="mt-4 text-neutral-10">Cargando asesorías...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl text-neutral-12">Asesorías Filosóficas</CardTitle>
            <Button onClick={handleCreate} size="sm" className="bg-accent-9 hover:bg-accent-10">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Asesoría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {counselings.length === 0 ? (
            <div className="text-center py-8 text-neutral-9">
              <p>No hay asesorías registradas</p>
              <Button onClick={handleCreate} variant="secondary" className="mt-4">
                Crear primera asesoría
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {counselings.map((counseling) => (
                    <TableRow key={counseling.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-neutral-9" />
                          {new Date(counseling.counselingDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {counseling.groupName}
                        {counseling.groupCode && (
                          <span className="text-xs text-neutral-9 ml-1">({counseling.groupCode})</span>
                        )}
                      </TableCell>
                      <TableCell>{getIndicatorBadge(counseling.indicator)}</TableCell>
                      <TableCell className="max-w-xs truncate">{counseling.observations}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleEdit(counseling)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDelete(counseling.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CounselingFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        counseling={selectedCounseling}
        studentId={studentId}
        onSave={handleSave}
      />
    </>
  );
}

export default CounselingModule;
