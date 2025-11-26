'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, GripVertical } from 'lucide-react';

interface CourseWithInstructor {
  courseId: string;
  instructorId: string;
  orderIndex: number;
}

interface Props {
  value: CourseWithInstructor[];
  onChange: (courses: CourseWithInstructor[]) => void;
  availableCourses: any[];
  availableInstructors: any[];
}

export default function CourseSelectorWithInstructors({ value, onChange, availableCourses, availableInstructors }: Props) {
  const addCourse = () => {
    const newCourse: CourseWithInstructor = {
      courseId: '',
      instructorId: '',
      orderIndex: value.length + 1,
    };
    onChange([...value, newCourse]);
  };

  const removeCourse = (index: number) => {
    const newCourses = value.filter((_, i) => i !== index);
    // Reordenar
    newCourses.forEach((course, i) => {
      course.orderIndex = i + 1;
    });
    onChange(newCourses);
  };

  const updateCourse = (index: number, field: keyof CourseWithInstructor, val: string) => {
    const newCourses = [...value];
    newCourses[index] = { ...newCourses[index], [field]: val };
    onChange(newCourses);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCourses = [...value];
    [newCourses[index - 1], newCourses[index]] = [newCourses[index], newCourses[index - 1]];
    newCourses.forEach((course, i) => {
      course.orderIndex = i + 1;
    });
    onChange(newCourses);
  };

  const moveDown = (index: number) => {
    if (index === value.length - 1) return;
    const newCourses = [...value];
    [newCourses[index], newCourses[index + 1]] = [newCourses[index + 1], newCourses[index]];
    newCourses.forEach((course, i) => {
      course.orderIndex = i + 1;
    });
    onChange(newCourses);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold">Cursos del Grupo</label>
        <Button type="button" size="sm" onClick={addCourse}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir Curso
        </Button>
      </div>

      {value.length === 0 && (
        <div className="text-center py-8 text-neutral-9 border border-dashed border-neutral-4 rounded-lg">
          No hay cursos añadidos. Haz clic en &quot;Añadir Curso&quot; para comenzar.
        </div>
      )}

      {value.map((course, index) => (
        <div key={index} className="border border-neutral-4 rounded-lg p-4 flex items-start gap-3">
          <div className="flex flex-col gap-1 mt-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="h-6 w-6 p-0"
            >
              ↑
            </Button>
            <GripVertical className="h-4 w-4 text-neutral-9" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => moveDown(index)}
              disabled={index === value.length - 1}
              className="h-6 w-6 p-0"
            >
              ↓
            </Button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral-10">Curso</label>
              <Select
                value={course.courseId}
                onValueChange={(value) => updateCourse(index, 'courseId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar curso..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-10">Instructor</label>
              <Select
                value={course.instructorId}
                onValueChange={(value) => updateCourse(index, 'instructorId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instructor..." />
                </SelectTrigger>
                <SelectContent>
                  {availableInstructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.firstName} {instructor.paternalLastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeCourse(index)}
            className="text-red-600 hover:text-red-700 mt-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
