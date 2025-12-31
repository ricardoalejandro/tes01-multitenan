# Plan: Módulo de Asistencias

## 📊 Alcance
- [x] Frontend
- [x] Backend
- [x] Base de Datos

## 🎯 Objetivos
Desarrollar un módulo completo de gestión de asistencias que permita:
1. Registrar asistencia de estudiantes por sesión
2. Múltiples vistas de selección de sesión (lista, calendario, pendientes, timeline)
3. Flexibilidad: instructor real puede diferir del planificado
4. Historial de observaciones por estudiante
5. Estados de sesión (pendiente/dictada) con bloqueo de edición
6. Alertas de sesiones pendientes
7. Protección de datos dictados en edición de grupos

---

## 🗄️ Cambios en Base de Datos

### Nueva Tabla: `session_attendance`
```sql
CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente', -- 'asistio', 'no_asistio', 'tarde', 'justificado', 'permiso'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);
```

### Nueva Tabla: `attendance_observations`
```sql
CREATE TABLE attendance_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES session_attendance(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Quien escribió la observación
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Nueva Tabla: `session_execution`
```sql
-- Registro de la ejecución real de la sesión (puede diferir de la planificación)
CREATE TABLE session_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES group_sessions(id) ON DELETE CASCADE,
  actual_instructor_id UUID REFERENCES instructors(id),
  actual_assistant_id UUID REFERENCES group_assistants(id),
  actual_topic TEXT,
  actual_date DATE NOT NULL, -- Fecha real en que se dictó
  notes TEXT, -- Notas generales de la sesión
  executed_by UUID REFERENCES users(id), -- Quien registró
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modificar Tabla: `group_sessions`
```sql
ALTER TABLE group_sessions ADD COLUMN status TEXT DEFAULT 'pendiente'; -- 'pendiente', 'dictada'
```

---

## 🔌 Backend

### Nuevos Endpoints

