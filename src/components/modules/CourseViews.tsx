import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, List, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Course {
  id: string;
  name: string;
  description: string;
  themes?: Array<{ id: string; title: string; orderIndex: number }>;
}

interface ViewProps {
  courses: Course[];
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

// Vista de Tarjetas
export function CourseCardsView({ courses, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-white border border-neutral-4 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-accent-3 rounded-lg">
              <Book className="h-5 w-5 text-accent-9" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-12 truncate">{course.name}</h3>
            </div>
          </div>
          <p className="text-sm text-neutral-11 line-clamp-2 mb-3">{course.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-10">
              <List className="h-3 w-3" />
              <span>{course.themes?.length || 0} tema{(course.themes?.length || 0) !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit?.(course)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete?.(course.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
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
    <div className="divide-y divide-neutral-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="flex items-center gap-3 p-4 hover:bg-neutral-2 transition-colors"
        >
          <div className="p-2 bg-accent-3 rounded">
            <Book className="h-4 w-4 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-neutral-12 truncate">{course.name}</h4>
            <p className="text-sm text-neutral-11 truncate">{course.description}</p>
          </div>
          <div className="text-xs text-neutral-10 text-right mr-2">
            {course.themes?.length || 0} tema{(course.themes?.length || 0) !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(course)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete?.(course.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead># Temas</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell className="font-medium">{course.name}</TableCell>
            <TableCell className="max-w-md truncate">{course.description || '-'}</TableCell>
            <TableCell>{course.themes?.length || 0}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit?.(course)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete?.(course.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
