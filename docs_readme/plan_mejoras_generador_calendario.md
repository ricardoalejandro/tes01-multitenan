# Plan: Mejoras al Generador de Calendario de Grupos

## 📊 Alcance
- [x] Frontend
- [x] Backend
- [x] Base de Datos

## 🎯 Objetivos
Mejorar el generador de calendario de grupos con:
1. Validaciones de fechas y orden de sesiones
2. Selector de horarios (inicio/fin) bonito y funcional
3. Gestión de asistentes de clase
4. Manejo inteligente de temas vacíos
5. Alertas de gaps en frecuencia (feriados)
6. Drag & drop para reordenar sesiones

---

## 🗄️ Cambios en Base de Datos

### Nueva Tabla: `group_assistants`
```sql
CREATE TABLE group_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  gender TEXT, -- 'Masculino', 'Femenino', 'Otro'
  age INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modificar Tabla: `class_groups`
Agregar campos de horario:
```sql
ALTER TABLE class_groups ADD COLUMN start_time TIME;
ALTER TABLE class_groups ADD COLUMN end_time TIME;
```

### Schema Drizzle (backend/src/db/schema.ts)
```typescript
// Agregar a class_groups
startTime: time('start_time'),
endTime: time('end_time'),

// Nueva tabla
export const groupAssistants = pgTable('group_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  gender: text('gender'), // 'Masculino', 'Femenino', 'Otro'
  age: integer('age'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 🔌 Backend

### Modificar: `backend/src/routes/groups.ts`

1. **Endpoint POST /groups** - Agregar:
   - Recibir `startTime`, `endTime`
   - Recibir array de `assistants`
   - Guardar asistentes en `group_assistants`

2. **Endpoint GET /groups/:id** - Agregar:
   - Incluir `startTime`, `endTime` en respuesta
   - Incluir array de `assistants`

3. **Nuevos Endpoints para Asistentes:**
   - `POST /groups/:id/assistants` - Agregar asistente
   - `PUT /groups/:id/assistants/:assistantId` - Editar asistente
   - `DELETE /groups/:id/assistants/:assistantId` - Eliminar asistente

---

## 🎨 Frontend

### 1. Componente TimePicker (nuevo)
**Archivo:** `src/components/ui/time-picker.tsx`

- Select estilizado con Shadcn
- Rango: 6:00 AM - 11:00 PM
- Intervalos de 30 minutos
- Formato 12h con AM/PM
- Diseño moderno con iconos de reloj

### 2. Componente AssistantForm (nuevo)
**Archivo:** `src/components/modules/groups/AssistantForm.tsx`

Campos:
- Nombre y Apellidos (texto, requerido)
- Teléfono (texto, opcional)
- Sexo (Select: Masculino/Femenino/Otro)
- Edad (número, opcional)

Funcionalidad:
- Lista de asistentes con botón agregar
- Editar/eliminar cada asistente
- Diseño tipo "card" compacto

### 3. Modificar GroupDialog.tsx

#### Paso 1 - Información Básica:
Agregar campos de horario:
```
┌─────────────────────────────────────────────┐
│  Hora de Inicio       Hora de Fin           │
│  ┌──────────────┐    ┌──────────────┐      │
│  │ 🕐 09:00 AM ▼│    │ 🕐 12:00 PM ▼│      │
│  └──────────────┘    └──────────────┘      │
│                                             │
│  ⚠️ La hora de fin debe ser mayor a inicio │
└─────────────────────────────────────────────┘
```

#### Nuevo Paso - Asistentes (entre paso 1 y 2 actual):
```
┌─────────────────────────────────────────────┐
│  Asistentes de Clase (Opcional)             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 👤 María García López               │   │
│  │    📱 987654321 | 👩 Femenino | 25  │   │
│  │                          [✏️] [🗑️] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Agregar Asistente]                      │
└─────────────────────────────────────────────┘
```

### 4. Modificar CalendarEditor.tsx

#### A) Drag & Drop de Sesiones
- Usar `@dnd-kit/core` para reordenamiento
- Al arrastrar, solo cambia el orden visual
- Las fechas se mantienen, usuario edita manualmente
- Indicador visual de arrastre

#### B) Validaciones en tiempo real:

**Validación de orden de fechas:**
```
┌─ Sesión 1 ─────────────────────────────────┐
│ 📅 15/01/2025  ✅                          │
└────────────────────────────────────────────┘
┌─ Sesión 2 ─────────────────────────────────┐
│ 📅 08/01/2025  ❌ Fecha anterior a sesión 1│
└────────────────────────────────────────────┘
```

**Alerta de gap de frecuencia (no bloqueante):**
```
┌─ Sesión 5 ─────────────────────────────────┐
│ 📅 15/02/2025                               │
│ ⚠️ Hay 3 semanas desde la sesión anterior  │
│    (frecuencia configurada: semanal)        │
│    ¿Posible feriado o día especial?         │
└────────────────────────────────────────────┘
```

**Tema vacío (warning):**
```
┌─ Sesión 15 ────────────────────────────────┐
│ 📅 20/03/2025                               │
│ 📚 Tema: [Seleccionar o escribir tema...]  │
│ ⚠️ Esta sesión no tiene tema asignado      │
└────────────────────────────────────────────┘
```

### 5. Validación antes de Crear

Al hacer click en "Crear Grupo":

```typescript
const validations = {
  // BLOQUEANTES (impiden crear)
  dateOrder: "Las fechas deben estar en orden ascendente",
  timeRange: "La hora de fin debe ser mayor a la hora de inicio", 
  emptyTopics: "Hay X sesiones sin tema asignado. Complete todos los temas.",
  
  // NO BLOQUEANTES (solo advertencia)
  frequencyGaps: "Detectamos gaps en la frecuencia (posibles feriados)"
};
```

**Modal de confirmación con warnings:**
```
┌─────────────────────────────────────────────┐
│  ⚠️ Advertencias Detectadas                 │
│                                             │
│  • Sesión 5 y 6 tienen 3 semanas de gap    │
│  • Sesión 12 y 13 tienen 2 semanas de gap  │
│                                             │
│  Esto podría deberse a feriados. ¿Desea    │
│  continuar de todas formas?                 │
│                                             │
│        [Cancelar]  [Crear de todas formas]  │
└─────────────────────────────────────────────┘
```

---

## 🔗 Flujo de Integración

```
Usuario configura grupo
       ↓
Selecciona hora inicio/fin → Validación: fin > inicio
       ↓
Agrega asistentes (opcional)
       ↓
Selecciona cursos/instructores
       ↓
Configura recurrencia → Backend genera fechas
       ↓
CalendarEditor muestra sesiones
       ↓
Usuario puede:
  - Reordenar con drag & drop
  - Editar fechas manualmente
  - Completar temas vacíos
       ↓
Sistema valida en tiempo real:
  - ✅ Orden de fechas
  - ⚠️ Gaps de frecuencia (warning)
  - ❌ Temas vacíos (bloqueante)
       ↓
Click "Crear" → Validación final
       ↓
Si hay warnings no bloqueantes → Modal confirmación
       ↓
Backend guarda: grupo + horarios + asistentes + sesiones
```

---

## ✅ Criterios de Aceptación

1. ✅ No se puede crear grupo si fechas no están en orden ascendente
2. ✅ No se puede crear grupo si hora fin ≤ hora inicio
3. ✅ No se puede crear grupo si hay sesiones sin tema
4. ✅ Se muestra alerta (no bloqueante) si hay gaps mayores a la frecuencia
5. ✅ Usuario puede agregar 0 o más asistentes de clase
6. ✅ Usuario puede reordenar sesiones con drag & drop
7. ✅ Si hay más sesiones que temas, las extras quedan vacías para llenar manualmente
8. ✅ TimePicker muestra horas de 6:00 AM a 11:00 PM en intervalos de 30 min

---

## 📁 Archivos a Crear/Modificar

### Nuevos:
- `src/components/ui/time-picker.tsx`
- `src/components/modules/groups/AssistantForm.tsx`
- `src/components/modules/groups/SessionCard.tsx` (para drag & drop)

### Modificar:
- `backend/src/db/schema.ts` - Agregar tabla y campos
- `backend/src/routes/groups.ts` - Endpoints asistentes y horarios
- `src/components/modules/groups/GroupDialog.tsx` - Nuevo paso asistentes
- `src/components/modules/groups/CalendarEditor.tsx` - Validaciones y drag & drop

---

## 🚨 Consideraciones y Riesgos

1. **Drag & drop**: Requiere instalar `@dnd-kit/core` y `@dnd-kit/sortable`
2. **Migración BD**: Ejecutar ALTER TABLE para campos de horario
3. **Retrocompatibilidad**: Grupos existentes tendrán horarios NULL (mostrar "No definido")

---

## 📋 Orden de Implementación

1. **Base de datos** - Schema y migración
2. **Backend** - Endpoints y lógica
3. **TimePicker** - Componente UI
4. **AssistantForm** - Componente UI
5. **GroupDialog** - Integrar horarios y asistentes
6. **CalendarEditor** - Validaciones
7. **Drag & Drop** - Reordenamiento
8. **Validación final** - Modal de warnings
9. **Testing** - Pruebas completas

---

## ❓ Decisiones Tomadas

| Pregunta | Respuesta |
|----------|-----------|
| Rango de horas | 6:00 AM - 11:00 PM |
| Intervalo | 30 minutos |
| Asistentes | Opcionales, múltiples permitidos |
| Drag & drop | Solo reordena visualmente, fechas manuales |
| Estructura asistentes | Nueva tabla `group_assistants` |