#### Asistencias
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/attendance/groups/:groupId/sessions` | Listar sesiones de un grupo con estado |
| GET | `/api/attendance/sessions/:sessionId` | Detalle de sesión para asistencia |
| POST | `/api/attendance/sessions/:sessionId/start` | Iniciar registro de asistencia |
| PUT | `/api/attendance/sessions/:sessionId/complete` | Marcar sesión como dictada |
| GET | `/api/attendance/sessions/:sessionId/students` | Estudiantes con su asistencia |
| PUT | `/api/attendance/students/:attendanceId` | Actualizar asistencia de estudiante |
| POST | `/api/attendance/students/:attendanceId/observations` | Agregar observación |
| GET | `/api/attendance/students/:attendanceId/observations` | Historial de observaciones |
| PUT | `/api/attendance/sessions/:sessionId/execution` | Actualizar datos reales de ejecución |
| GET | `/api/attendance/pending` | Sesiones pendientes (para alertas) |
| GET | `/api/attendance/calendar/:groupId` | Vista calendario de sesiones |

---

## 🎨 Frontend

### Estructura de Carpetas
```
src/components/modules/attendance/
├── AttendanceModule.tsx          # Módulo principal
├── SessionSelector.tsx           # Selector de sesión (toggle de vistas)
├── views/
│   ├── SessionListView.tsx       # Vista A: Lista con filtros
│   ├── SessionCalendarView.tsx   # Vista B: Calendario
│   ├── SessionPendingView.tsx    # Vista C: Pendientes de hoy
│   └── SessionTimelineView.tsx   # Vista D: Timeline vertical
├── AttendanceSheet.tsx           # Hoja de asistencia principal
├── StudentAttendanceRow.tsx      # Fila de cada estudiante
├── ObservationHistory.tsx        # Historial de observaciones
├── SessionExecutionForm.tsx      # Formulario de ejecución real
└── PendingSessionsAlert.tsx      # Alerta de sesiones pendientes
```

### Diseño UI/UX

#### 1. Entrada al Módulo (desde menú lateral)
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Asistencias                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Tienes 3 sesiones pendientes de registrar           │   │
│  │     • Anubis I - Sesión 5 (hace 2 días)                 │   │
│  │     • Teseo II - Sesión 3 (ayer)                        │   │
│  │     • Osiris I - Sesión 1 (hoy)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Selecciona un grupo para comenzar:                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔍 Buscar grupo...                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Anubis I   │  │  Teseo II   │  │  Osiris I   │            │
│  │  Activo     │  │  Activo     │  │  Activo     │            │
│  │  📅 Mié     │  │  📅 Jue     │  │  📅 Vie     │            │
│  │  5/10 ses.  │  │  3/8 ses.   │  │  1/12 ses.  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Selector de Sesión (con toggle de vistas)
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Volver                           Grupo: Anubis I            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [📋 Lista] [📅 Calendario] [⏰ Pendientes] [📊 Timeline] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  VISTA A: LISTA CON FILTROS                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Filtrar: [Todas ▼] [Pendientes] [Dictadas]               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ #  │ Fecha      │ Tema              │ Estado   │ Acción  │  │
│  ├────┼────────────┼───────────────────┼──────────┼─────────┤  │
│  │ 1  │ 27/11/2025 │ Introducción      │ ✅ Dict. │ 👁️ Ver  │  │
│  │ 2  │ 04/12/2025 │ Fundamentos       │ ✅ Dict. │ 👁️ Ver  │  │
│  │ 3  │ 11/12/2025 │ Práctica I        │ ⏳ Pend. │ ✏️ Reg. │  │
│  │ 4  │ 18/12/2025 │ Teoría avanzada   │ ⏳ Pend. │ ✏️ Reg. │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  VISTA B: CALENDARIO                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │     Diciembre 2025                    < Mes >            │  │
│  │  Lu  Ma  Mi  Ju  Vi  Sa  Do                              │  │
│  │  1   2   3  [4]  5   6   7    ← [4] tiene sesión        │  │
│  │  8   9  10 [11] 12  13  14       con indicador de       │  │
│  │  15  16  17 [18] 19  20  21      estado (color)         │  │
│  │  22  23  24  25  26  27  28                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  VISTA C: PENDIENTES                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔴 Sesiones atrasadas (debieron dictarse)               │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Sesión 3 - 11/12/2025 - Práctica I                 │  │  │
│  │  │ Hace 5 días │ 8 estudiantes                        │  │  │
│  │  │                              [Registrar Asistencia]│  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                          │  │
│  │  🟡 Próximas sesiones                                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Sesión 4 - 18/12/2025 - Teoría avanzada            │  │  │
│  │  │ En 2 días │ 8 estudiantes                          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  VISTA D: TIMELINE                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ○───●───●───○───○───○───○───○───○───○                   │  │
│  │  1   2   3   4   5   6   7   8   9   10                  │  │
│  │      ↑                                                   │  │
│  │  [Sesión 3 seleccionada]                                 │  │
│  │  Fecha: 11/12/2025                                       │  │
│  │  Tema: Práctica I                                        │  │
│  │  Estado: Pendiente                                       │  │
│  │                        [Registrar Asistencia →]          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Hoja de Asistencia (Pantalla Principal) 🌟
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Volver a sesiones                                                        │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  📚 SESIÓN 3 - PRÁCTICA I                              Estado: ⏳     ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                       ║  │
│  ║  📅 PLANIFICADO                    📝 EJECUCIÓN REAL                  ║  │
│  ║  ─────────────────────────────     ─────────────────────────────────  ║  │
│  ║  Fecha: 11/12/2025                 Fecha dictada: [11/12/2025 ▼]     ║  │
│  ║  Instructor: Juan Pérez            Instructor: [Juan Pérez ▼]        ║  │
│  ║  Tema: Práctica I                  Tema dictado: [_______________]   ║  │
│  ║  Asistente: María García           Asistente: [María García ▼]       ║  │
│  ║  Horario: 19:30 - 21:30                                               ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👥 ASISTENCIA DE PROBACIONISTAS                      8 estudiantes  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 👤 Carlos Mendoza Quispe                                        │ │  │
│  │  │    DNI: 12345678 │ Tel: 987654321                               │ │  │
│  │  │                                                                 │ │  │
│  │  │    [✅ Asistió] [❌ No asistió] [⏰ Tarde] [📋 Justif.] [🎫 Perm.]│ │  │
│  │  │                                        Seleccionado: ✅          │ │  │
│  │  │                                                                 │ │  │
│  │  │    💬 Observaciones:                              [+ Agregar]   │ │  │
│  │  │    ┌─────────────────────────────────────────────────────────┐  │ │  │
│  │  │    │ 📝 10/12 14:30 - María (Asistente)                      │  │ │  │
│  │  │    │ "Llamé al papá, confirmó que vendrá mañana"             │  │ │  │
│  │  │    │                                                         │  │ │  │
│  │  │    │ 📝 11/12 20:00 - Juan (Instructor)                      │  │ │  │
│  │  │    │ "Excelente participación en clase"                      │  │ │  │
│  │  │    └─────────────────────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 👤 Ana Lucía Vargas Torres                                      │ │  │
│  │  │    DNI: 87654321 │ Tel: 912345678                               │ │  │
│  │  │                                                                 │ │  │
│  │  │    [✅ Asistió] [❌ No asistió] [⏰ Tarde] [📋 Justif.] [🎫 Perm.]│ │  │
│  │  │                                        Seleccionado: ❌          │ │  │
│  │  │                                                                 │ │  │
│  │  │    💬 Observaciones:                              [+ Agregar]   │ │  │
│  │  │    ┌─────────────────────────────────────────────────────────┐  │ │  │
│  │  │    │ 📝 11/12 10:00 - María (Asistente)                      │  │ │  │
│  │  │    │ "No contestó llamadas"                                  │  │ │  │
│  │  │    └─────────────────────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  ... más estudiantes ...                                              │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  📝 NOTAS GENERALES DE LA SESIÓN                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Se cubrió el tema completo. Hubo buena participación general.   │  │  │
│  │  │ Se dejaron ejercicios para la próxima clase.                    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │    [💾 Guardar Borrador]              [✅ MARCAR COMO CLASE DICTADA]  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4. Vista de Sesión Dictada (Solo Lectura)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Volver a sesiones                                                        │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  📚 SESIÓN 3 - PRÁCTICA I                    Estado: ✅ DICTADA       ║  │
│  ║                                                                       ║  │
│  ║  🔒 Esta sesión ya fue registrada y no puede modificarse              ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ... datos en modo solo lectura con fondo gris sutil ...                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5. Cambios en Edición de Grupos (Protección)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Editar Grupo: Anubis I                                                     │
│                                                                             │
│  ⚠️ Este grupo tiene 2 sesiones dictadas. Solo puedes editar sesiones      │
│     pendientes.                                                             │
│                                                                             │
│  [🚫 Generar Calendario] ← Botón deshabilitado visual y funcionalmente     │
│  [+ Añadir Sesión Manualmente]                                              │
│                                                                             │
│  SESIONES:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Sesión 1 - 27/11/2025 - Introducción         [🔒 Dictada]        │   │
│  │    (No editable)                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ✅ Sesión 2 - 04/12/2025 - Fundamentos          [🔒 Dictada]        │   │
│  │    (No editable)                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ⏳ Sesión 3 - 11/12/2025 - Práctica I           [✏️] [🗑️]          │   │
│  │    (Editable)                                                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ⏳ Sesión 4 - 18/12/2025 - Teoría avanzada      [✏️] [🗑️]          │   │
│  │    (Editable)                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Flujo de Integración

```
Usuario accede a módulo "Asistencias"
       ↓
