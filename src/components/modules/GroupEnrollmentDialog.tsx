'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { StudentCardsView, StudentCompactView, StudentListView } from './StudentViews';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onEnrolled: () => void;
}

type ViewMode = 'cards' | 'compact' | 'list';

export function GroupEnrollmentDialog({ open, onClose, groupId, onEnrolled }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableStudents();
      setSelectedIds([]);
      setSearch('');
    }
  }, [open]);

  const loadAvailableStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getAvailableStudents(groupId, '');
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await api.enrollStudents(groupId, selectedIds);
      onEnrolled();
      onClose();
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert('Error al inscribir estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.paternalLastName} ${s.maternalLastName || ''}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || s.dni.includes(search);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogTitle>Inscribir Estudiantes</DialogTitle>
        <DialogDescription>
          Selecciona estudiantes libres (sin grupo activo) para inscribirlos
        </DialogDescription>

        <div className="flex items-center justify-between gap-4 pt-4">
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          <div className="flex border border-neutral-4 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-accent-9 text-white'
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-x border-neutral-4 ${
                viewMode === 'compact'
                  ? 'bg-accent-9 text-white'
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Compacta
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent-9 text-white'
                  : 'bg-white text-neutral-11 hover:bg-neutral-2'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="text-center py-8 text-neutral-10">Cargando estudiantes...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-neutral-10">
              {search ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
            </div>
          ) : (
            <>
              {viewMode === 'cards' && (
                <StudentCardsView
                  students={filteredStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
              {viewMode === 'compact' && (
                <StudentCompactView
                  students={filteredStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
              {viewMode === 'list' && (
                <StudentListView
                  students={filteredStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-4">
          <div className="text-sm text-neutral-10">
            {selectedIds.length} estudiante{selectedIds.length !== 1 ? 's' : ''} seleccionado
            {selectedIds.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={loading || selectedIds.length === 0}
            >
              {loading ? 'Inscribiendo...' : 'Inscribir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
