-- Migration: Holidays, Levels, and Locations
-- Description: Add departments, provinces, districts, levels, holidays tables and modify branches

-- 1. Departamentos del Perú (precargados)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Provincias (relacionadas a departamento)
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Distritos (relacionados a provincia)
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Niveles organizacionales
CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  manager_name VARCHAR(150),
  manager_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Feriados
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  year INT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('national', 'provincial')),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Modificar branches (agregar campos)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS province_id UUID REFERENCES provinces(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_manager VARCHAR(150);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES levels(id);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_provinces_department ON provinces(department_id);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_id);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_branches_department ON branches(department_id);
CREATE INDEX IF NOT EXISTS idx_branches_level ON branches(level_id);

-- =====================================================
-- SEED: Departamentos del Perú (24 + Provincia Constitucional del Callao)
-- =====================================================
INSERT INTO departments (code, name) VALUES
  ('AMA', 'Amazonas'),
  ('ANC', 'Áncash'),
  ('APU', 'Apurímac'),
  ('ARE', 'Arequipa'),
  ('AYA', 'Ayacucho'),
  ('CAJ', 'Cajamarca'),
  ('CAL', 'Callao'),
  ('CUS', 'Cusco'),
  ('HUV', 'Huancavelica'),
  ('HUC', 'Huánuco'),
  ('ICA', 'Ica'),
  ('JUN', 'Junín'),
  ('LAL', 'La Libertad'),
  ('LAM', 'Lambayeque'),
  ('LIM', 'Lima'),
  ('LOR', 'Loreto'),
  ('MDD', 'Madre de Dios'),
  ('MOQ', 'Moquegua'),
  ('PAS', 'Pasco'),
  ('PIU', 'Piura'),
  ('PUN', 'Puno'),
  ('SAM', 'San Martín'),
  ('TAC', 'Tacna'),
  ('TUM', 'Tumbes'),
  ('UCA', 'Ucayali')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED: Provincias principales (Lima y algunas capitales)
-- =====================================================
INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'LIM', 'Lima'
FROM departments d WHERE d.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'ARE', 'Arequipa'
FROM departments d WHERE d.code = 'ARE'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'TRU', 'Trujillo'
FROM departments d WHERE d.code = 'LAL'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'CHI', 'Chiclayo'
FROM departments d WHERE d.code = 'LAM'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'PIU', 'Piura'
FROM departments d WHERE d.code = 'PIU'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'CUS', 'Cusco'
FROM departments d WHERE d.code = 'CUS'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'CAL', 'Callao'
FROM departments d WHERE d.code = 'CAL'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'HUA', 'Huancayo'
FROM departments d WHERE d.code = 'JUN'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'ICA', 'Ica'
FROM departments d WHERE d.code = 'ICA'
ON CONFLICT DO NOTHING;

INSERT INTO provinces (department_id, code, name) 
SELECT d.id, 'TAC', 'Tacna'
FROM departments d WHERE d.code = 'TAC'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED: Distritos de Lima (principales)
-- =====================================================
INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM01', 'Lima'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM02', 'Miraflores'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM03', 'San Isidro'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM04', 'Surco'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM05', 'San Borja'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM06', 'La Molina'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM07', 'Jesús María'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM08', 'Lince'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM09', 'San Miguel'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO districts (province_id, code, name)
SELECT p.id, 'LIM10', 'Pueblo Libre'
FROM provinces p WHERE p.code = 'LIM'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED: Feriados Nacionales 2025 del Perú
-- =====================================================
INSERT INTO holidays (name, description, date, year, type) VALUES
  ('Año Nuevo', 'Celebración del inicio del año', '2025-01-01', 2025, 'national'),
  ('Jueves Santo', 'Semana Santa - Jueves Santo', '2025-04-17', 2025, 'national'),
  ('Viernes Santo', 'Semana Santa - Viernes Santo', '2025-04-18', 2025, 'national'),
  ('Sábado de Gloria', 'Semana Santa - Sábado de Gloria', '2025-04-19', 2025, 'national'),
  ('Día del Trabajo', 'Día Internacional del Trabajador', '2025-05-01', 2025, 'national'),
  ('San Pedro y San Pablo', 'Día de San Pedro y San Pablo', '2025-06-29', 2025, 'national'),
  ('Día de la Fuerza Aérea', 'Aniversario de la Fuerza Aérea del Perú', '2025-07-23', 2025, 'national'),
  ('Fiestas Patrias', 'Día de la Independencia del Perú', '2025-07-28', 2025, 'national'),
  ('Fiestas Patrias', 'Día de las Fuerzas Armadas', '2025-07-29', 2025, 'national'),
  ('Santa Rosa de Lima', 'Día de Santa Rosa de Lima', '2025-08-30', 2025, 'national'),
  ('Combate de Angamos', 'Día del Combate de Angamos', '2025-10-08', 2025, 'national'),
  ('Día de Todos los Santos', 'Día de Todos los Santos', '2025-11-01', 2025, 'national'),
  ('Inmaculada Concepción', 'Día de la Inmaculada Concepción', '2025-12-08', 2025, 'national'),
  ('Batalla de Ayacucho', 'Aniversario de la Batalla de Ayacucho', '2025-12-09', 2025, 'national'),
  ('Navidad', 'Navidad del Señor', '2025-12-25', 2025, 'national')
ON CONFLICT DO NOTHING;

-- Feriados 2026 (algunos básicos)
INSERT INTO holidays (name, description, date, year, type) VALUES
  ('Año Nuevo', 'Celebración del inicio del año', '2026-01-01', 2026, 'national'),
  ('Día del Trabajo', 'Día Internacional del Trabajador', '2026-05-01', 2026, 'national'),
  ('Fiestas Patrias', 'Día de la Independencia del Perú', '2026-07-28', 2026, 'national'),
  ('Fiestas Patrias', 'Día de las Fuerzas Armadas', '2026-07-29', 2026, 'national'),
  ('Navidad', 'Navidad del Señor', '2026-12-25', 2026, 'national')
ON CONFLICT DO NOTHING;
