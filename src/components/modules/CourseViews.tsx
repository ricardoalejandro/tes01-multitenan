'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Course {
  id: string;
  name: string;
  description: string;
  themes?: Array<{ id?: string; title: string; orderIndex: number; description?: string }>;
}

interface ViewProps {
  courses: Course[];
  onView?: (course: Course) => void;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

// Vista de Tarjetas (Compacta - Inspirada en GroupCardsView)
export function CourseCardsView({ courses, onView, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          {/* Header: Icono y nombre */}
          <div className="flex items-start gap-2 mb-2">
            <div className="p-1.5 bg-accent-2 rounded-lg group-hover:bg-accent-3 transition-colors shrink-0">
              <Book className="h-4 w-4 text-accent-9" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1" title={course.name}>
              {course.name}
            </h3>
          </div>

          {/* Descripción truncada */}
          <p className="text-xs text-gray-500 line-clamp-2 mb-2 min-h-[32px]">
            {course.description || 'Sin descripción'}
          </p>

          {/* Footer: Temas y acciones */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                {course.themes?.length || 0}
              </span>
              <span className="text-xs text-gray-500">
                tema{(course.themes?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Actions - Ver + Más */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(course)}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                Ver
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(course)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete?.(course.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista Compacta
export function CourseCompactView({ courses, onView, onEdit, onDelete }: ViewProps) {
  return (
    <div className="divide-y divide-gray-200">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="p-1.5 bg-accent-2 rounded-lg group-hover:bg-accent-3 transition-colors shrink-0">
            <Book className="h-4 w-4 text-accent-9" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate">
              {course.name}
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {course.description || 'Sin descripción'}
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full shrink-0">
            {course.themes?.length || 0} tema{(course.themes?.length || 0) !== 1 ? 's' : ''}
          </div>

          {/* Actions - Ver + Más */}
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(course)}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              Ver
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(course)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete?.(course.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista de Lista (Tabla)
export function CourseListView({ courses, onView, onEdit, onDelete }: ViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead className="text-center"># Temas</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id} className="group">
            <TableCell className="font-medium">
              {course.name}
            </TableCell>
            <TableCell className="max-w-md truncate text-gray-500">
              {course.description || '-'}
            </TableCell>
            <TableCell className="text-center">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {course.themes?.length || 0}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView?.(course)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(course)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete?.(course.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
