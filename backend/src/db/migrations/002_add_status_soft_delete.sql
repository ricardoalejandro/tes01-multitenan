-- Migration: Add status field for soft delete functionality
-- Fecha: 2025-11-08
-- Descripción: Agrega campo status a courses y groups para implementar borrado lógico
--              Actualiza enums de branches, students, instructors para incluir 'Eliminado'

-- 1. Actualizar enum de branches para incluir 'eliminado'
ALTER TYPE status ADD VALUE IF NOT EXISTS 'eliminado';

-- 2. Actualizar enum de students para incluir 'Eliminado'
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'Eliminado';

-- 3. Actualizar enum de instructors para incluir 'Eliminado'
ALTER TYPE instructor_status ADD VALUE IF NOT EXISTS 'Eliminado';

-- 4. Crear nuevo enum para courses (active, inactive, eliminado)
DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('active', 'inactive', 'eliminado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Agregar campo status a courses
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status course_status NOT NULL DEFAULT 'active';

-- 6. Crear nuevo enum para groups (active, closed, finished, eliminado)
DO $$ BEGIN
    CREATE TYPE group_status AS ENUM ('active', 'closed', 'finished', 'eliminado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Agregar campo status a class_groups
ALTER TABLE class_groups 
ADD COLUMN IF NOT EXISTS status group_status NOT NULL DEFAULT 'active';

-- 8. Crear índices para mejorar performance en consultas con filtro status
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_class_groups_status ON class_groups(status);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_instructors_status ON instructors(status);

-- 9. Actualizar registros existentes (si los hay con NULL o valores antiguos)
UPDATE courses SET status = 'active' WHERE status IS NULL;
UPDATE class_groups SET status = 'active' WHERE status IS NULL;

-- Comentarios de documentación
COMMENT ON COLUMN courses.status IS 'Estado del curso: active (activo), inactive (inactivo), eliminado (borrado lógico - no mostrar)';
COMMENT ON COLUMN class_groups.status IS 'Estado del grupo: active (cursando), closed (cerrado prematuramente), finished (finalizado exitosamente), eliminado (borrado lógico - no mostrar)';
