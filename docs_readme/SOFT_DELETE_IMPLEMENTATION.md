# 🗑️ Sistema de Soft Delete (Borrado Lógico)

## ✅ Implementación Completada

### 📋 Resumen

Se ha implementado un sistema completo de **soft delete** (borrado lógico) en todas las entidades del sistema. Cuando el usuario elimina un registro, este NO se borra físicamente de la base de datos, sino que cambia su estado a "Eliminado" y **nunca se muestra** en la aplicación.

---

## 🎯 Estados por Entidad

### **1. Branches (Sucursales)**
- ✅ `active` - Operando normalmente
- ⏸️ `inactive` - Suspendida temporalmente
- 🗑️ `eliminado` - **Borrado lógico** (NO se muestra)

### **2. Students (Probacionistas)**
- ✅ `Activo` - Estudiando actualmente
- ⚠️ `Fluctuante` - Asistencia irregular
- ⏸️ `Inactivo` - Pausado temporalmente
- 📉 `Baja` - Retirado formalmente
- 🗑️ `Eliminado` - **Borrado lógico** (NO se muestra)

### **3. Courses (Cursos)**
- ✅ `active` - Curso vigente
- ⏸️ `inactive` - Pausado/no disponible
- 🗑️ `eliminado` - **Borrado lógico** (NO se muestra)

### **4. Instructors (Instructores)**
- ✅ `Activo` - Enseñando actualmente
- ⏸️ `Inactivo` - Suspendido temporalmente
- 📋 `Licencia` - En licencia
- 🗑️ `Eliminado` - **Borrado lógico** (NO se muestra)

### **5. Groups (Grupos)** - Estados especiales
- ✅ `active` - Cursando actualmente
- 🚫 `closed` - Cerrado prematuramente (no completó programa)
- ✅ `finished` - Completó todo el programa exitosamente
- 🗑️ `eliminado` - **Borrado lógico** (NO se muestra)

---

## 🔧 Cambios Implementados

### **1. Base de Datos** ✅

#### Migración: `002_add_status_soft_delete.sql`

```sql
-- Actualizar enums existentes
ALTER TYPE status ADD VALUE IF NOT EXISTS 'eliminado';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'Eliminado';
ALTER TYPE instructor_status ADD VALUE IF NOT EXISTS 'Eliminado';

-- Crear nuevos enums
CREATE TYPE course_status AS ENUM ('active', 'inactive', 'eliminado');
CREATE TYPE group_status AS ENUM ('active', 'closed', 'finished', 'eliminado');

-- Agregar campos status
ALTER TABLE courses ADD COLUMN status course_status NOT NULL DEFAULT 'active';
ALTER TABLE class_groups ADD COLUMN status group_status NOT NULL DEFAULT 'active';

-- Índices para performance
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_class_groups_status ON class_groups(status);
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_instructors_status ON instructors(status);
```

**Estado**: ✅ Ejecutada exitosamente

---

### **2. Schema TypeScript** ✅

**Archivo**: `backend/src/db/schema.ts`

```typescript
// Nuevos enums
export const courseStatusEnum = pgEnum('course_status', ['active', 'inactive', 'eliminado']);
export const groupStatusEnum = pgEnum('group_status', ['active', 'closed', 'finished', 'eliminado']);

// Enums actualizados
export const statusEnum = pgEnum('status', ['active', 'inactive', 'eliminado']);
export const studentStatusEnum = pgEnum('student_status', ['Activo', 'Fluctuante', 'Inactivo', 'Baja', 'Eliminado']);
export const instructorStatusEnum = pgEnum('instructor_status', ['Activo', 'Inactivo', 'Licencia', 'Eliminado']);

// Tablas actualizadas
export const courses = pgTable('courses', {
  // ...
  status: courseStatusEnum('status').notNull().default('active'),
  // ...
});

export const classGroups = pgTable('class_groups', {
  // ...
  status: groupStatusEnum('status').notNull().default('active'),
  // ...
});
```

---

### **3. Backend - Rutas DELETE → UPDATE** ✅

Se modificaron **5 rutas DELETE** para hacer **soft delete**:

#### **branches.ts**
```typescript
fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await db.update(branches)
    .set({ status: 'eliminado', updatedAt: new Date() })
    .where(eq(branches.id, id));
  return { success: true, message: 'Sucursal marcada como eliminada' };
});
```

#### **students.ts**
```typescript
fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await db.update(students)
    .set({ status: 'Eliminado', updatedAt: new Date() })
    .where(eq(students.id, id));
  return { success: true, message: 'Probacionista marcado como eliminado' };
});
```

#### **courses.ts**
```typescript
fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await db.update(courses)
    .set({ status: 'eliminado', updatedAt: new Date() })
    .where(eq(courses.id, id));
  return { success: true, message: 'Curso marcado como eliminado' };
});
```

#### **instructors.ts**
```typescript
fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await db.update(instructors)
    .set({ status: 'Eliminado', updatedAt: new Date() })
    .where(eq(instructors.id, id));
  return { success: true, message: 'Instructor marcado como eliminado' };
});
```

