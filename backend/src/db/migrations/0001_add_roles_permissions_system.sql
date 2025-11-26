-- Migración: Sistema de Roles, Permisos y Autenticación Avanzada
-- Fecha: 2025-11-12

-- ============================================
-- PASO 1: Crear nuevos ENUMs
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('admin', 'normal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE counseling_indicator AS ENUM ('frio', 'tibio', 'caliente');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- PASO 2: Modificar tabla USERS
-- ============================================

-- Añadir nuevas columnas a users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS user_type user_type DEFAULT 'normal';

-- Crear índice único para email (si no existe)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

-- Migrar datos existentes: convertir usuarios con role 'superadmin' o 'admin' a user_type 'admin'
UPDATE users 
SET user_type = 'admin' 
WHERE role IN ('superadmin', 'admin');

-- Actualizar usuarios sin email con un email temporal (deben cambiarlo)
UPDATE users 
SET email = username || '@temp.escolastica.local'
WHERE email IS NULL OR email = '';

-- Hacer email NOT NULL después de migrar
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- ============================================
-- PASO 3: Modificar tabla BRANCHES
-- ============================================

-- Añadir campo active
ALTER TABLE branches 
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;

-- ============================================
-- PASO 4: Crear tabla ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PASO 5: Crear tabla ROLE_PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(role_id, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ============================================
-- PASO 6: Crear tabla USER_BRANCH_ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS user_branch_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_roles_user ON user_branch_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_roles_branch ON user_branch_roles(branch_id);

-- ============================================
-- PASO 7: Crear tabla PHILOSOPHICAL_COUNSELING
-- ============================================

CREATE TABLE IF NOT EXISTS philosophical_counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  group_name TEXT NOT NULL,
  group_code TEXT,
  counseling_date DATE NOT NULL DEFAULT CURRENT_DATE,
  indicator counseling_indicator NOT NULL,
  observations TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_counseling_student ON philosophical_counseling(student_id);
CREATE INDEX IF NOT EXISTS idx_counseling_date ON philosophical_counseling(counseling_date DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_branch ON philosophical_counseling(branch_id);

-- ============================================
-- PASO 8: Crear tabla SYSTEM_CONFIG
-- ============================================

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- PASO 9: Crear tabla PASSWORD_RESET_TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_tokens(expires_at);

-- ============================================
-- PASO 10: Insertar ROLES predefinidos
-- ============================================

-- Rol: Administrador (acceso total)
INSERT INTO roles (name, description, is_system_role) 
VALUES ('Administrador', 'Acceso total a todos los módulos y funcionalidades', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Rol: Instructor (gestiona clases, asistencia, asesorías)
INSERT INTO roles (name, description, is_system_role) 
VALUES ('Instructor', 'Gestiona grupos, asistencia y asesorías filosóficas', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Rol: Consultor (solo lectura)
INSERT INTO roles (name, description, is_system_role) 
VALUES ('Consultor', 'Solo lectura en todos los módulos', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PASO 11: Configurar PERMISOS para roles predefinidos
-- ============================================

-- Permisos para Administrador (acceso total)
DO $$
DECLARE
  admin_role_id UUID;
  modules TEXT[] := ARRAY['students', 'courses', 'instructors', 'groups', 'attendance', 'counseling', 'enrollments'];
  module_name TEXT;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrador';
  
  IF admin_role_id IS NOT NULL THEN
    FOREACH module_name IN ARRAY modules
    LOOP
      INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
      VALUES (admin_role_id, module_name, TRUE, TRUE, TRUE, TRUE)
      ON CONFLICT (role_id, module) DO UPDATE 
      SET can_view = TRUE, can_create = TRUE, can_edit = TRUE, can_delete = TRUE;
    END LOOP;
  END IF;
END $$;

-- Permisos para Instructor
DO $$
DECLARE
  instructor_role_id UUID;
BEGIN
  SELECT id INTO instructor_role_id FROM roles WHERE name = 'Instructor';
  
  IF instructor_role_id IS NOT NULL THEN
    -- Ver estudiantes, cursos, instructores, inscripciones
    INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
    VALUES 
      (instructor_role_id, 'students', TRUE, FALSE, FALSE, FALSE),
      (instructor_role_id, 'courses', TRUE, FALSE, FALSE, FALSE),
      (instructor_role_id, 'instructors', TRUE, FALSE, FALSE, FALSE),
      (instructor_role_id, 'enrollments', TRUE, FALSE, FALSE, FALSE)
    ON CONFLICT (role_id, module) DO UPDATE 
    SET can_view = TRUE;
    
    -- Gestionar grupos, asistencia, asesorías
    INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
    VALUES 
      (instructor_role_id, 'groups', TRUE, TRUE, TRUE, FALSE),
      (instructor_role_id, 'attendance', TRUE, TRUE, TRUE, FALSE),
      (instructor_role_id, 'counseling', TRUE, TRUE, TRUE, FALSE)
    ON CONFLICT (role_id, module) DO UPDATE 
    SET can_view = TRUE, can_create = TRUE, can_edit = TRUE;
  END IF;
END $$;

-- Permisos para Consultor (solo lectura)
DO $$
DECLARE
  consultor_role_id UUID;
  modules TEXT[] := ARRAY['students', 'courses', 'instructors', 'groups', 'attendance', 'counseling', 'enrollments'];
  module_name TEXT;
BEGIN
  SELECT id INTO consultor_role_id FROM roles WHERE name = 'Consultor';
  
  IF consultor_role_id IS NOT NULL THEN
    FOREACH module_name IN ARRAY modules
    LOOP
      INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
      VALUES (consultor_role_id, module_name, TRUE, FALSE, FALSE, FALSE)
      ON CONFLICT (role_id, module) DO UPDATE 
      SET can_view = TRUE, can_create = FALSE, can_edit = FALSE, can_delete = FALSE;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- PASO 12: Migrar usuarios existentes a user_branch_roles
-- ============================================

-- Asignar rol "Administrador" en todas las filiales a usuarios admin/superadmin
DO $$
DECLARE
  admin_role_id UUID;
  user_record RECORD;
  branch_record RECORD;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrador';
  
  IF admin_role_id IS NOT NULL THEN
    FOR user_record IN SELECT id FROM users WHERE user_type = 'admin'
    LOOP
      FOR branch_record IN SELECT id FROM branches WHERE status != 'eliminado'
      LOOP
        INSERT INTO user_branch_roles (user_id, branch_id, role_id)
        VALUES (user_record.id, branch_record.id, admin_role_id)
        ON CONFLICT (user_id, branch_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- FINALIZADO
-- ============================================

-- Comentario de finalización
COMMENT ON TABLE roles IS 'Roles personalizados del sistema con permisos configurables';
COMMENT ON TABLE role_permissions IS 'Permisos granulares por rol y módulo (view, create, edit, delete)';
COMMENT ON TABLE user_branch_roles IS 'Asignación de usuarios a filiales con roles específicos';
COMMENT ON TABLE philosophical_counseling IS 'Asesorías filosóficas con datos históricos del grupo';
COMMENT ON TABLE system_config IS 'Configuración global del sistema (SMTP, etc)';
COMMENT ON TABLE password_reset_tokens IS 'Tokens temporales para reseteo de contraseña por email';
