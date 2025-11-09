-- Migración 005: Sistema avanzado de grupos con calendario de clases
-- Esta migración añade:
-- - Relación grupos-cursos-instructores
-- - Calendario de sesiones con temas editables
-- - Inscripción de probacionistas a grupos
-- - Transacciones de estado de grupos (incluyendo fusión)

-- Modificar group_courses existente: añadir order_index
ALTER TABLE group_courses ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;
ALTER TABLE group_courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Crear índices adicionales si no existen
CREATE INDEX IF NOT EXISTS idx_group_courses_group ON group_courses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_courses_course ON group_courses(course_id);

-- Tabla: group_sessions (calendario de sesiones)
CREATE TABLE IF NOT EXISTS group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, session_number)
);

CREATE INDEX idx_group_sessions_group ON group_sessions(group_id);
CREATE INDEX idx_group_sessions_date ON group_sessions(session_date);

-- Tabla: group_session_topics (temas por sesión/curso - COPIA independiente)
CREATE TABLE IF NOT EXISTS group_session_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_mode VARCHAR(20) NOT NULL CHECK (topic_mode IN ('auto', 'selected', 'manual')),
  topic_title TEXT NOT NULL,
  topic_description TEXT,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, course_id)
);

CREATE INDEX idx_group_session_topics_session ON group_session_topics(session_id);
CREATE INDEX idx_group_session_topics_course ON group_session_topics(course_id);

-- Modificar group_enrollments existente: añadir campos
ALTER TABLE group_enrollments ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE group_enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE group_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE group_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_group_enrollments_group ON group_enrollments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_enrollments_student ON group_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_group_enrollments_status ON group_enrollments(status);

-- SKIP: Crear tabla porque ya existe
/*
CREATE TABLE IF NOT EXISTS group_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
*/

-- Tabla: group_transactions (historial de cambios de estado)
CREATE TABLE IF NOT EXISTS group_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  observation TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_group_id UUID REFERENCES class_groups(id) ON DELETE SET NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_transactions_group ON group_transactions(group_id);
CREATE INDEX idx_group_transactions_type ON group_transactions(transaction_type);
CREATE INDEX idx_group_transactions_date ON group_transactions(transaction_date DESC);

-- Modificar tabla class_groups: añadir campos de recurrencia
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20) CHECK (recurrence_frequency IN ('daily', 'weekly', 'monthly'));
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS recurrence_days TEXT; -- JSON array: '["monday","thursday"]'
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS max_occurrences INTEGER;

-- Verificación de consistencia
DO $$
DECLARE
  group_courses_count INTEGER;
  group_sessions_count INTEGER;
  group_enrollments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO group_courses_count FROM group_courses;
  SELECT COUNT(*) INTO group_sessions_count FROM group_sessions;
  SELECT COUNT(*) INTO group_enrollments_count FROM group_enrollments;
  
  RAISE NOTICE 'Migración 005 completada:';
  RAISE NOTICE '- Cursos asignados a grupos: %', group_courses_count;
  RAISE NOTICE '- Sesiones creadas: %', group_sessions_count;
  RAISE NOTICE '- Inscripciones: %', group_enrollments_count;
END $$;