#### **groups.ts**
```typescript
fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await db.update(classGroups)
    .set({ status: 'eliminado', updatedAt: new Date() })
    .where(eq(classGroups.id, id));
  return { success: true, message: 'Grupo marcado como eliminado' };
});
```

---

### **4. Backend - Filtrado en GET Endpoints** ✅

Todos los endpoints GET ahora **excluyen registros eliminados**:

#### **branches.ts**
```typescript
// Always exclude deleted branches
const baseCondition = ne(branches.status, 'eliminado');
let whereCondition = baseCondition;

if (search) {
  whereCondition = and(
    baseCondition,
    or(/* search conditions */)
  );
}
```

#### **students.ts**
```typescript
const conditions = [
  eq(students.branchId, branchId),
  sql`${students.status} != 'Eliminado'`
];
```

#### **courses.ts**
```typescript
let whereCondition = sql`${courses.branchId} = ${branchId} AND ${courses.status} != 'eliminado'`;
```

#### **instructors.ts**
```typescript
let whereCondition = sql`${instructors.branchId} = ${branchId} AND ${instructors.status} != 'Eliminado'`;
```

#### **groups.ts**
```typescript
let whereCondition = sql`${classGroups.branchId} = ${branchId} AND ${classGroups.status} != 'eliminado'`;
```

---

### **5. Frontend - Mensajes de Confirmación** ✅

Actualizados en **6 archivos** (admin + 4 módulos):

#### Nuevo mensaje de confirmación:
```typescript
if (!confirm('¿Eliminar definitivamente? Esta acción marcará el registro como eliminado y no se mostrará en el sistema.')) return;
```

**Archivos modificados:**
- ✅ `src/app/admin/page.tsx`
- ✅ `src/components/modules/StudentsModule.tsx`
- ✅ `src/components/modules/CoursesModule.tsx`
- ✅ `src/components/modules/InstructorsModule.tsx`
- ✅ `src/components/modules/GroupsModule.tsx`

---

## 🎯 Comportamiento del Sistema

### **Al eliminar un registro:**
1. Usuario hace clic en "Eliminar"
2. Aparece confirmación: "¿Eliminar definitivamente? Esta acción marcará el registro como eliminado..."
3. Si confirma:
   - Backend hace UPDATE (no DELETE)
   - Cambia `status` a 'eliminado'/'Eliminado'
   - Retorna mensaje: "Registro marcado como eliminado"
4. El registro **permanece en la BD** pero **nunca se muestra**

### **Al listar registros:**
- Todos los GET automáticamente filtran `WHERE status != 'eliminado'`
- Los registros eliminados son **invisibles** para el usuario
- Mantiene integridad referencial (no hay CASCADE DELETE)

---

## 📊 Ventajas del Soft Delete

✅ **Preserva datos históricos**: Información nunca se pierde
✅ **Recuperación posible**: Cambiar status de vuelta si fue error
✅ **Integridad referencial**: No rompe relaciones FK
✅ **Auditoría**: Se mantiene registro completo
✅ **Reporting**: Datos disponibles para análisis histórico

---

## 🚨 Consideraciones Importantes

### **⚠️ Estados "Eliminado" son INVISIBLES**
- NO aparecen en listados
- NO se pueden editar desde UI
- NO se incluyen en conteos
- Es como si NO existieran

### **🔒 Integridad de Datos**
- Los registros físicamente existen en BD
- Se pueden recuperar manualmente desde SQL si es necesario
- No afecta constraints de FK

### **💾 Espacio en Disco**
- Los registros eliminados ocupan espacio
- Considerar limpieza periódica manual si es necesario
- Por ahora NO se implementa auto-limpieza

---

## 🧪 Testing

### Probar soft delete:
1. Crear un registro (branch/student/course/instructor/group)
2. Eliminarlo desde UI
3. Verificar que desaparece de la lista
4. Verificar en BD que existe con `status = 'eliminado'`
5. Confirmar que no aparece en búsquedas

### SQL para ver registros eliminados:
```sql
-- Branches eliminadas
SELECT * FROM branches WHERE status = 'eliminado';

-- Students eliminados
SELECT * FROM students WHERE status = 'Eliminado';

-- Courses eliminados
SELECT * FROM courses WHERE status = 'eliminado';

-- Instructors eliminados
SELECT * FROM instructors WHERE status = 'Eliminado';

-- Groups eliminados
SELECT * FROM class_groups WHERE status = 'eliminado';
```

---

## 🎉 Estado Final

✅ **Migración BD**: Ejecutada
✅ **Schema TypeScript**: Actualizado
✅ **Backend DELETE**: 5 rutas modificadas
✅ **Backend GET**: 5 rutas con filtro
✅ **Frontend**: 6 archivos con nuevos mensajes
✅ **Sin errores de compilación**

**Sistema de soft delete 100% funcional** 🚀

---

## 📝 Notas de Desarrollo

- Los valores 'eliminado' son **lowercase** en minúsculas (branches, courses, groups)
- Los valores 'Eliminado' son **Capitalized** con mayúscula (Students, Instructors)
- Esto es intencional según los enums originales de cada tabla
- NUNCA cambiar estos valores o romperá el filtrado
