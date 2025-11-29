'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { StudentCardsView, StudentCompactView, StudentListView } from './StudentViews';
import { Search } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  branchId: string;
  onEnrolled: () => void;
}

type ViewMode = 'cards' | 'compact' | 'list';

export function GroupEnrollmentDialog({ open, onClose, groupId, branchId, onEnrolled }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (open && branchId) {
      loadAvailableStudents();
      setSelectedIds([]);
      setSearch('');
      setDebouncedSearch('');
      setCurrentPage(1);
    }
  }, [open, branchId]);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset a página 1 al buscar
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const loadAvailableStudents = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const data = await api.getAvailableStudents(groupId, branchId);
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error loading students:', error);
      setStudents([]);
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
      await api.enrollStudents(groupId, { studentIds: selectedIds });
      onEnrolled();
      onClose();
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert('Error al inscribir estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch.trim()) return students;
    
    const searchLower = debouncedSearch.toLowerCase();
    return students.filter((s) => {
      const fullName = `${s.firstName} ${s.paternalLastName} ${s.maternalLastName || ''}`.toLowerCase();
      return fullName.includes(searchLower) || s.dni.includes(searchLower);
    });
  }, [students, debouncedSearch]);

  // Paginación
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const isSearching = search !== debouncedSearch;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onClose}
      title="Inscribir Estudiantes"
      description="Selecciona estudiantes libres (sin grupo activo) para inscribirlos"
      defaultMaximized={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={loading || selectedIds.length === 0}
          >
            {loading ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </>
      }
    >

        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-10" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-accent-9 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

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
          ) : paginatedStudents.length === 0 ? (
            <div className="text-center py-8 text-neutral-10">
              {search ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
            </div>
          ) : (
            <>
              {viewMode === 'cards' && (
                <StudentCardsView
                  students={paginatedStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
              {viewMode === 'compact' && (
                <StudentCompactView
                  students={paginatedStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
              {viewMode === 'list' && (
                <StudentListView
                  students={paginatedStudents}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                />
              )}
            </>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between pt-4 border-t border-neutral-4">
            <div className="text-sm text-neutral-10">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} de {filteredStudents.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-2 px-4">
                <span className="text-sm text-neutral-11">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-4">
          <div className="text-sm text-neutral-10">
            {selectedIds.length} estudiante{selectedIds.length !== 1 ? 's' : ''} seleccionado
            {selectedIds.length !== 1 ? 's' : ''}
          </div>
        </div>
    </ResponsiveDialog>
  );
}
