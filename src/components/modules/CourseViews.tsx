import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, List, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Course {
  id: string;
  name: string;
  description: string;
  themes?: Array<{ id?: string; title: string; orderIndex: number; description?: string }>;
}

interface ViewProps {
  courses: Course[];
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

// Vista de Tarjetas
export function CourseCardsView({ courses, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group relative bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-9 to-accent-8" />

          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-accent-2 rounded-xl group-hover:bg-accent-3 transition-colors">
                <Book className="h-6 w-6 text-accent-9" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => onEdit?.(course)} className="h-8 w-8 text-neutral-600 hover:text-accent-9 hover:bg-accent-2">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete?.(course.id)} className="h-8 w-8 text-neutral-600 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <h3 className="font-bold text-lg text-neutral-900 mb-2 line-clamp-1 group-hover:text-accent-9 transition-colors">
              {course.name}
            </h3>

            <p className="text-sm text-neutral-500 line-clamp-2 mb-4 min-h-[40px]">
              {course.description || 'Sin descripción disponible'}
            </p>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                {course.themes?.length || 0}
              </div>
              <span className="text-xs text-neutral-500 font-medium">
                Tema{(course.themes?.length || 0) !== 1 ? 's' : ''} en este curso
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista Compacta
export function CourseCompactView({ courses, onEdit, onDelete }: ViewProps) {
  return (
    <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors"
        >
          <div className="p-2 bg-accent-2 rounded-lg group-hover:bg-accent-3 transition-colors">
            <Book className="h-5 w-5 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-900 truncate group-hover:text-accent-9 transition-colors">
              {course.name}
            </h4>
            <p className="text-sm text-neutral-500 truncate">
              {course.description || 'Sin descripción'}
            </p>
          </div>
          <div className="text-sm text-neutral-500 font-medium px-4 py-1 bg-neutral-100 rounded-full">
            {course.themes?.length || 0} tema{(course.themes?.length || 0) !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => onEdit?.(course)} className="h-8 w-8 text-neutral-600 hover:text-accent-9 hover:bg-accent-2">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete?.(course.id)} className="h-8 w-8 text-neutral-600 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista de Lista (Tabla)
export function CourseListView({ courses, onEdit, onDelete }: ViewProps) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-neutral-50">
          <TableRow>
            <TableHead className="font-semibold text-neutral-700">Nombre</TableHead>
            <TableHead className="font-semibold text-neutral-700">Descripción</TableHead>
            <TableHead className="font-semibold text-neutral-700 text-center"># Temas</TableHead>
            <TableHead className="text-right font-semibold text-neutral-700">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id} className="group hover:bg-neutral-50 transition-colors">
              <TableCell className="font-medium text-neutral-900 group-hover:text-accent-9 transition-colors">
                {course.name}
              </TableCell>
              <TableCell className="max-w-md truncate text-neutral-500">
                {course.description || '-'}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                  {course.themes?.length || 0}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => onEdit?.(course)} className="h-8 w-8 text-neutral-600 hover:text-accent-9 hover:bg-accent-2">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete?.(course.id)} className="h-8 w-8 text-neutral-600 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
