'use client';

import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CounselingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counseling: any;
  studentId: string;
  onSave: (data: any) => void;
}

export function CounselingFormDialog({ open, onOpenChange, counseling, studentId, onSave }: CounselingFormDialogProps) {
  const [formData, setFormData] = useState({
    instructorId: '',
    branchId: '',
    groupName: '',
    counselingDate: '',
    indicator: 'tibio' as 'frio' | 'tibio' | 'caliente',
    observations: '',
  });
  const [instructors, setInstructors] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupInputMode, setGroupInputMode] = useState<'select' | 'manual'>('select');

  useEffect(() => {
    if (open) {
      loadData();
      if (counseling) {
        setFormData({
          instructorId: counseling.instructorId || '',
          branchId: counseling.branchId || '',
          groupName: counseling.groupName || '',
          counselingDate: counseling.counselingDate?.split('T')[0] || '',
          indicator: counseling.indicator || 'tibio',
          observations: counseling.observations || '',
        });
      } else {
        setFormData({
          instructorId: '',
          branchId: '',
          groupName: '',
          counselingDate: new Date().toISOString().split('T')[0],
          indicator: 'tibio',
          observations: '',
        });
      }
    }
  }, [counseling, open]);

  const loadData = async () => {
    try {
      const branchId = localStorage.getItem('selected_branch') || '';
      const [instructorsRes, branchesRes, groupsRes] = await Promise.all([
        api.getInstructors(branchId),
        api.getBranches(),
        api.getGroups(branchId),
      ]);
      setInstructors(instructorsRes.data || []);
      setBranches(branchesRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={counseling ? 'Editar Asesoría' : 'Nueva Asesoría Filosófica'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instructor">Instructor *</Label>
            <Select
              value={formData.instructorId}
              onValueChange={(value) => setFormData({ ...formData, instructorId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {`${instructor.firstName} ${instructor.paternalLastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Sede *</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="groupName">Nombre del Grupo *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGroupInputMode(groupInputMode === 'select' ? 'manual' : 'select')}
              className="h-7 text-xs"
            >
              {groupInputMode === 'select' ? '✏️ Escribir' : '📋 Seleccionar'}
            </Button>
          </div>

          {groupInputMode === 'select' ? (
            <Select
              value={formData.groupName}
              onValueChange={(value) => setFormData({ ...formData, groupName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              placeholder="Ej: Grupo A"
            />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha de Asesoría *</Label>
            <Input
              id="date"
              type="date"
              value={formData.counselingDate}
              onChange={(e) => setFormData({ ...formData, counselingDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indicator">Indicador *</Label>
            <Select
              value={formData.indicator}
              onValueChange={(value: any) => setFormData({ ...formData, indicator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frio">❄️ Frío</SelectItem>
                <SelectItem value="tibio">😐 Tibio</SelectItem>
                <SelectItem value="caliente">🔥 Caliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observations">Observaciones *</Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            required
            rows={4}
            placeholder="Describe el comportamiento y progreso del estudiante..."
          />
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1 bg-accent-9 hover:bg-accent-10">
            {counseling ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
