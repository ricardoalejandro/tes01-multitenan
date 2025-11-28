# Plan: Feriados, Niveles y Ubicaciones Geográficas

## 📊 Alcance
- [x] Base de Datos
- [x] Backend
- [x] Frontend

## 🎯 Objetivos
1. Corregir bug de timezone en fechas de sesiones
2. Crear módulo de Feriados (Nacionales y Provinciales) en Enabler
3. Crear módulo de Niveles organizacionales en Enabler
4. Crear módulo de Ubicaciones Geográficas (Departamentos/Provincias/Distritos) en Enabler
5. Ampliar campos de Filiales
6. Integrar feriados en generación de calendario de grupos

---

## 📐 Diseño de Base de Datos

### Nuevas Tablas

```sql
-- 1. Departamentos del Perú (precargados)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Provincias (relacionadas a departamento)
CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Distritos (relacionados a provincia)
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Niveles organizacionales
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE, -- Autogenerado: NVL-001, NVL-002...
  name VARCHAR(100) NOT NULL,
  manager_name VARCHAR(150),
  manager_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Feriados
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  year INT NOT NULL, -- Para filtrar por año
  type VARCHAR(20) NOT NULL CHECK (type IN ('national', 'provincial')),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- Solo para provinciales
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Modificar branches (agregar campos)
ALTER TABLE branches ADD COLUMN department_id UUID REFERENCES departments(id);
ALTER TABLE branches ADD COLUMN province_id UUID REFERENCES provinces(id);
ALTER TABLE branches ADD COLUMN district_id UUID REFERENCES districts(id);
ALTER TABLE branches ADD COLUMN branch_manager VARCHAR(150);
ALTER TABLE branches ADD COLUMN level_id UUID REFERENCES levels(id);
```

---

## 🔌 Backend - Endpoints

### Departamentos, Provincias, Distritos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/departments | Listar departamentos |
| POST | /api/departments | Crear departamento |
| PUT | /api/departments/:id | Editar departamento |
| DELETE | /api/departments/:id | Eliminar (con advertencia cascada) |
| GET | /api/provinces?departmentId= | Listar provincias por depto |
| POST | /api/provinces | Crear provincia |
| PUT | /api/provinces/:id | Editar provincia |
| DELETE | /api/provinces/:id | Eliminar (con advertencia cascada) |
| GET | /api/districts?provinceId= | Listar distritos por provincia |
| POST | /api/districts | Crear distrito |
| PUT | /api/districts/:id | Editar distrito |
| DELETE | /api/districts/:id | Eliminar |

### Niveles
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/levels | Listar niveles |
| POST | /api/levels | Crear nivel (código autogenerado) |
| PUT | /api/levels/:id | Editar nivel |
| DELETE | /api/levels/:id | Eliminar nivel |

### Feriados
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/holidays?type=&year= | Listar feriados filtrados |
| POST | /api/holidays | Crear feriado |
| PUT | /api/holidays/:id | Editar feriado |
| DELETE | /api/holidays/:id | Eliminar feriado |
| POST | /api/holidays/replicate | Replicar feriados del año anterior |

### Modificar Branches
- PUT /api/branches/:id - Agregar nuevos campos
- POST /api/branches - Agregar nuevos campos

### Modificar Generación de Calendario
- POST /api/groups/generate-calendar - Saltar feriados y retornar mensaje

---

## 🎨 Frontend - Componentes

### Enabler - Nuevos Módulos

1. **Feriados** (`/admin/holidays`)
   - Dos tabs: "Nacionales" y "Provinciales"
   - Filtro por año
   - Botón "Replicar del año anterior"
   - CRUD completo
   - En provinciales: selector de departamento

2. **Niveles** (`/admin/levels`)
   - Tabla con código, nombre, encargado, celular
   - CRUD completo
   - Código autogenerado visible

3. **Ubicaciones Geográficas** (`/admin/locations`)
   - Tres tabs: "Departamentos", "Provincias", "Distritos"
   - Provincias filtradas por departamento seleccionado
   - Distritos filtrados por provincia seleccionada
   - Advertencia al eliminar sobre cascada

### Modificar Filiales (`/admin/branches`)
- Agregar campos: Departamento, Provincia, Distrito, Jefe de Filial, Nivel
- Provincia filtrada por departamento seleccionado
- Distrito filtrado por provincia seleccionada
- Al seleccionar Nivel → autocargar encargado

