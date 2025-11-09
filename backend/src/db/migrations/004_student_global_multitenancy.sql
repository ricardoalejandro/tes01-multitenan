-- Migración 004: Reestructurar students para multi-tenant compartido
-- Esta migración convierte students en una tabla global donde:
-- - Un DNI es único a nivel global (no por filial)
-- - Los probacionistas pueden estar en múltiples filiales
-- - El estado (Alta/Baja) es independiente por filial

-- Paso 1: Crear tabla student_branches (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS student_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Alta' CHECK (status IN ('Alta', 'Baja')),
  admission_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, branch_id)
);

CREATE INDEX idx_student_branches_branch_status ON student_branches(branch_id, status);
CREATE INDEX idx_student_branches_student ON student_branches(student_id);

-- Paso 2: Migrar datos existentes de students a student_branches
INSERT INTO student_branches (student_id, branch_id, status, admission_date, created_at, updated_at)
SELECT 
  id as student_id,
  branch_id,
  CASE 
    WHEN status = 'Eliminado' THEN 'Baja'
    WHEN status = 'Inactivo' THEN 'Baja'
    WHEN status = 'Baja' THEN 'Baja'
    ELSE 'Alta'
  END as status,
  COALESCE(admission_date, created_at::date) as admission_date,
  created_at,
  updated_at
FROM students
WHERE branch_id IS NOT NULL;

-- Paso 3: Crear tabla student_transactions (historial de movimientos)
CREATE TABLE IF NOT EXISTS student_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Alta', 'Baja', 'Traslado', 'Cambio de Grupo')),
  description TEXT NOT NULL,
  observation TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_transactions_student_date ON student_transactions(student_id, transaction_date DESC);
CREATE INDEX idx_student_transactions_branch_date ON student_transactions(branch_id, transaction_date DESC);

-- Paso 4: Crear transacciones iniciales para todos los estudiantes existentes
INSERT INTO student_transactions (student_id, branch_id, transaction_type, description, transaction_date, created_at)
SELECT 
  sb.student_id,
  sb.branch_id,
  'Alta' as transaction_type,
  'Alta inicial del probacionista en el sistema (migración automática)' as description,
  sb.created_at as transaction_date,
  NOW() as created_at
FROM student_branches sb;

-- Paso 5: Eliminar columnas obsoletas de students
ALTER TABLE students DROP COLUMN IF EXISTS branch_id;
ALTER TABLE students DROP COLUMN IF EXISTS status;
ALTER TABLE students DROP COLUMN IF EXISTS admission_date;

-- Paso 6: Agregar constraint único global para (document_type, dni)
-- Primero eliminamos el índice anterior si existe
DROP INDEX IF EXISTS idx_students_unique_dni_branch;

-- Crear nuevo índice único global
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_document_dni_unique ON students(document_type, dni);

-- Verificación de integridad
DO $$
DECLARE
  students_count INT;
  branches_count INT;
  transactions_count INT;
BEGIN
  SELECT COUNT(*) INTO students_count FROM students;
  SELECT COUNT(*) INTO branches_count FROM student_branches;
  SELECT COUNT(*) INTO transactions_count FROM student_transactions;
  
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '  - Estudiantes globales: %', students_count;
  RAISE NOTICE '  - Relaciones filial-estudiante: %', branches_count;
  RAISE NOTICE '  - Transacciones creadas: %', transactions_count;
END $$;