Ve alerta de sesiones pendientes (si hay)
       ↓
Selecciona un grupo activo
       ↓
Ve sesiones del grupo (4 vistas disponibles)
       ↓
Selecciona sesión pendiente
       ↓
Se abre hoja de asistencia con:
  - Datos planificados (solo lectura)
  - Formulario de ejecución real (editable)
  - Lista de estudiantes inscritos
       ↓
Por cada estudiante:
  - Marca estado de asistencia
  - Agrega observaciones (historial)
       ↓
Completa datos de ejecución:
  - Instructor real
  - Tema dictado
  - Fecha real
  - Notas generales
       ↓
Click "Marcar como Clase Dictada"
       ↓
Confirmación: ¿Estás seguro? Esta acción no se puede deshacer.
       ↓
Sesión cambia a estado "dictada"
       ↓
Ya no se puede editar (ni desde asistencias ni desde grupos)
```

---

## ✅ Criterios de Aceptación

1. ✅ Módulo accesible desde menú lateral (reemplaza "Próximamente")
2. ✅ 4 vistas de selección de sesión con toggle
3. ✅ Alerta visual de sesiones pendientes
4. ✅ Hoja de asistencia muestra datos planificados vs ejecución real
5. ✅ Instructor/tema/asistente reales pueden diferir de planificados
6. ✅ 5 estados de asistencia: asistió, no_asistió, tarde, justificado, permiso
7. ✅ Historial de observaciones por estudiante
8. ✅ Botón "Marcar como Clase Dictada" cambia estado
9. ✅ Sesiones dictadas en solo lectura con indicador visual
10. ✅ En edición de grupos: sesiones dictadas no editables
11. ✅ Botón "Generar Calendario" deshabilitado si hay sesiones dictadas
12. ✅ Solo se pueden eliminar/editar sesiones pendientes
13. ✅ Diseño bonito, moderno y profesional

---

## 📁 Archivos a Crear/Modificar

### Backend - Nuevos:
- `backend/src/routes/attendance.ts` - Todas las rutas de asistencia

### Backend - Modificar:
- `backend/src/db/schema.ts` - Nuevas tablas
- `backend/src/index.ts` - Registrar rutas
- `backend/src/routes/groups.ts` - Validar sesiones dictadas en edición

### Frontend - Nuevos:
- `src/components/modules/AttendanceModule.tsx`
- `src/components/modules/attendance/SessionSelector.tsx`
- `src/components/modules/attendance/views/SessionListView.tsx`
- `src/components/modules/attendance/views/SessionCalendarView.tsx`
- `src/components/modules/attendance/views/SessionPendingView.tsx`
- `src/components/modules/attendance/views/SessionTimelineView.tsx`
- `src/components/modules/attendance/AttendanceSheet.tsx`
- `src/components/modules/attendance/StudentAttendanceCard.tsx`
- `src/components/modules/attendance/ObservationHistory.tsx`
- `src/components/modules/attendance/SessionExecutionForm.tsx`
- `src/components/modules/attendance/PendingSessionsAlert.tsx`
- `src/components/modules/attendance/GroupSelector.tsx`

### Frontend - Modificar:
- `src/app/workspace/page.tsx` - Agregar módulo asistencias
- `src/lib/api.ts` - Nuevos endpoints
- `src/components/modules/GroupFormDialog.tsx` - Proteger sesiones dictadas
- `src/components/modules/SessionCalendarEditor.tsx` - Indicador visual dictadas

---

## 📋 Orden de Implementación

### Fase 1: Base de Datos y Backend
1. Schema: tablas de asistencia
2. Rutas: endpoints de asistencia
3. Migración BD

### Fase 2: Frontend - Estructura Base
4. AttendanceModule (página principal)
5. GroupSelector (selección de grupo)
6. PendingSessionsAlert (alertas)

### Fase 3: Frontend - Vistas de Sesión
7. SessionSelector con toggle
8. SessionListView
9. SessionCalendarView
10. SessionPendingView
11. SessionTimelineView

### Fase 4: Frontend - Hoja de Asistencia
12. AttendanceSheet (componente principal)
13. SessionExecutionForm
14. StudentAttendanceCard
15. ObservationHistory

### Fase 5: Protecciones
16. Modificar GroupFormDialog para proteger dictadas
17. Modificar SessionCalendarEditor
18. Validaciones backend para sesiones dictadas

### Fase 6: Testing y Pulido
19. Pruebas completas
20. Ajustes de diseño

---

## 🎨 Paleta de Colores para Estados

| Estado | Color | Uso |
|--------|-------|-----|
| Asistió | Verde (#22c55e) | Badge, botón seleccionado |
| No asistió | Rojo (#ef4444) | Badge, botón seleccionado |
| Tarde | Amarillo (#f59e0b) | Badge, botón seleccionado |
| Justificado | Azul (#3b82f6) | Badge, botón seleccionado |
| Permiso | Púrpura (#8b5cf6) | Badge, botón seleccionado |
| Sesión Pendiente | Gris/Naranja (#f97316) | Indicador |
| Sesión Dictada | Verde (#22c55e) | Indicador, candado |

---

## 🚨 Consideraciones Técnicas

1. **Protección Backend**: Validar en TODOS los endpoints que no se modifiquen sesiones dictadas
2. **Protección Frontend**: Deshabilitar botones + validación en submit
3. **Optimistic UI**: Guardar cambios mientras se edita
4. **Responsive**: Diseño adaptable a móvil para asistentes en campo
5. **Performance**: Paginación en listas largas de estudiantes

---

## ❓ Decisiones Tomadas

| Pregunta | Respuesta |
|----------|-----------|
| Acceso | Menú lateral, módulo independiente |
| Vistas | 4 vistas con toggle |
| Estados sesión | pendiente, dictada |
| Estados asistencia | asistió, no_asistió, tarde, justificado, permiso |
| Observaciones | Historial múltiple por estudiante |
| Instructor real | De lista de instructores existentes |
| Protección dictadas | Solo lectura + bloqueo backend |
| Alertas | Sí, sesiones pendientes |