### Modificar GroupFormDialog
- Mostrar mensaje de feriados saltados al generar calendario

---

## ✅ Plan de Implementación (Orden de ejecución)

### Fase 1: Bug Fix (Prioridad Alta)
- [ ] 1.1 Corregir timezone en fechas de sesiones (SessionCalendarEditor)

### Fase 2: Base de Datos
- [ ] 2.1 Crear migración con nuevas tablas
- [ ] 2.2 Seed de departamentos del Perú (24 + Callao)
- [ ] 2.3 Seed de provincias principales
- [ ] 2.4 Seed de feriados nacionales 2025

### Fase 3: Backend - Ubicaciones
- [ ] 3.1 Rutas de departamentos (CRUD)
- [ ] 3.2 Rutas de provincias (CRUD)
- [ ] 3.3 Rutas de distritos (CRUD)
- [ ] 3.4 **TEST**: Probar endpoints de ubicaciones

### Fase 4: Backend - Niveles
- [ ] 4.1 Rutas de niveles (CRUD con código auto)
- [ ] 4.2 **TEST**: Probar endpoints de niveles

### Fase 5: Backend - Feriados
- [ ] 5.1 Rutas de feriados (CRUD)
- [ ] 5.2 Endpoint de replicar año anterior
- [ ] 5.3 **TEST**: Probar endpoints de feriados

### Fase 6: Backend - Branches y Calendario
- [ ] 6.1 Modificar rutas de branches (nuevos campos)
- [ ] 6.2 Modificar generación de calendario (saltar feriados)
- [ ] 6.3 **TEST**: Probar generación saltando feriados

### Fase 7: Frontend - Enabler
- [ ] 7.1 Módulo de Ubicaciones Geográficas
- [ ] 7.2 Módulo de Niveles
- [ ] 7.3 Módulo de Feriados (tabs Nacional/Provincial)
- [ ] 7.4 **TEST**: Verificar CRUD en UI

### Fase 8: Frontend - Filiales
- [ ] 8.1 Modificar formulario de filiales (nuevos campos)
- [ ] 8.2 Cascada de selects (Depto → Prov → Distrito)
- [ ] 8.3 Autocarga de encargado al seleccionar nivel
- [ ] 8.4 **TEST**: Verificar formulario de filiales

### Fase 9: Frontend - Calendario de Grupos
- [ ] 9.1 Mostrar mensaje de feriados saltados
- [ ] 9.2 **TEST**: Crear grupo y verificar mensaje

---

## 🚨 Consideraciones

1. **Departamentos precargados**: Se cargarán los 24 departamentos + Callao
2. **Feriados 2025**: Se cargarán los feriados nacionales del Perú
3. **Cascada de eliminación**: Advertir al usuario antes de eliminar
4. **Timezone**: Usar UTC y formatear en frontend con timezone local

---

## 📦 Archivos a Crear/Modificar

### Backend
- `backend/drizzle/XXXX_holidays_levels_locations.sql` (migración)
- `backend/src/db/schema.ts` (agregar tablas)
- `backend/src/routes/departments.ts` (nuevo)
- `backend/src/routes/provinces.ts` (nuevo)
- `backend/src/routes/districts.ts` (nuevo)
- `backend/src/routes/levels.ts` (nuevo)
- `backend/src/routes/holidays.ts` (nuevo)
- `backend/src/routes/branches.ts` (modificar)
- `backend/src/routes/groups.ts` (modificar generate-calendar)
- `backend/src/index.ts` (registrar rutas)

### Frontend
- `src/app/admin/holidays/page.tsx` (nuevo)
- `src/app/admin/levels/page.tsx` (nuevo)
- `src/app/admin/locations/page.tsx` (nuevo)
- `src/app/admin/branches/page.tsx` (modificar)
- `src/components/modules/GroupFormDialog.tsx` (modificar)
- `src/components/modules/SessionCalendarEditor.tsx` (bug fix)

---

## ⏱️ Tiempo Estimado
- Fase 1: 10 min
- Fase 2-3: 30 min
- Fase 4-5: 30 min
- Fase 6: 20 min
- Fase 7-9: 60 min
- **Total: ~2.5 horas**

---

**¿Aprobado para proceder?**
