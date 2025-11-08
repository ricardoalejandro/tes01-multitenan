-- Migración: Mejoras UX y Validaciones
-- Fecha: 2025-11-08

-- 1. Agregar campo code_number a branches para autogenerar código
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code_number INTEGER;

-- 2. Crear índice único para code_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_code_number ON branches(code_number);

-- 3. Asignar code_number a branches existentes (si existen)
DO $$
DECLARE
  branch_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR branch_record IN SELECT id FROM branches ORDER BY created_at LOOP
    UPDATE branches SET code_number = counter WHERE id = branch_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 4. Hacer email y phone opcionales en students (si no lo son ya)
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
ALTER TABLE students ALTER COLUMN phone DROP NOT NULL;

-- 5. El campo address ya existe en students (verificado en schema.ts)
-- Si no existe, descomenta la siguiente línea:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;

-- 6. Crear índices para mejorar performance de paginación
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_dni ON students(dni);
CREATE INDEX IF NOT EXISTS idx_students_first_name ON students(first_name);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_instructors_dni ON instructors(dni);
CREATE INDEX IF NOT EXISTS idx_instructors_first_name ON instructors(first_name);
CREATE INDEX IF NOT EXISTS idx_class_groups_name ON class_groups(name);
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);

-- 7. Comentarios para documentación
COMMENT ON COLUMN branches.code_number IS 'Número correlativo para generar código FIL-XXX';
COMMENT ON COLUMN students.address IS 'Dirección del estudiante (opcional)';
