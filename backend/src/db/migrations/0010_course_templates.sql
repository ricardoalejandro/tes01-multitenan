-- Migración: Plantillas de Cursos Globales
-- Fecha: 2025-11-27

-- Tabla: course_templates (Plantillas globales sin branchId)
CREATE TABLE IF NOT EXISTS course_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabla: course_template_topics (Temas de plantilla)
CREATE TABLE IF NOT EXISTS course_template_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_template_topics_template ON course_template_topics(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON course_templates(is_active);

-- Comentarios
COMMENT ON TABLE course_templates IS 'Plantillas de cursos globales disponibles para todas las filiales';
COMMENT ON TABLE course_template_topics IS 'Temas predefinidos de cada plantilla de curso';
