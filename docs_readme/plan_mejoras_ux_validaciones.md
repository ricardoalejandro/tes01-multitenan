# Plan: Mejoras de UX, Validaciones y Paginación

## 📊 Alcance
- [x] Frontend
- [x] Backend
- [x] Base de Datos

## 🎯 Objetivos

Mejorar la experiencia de usuario del sistema Escolástica implementando:
1. Código autogenerado para filiales
2. Notificaciones más rápidas
3. Mejoras en formulario de alumnos (validaciones + nuevo campo)
4. Modal maximizable para formularios extensos
5. Paginación en todas las tablas
6. Sidebar colapsable

## 📐 Diseño UI/UX

### 1. Modal Maximizable (Componente Reutilizable)
**Componente**: `ResponsiveDialog` (nuevo)
- **Estados**: 
  - Normal: Dialog de Shadcn/ui (tamaño estándar)
  - Maximizado: Ocupa el panel central completo (respeta sidebar)
- **Controles**: 
  - Botón toggle en header del modal (icono maximize/minimize)
  - Transición suave entre estados
- **Aplicar a**: Students, Courses, Instructors, Groups

### 2. Sidebar Colapsable
- Toggle button con icono hamburger
- Estado persistente (localStorage)
- Ancho colapsado: 60px (solo iconos)
- Ancho expandido: 240px (iconos + texto)
- Animación smooth

### 3. Paginación
**Componente**: Usar `Pagination` de Shadcn/ui
- Items por página: 10, 25, 50, 100
- Mostrar: "Mostrando X-Y de Z resultados"
- Navegación: Primera, Anterior, Siguiente, Última
- Input directo para ir a página específica

### 4. Notificaciones
- Duración: 1500ms (1.5 segundos)
- Usar Sonner (ya implementado)

## 🗄️ Cambios en Base de Datos

### Tabla: `branches`
```sql
-- Agregar campo para el correlativo del código
ALTER TABLE branches ADD COLUMN code_number INTEGER;
-- El código se generará como: 'FIL-' + LPAD(code_number, 3, '0')
```

### Tabla: `students`
```sql
-- Agregar campo dirección (opcional)
ALTER TABLE students ADD COLUMN address TEXT;

-- Modificar campos para hacer solo dni y name obligatorios
-- email, phone, address → NULL permitido
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
ALTER TABLE students ALTER COLUMN phone DROP NOT NULL;
```

### Migración
- Crear archivo: `backend/src/db/migrations/001_mejoras_ux.sql`
- Actualizar `schema.ts` con los cambios

## 🔌 Backend

### 1. Endpoint: Branches - Código Autogenerado

**PUT/POST `/api/branches`**
- Antes de crear: obtener el máximo `code_number` actual
- Incrementar +1
- Generar código: `FIL-${String(codeNumber).padStart(3, '0')}`
- Guardar `code` y `code_number`

### 2. Endpoints: Paginación (todos los módulos)

**Query Params** (agregar a todos los GET):
```typescript
{
  page?: number;      // Página actual (default: 1)
  limit?: number;     // Items por página (default: 10)
  search?: string;    // Búsqueda (opcional)
  sortBy?: string;    // Campo para ordenar (opcional)
  sortOrder?: 'asc' | 'desc'; // Orden (opcional)
}
```

**Response**:
```typescript
{
  data: Array<T>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

**Endpoints a modificar**:
- `GET /api/students`
- `GET /api/courses`
- `GET /api/instructors`
- `GET /api/groups`
- `GET /api/branches`

### 3. Endpoint: Students - Campo Address

**POST/PUT `/api/students`**
- Agregar campo `address` (opcional)
- Validaciones:
  - `dni`: requerido, exactamente 8 dígitos numéricos (regex: `^\d{8}$`)
  - `name`: requerido, string no vacío
  - `email`: opcional
  - `phone`: opcional
  - `address`: opcional
  - `birthDate`: debe ser menor que `admissionDate`

### 4. Validación en Backend (Zod schemas)

**`backend/src/routes/students.ts`**:
```typescript
const studentSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener exactamente 8 dígitos'),
  name: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  birthDate: z.string(),
  admissionDate: z.string(),
}).refine(
  (data) => new Date(data.birthDate) < new Date(data.admissionDate),
  { message: 'Fecha de nacimiento debe ser menor a fecha de admisión', path: ['birthDate'] }
);
```

## 🎨 Frontend

### 1. Componente: `ResponsiveDialog` (Nuevo)

**Ruta**: `/src/components/ui/responsive-dialog.tsx`

```typescript
interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Funcionalidad**:
- Estado interno: `isMaximized` (false por defecto)
- Toggle button en header con icono `Maximize2`/`Minimize2` de Lucide
- Clases condicionales:
  - Normal: `max-w-2xl` (Dialog estándar)
  - Maximizado: `fixed inset-4 max-w-none h-[calc(100vh-2rem)]`
- Transición suave con Tailwind

### 2. Layout: Sidebar Colapsable

**Ruta**: `/src/app/workspace/page.tsx` (o layout si existe)

**Estado**:
```typescript
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// Guardar en localStorage
useEffect(() => {
  const saved = localStorage.getItem('sidebarCollapsed');
  if (saved) setSidebarCollapsed(JSON.parse(saved));
}, []);
```

**Clases condicionales**:
```typescript
<aside className={cn(
  "transition-all duration-300",
  sidebarCollapsed ? "w-16" : "w-60"
)}>
  {/* Contenido del sidebar */}
</aside>

<main className={cn(
  "transition-all duration-300",
  sidebarCollapsed ? "ml-16" : "ml-60"
)}>
  {/* Contenido principal */}
</main>
```

### 3. Módulo: Branches - Código Autogenerado

**Ruta**: `/src/components/modules/BranchesModule.tsx` (si no existe, se creará)

**Cambios**:
- Campo `code`: solo lectura (disabled), mostrar valor
- Al crear: no enviar `code` al backend (se genera automáticamente)
- Al editar: mostrar `code` pero no permitir edición
- Notificaciones: `duration: 1500` en Sonner

### 4. Módulo: Students - Validaciones + Campo Address

**Ruta**: `/src/components/modules/StudentsModule.tsx`

**Formulario (React Hook Form + Zod)**:
```typescript
const studentSchema = z.object({
  dni: z.string()
    .regex(/^\d{8}$/, 'DNI debe contener exactamente 8 dígitos numéricos')
    .min(8, 'DNI debe tener 8 dígitos')
    .max(8, 'DNI debe tener 8 dígitos'),
  name: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  birthDate: z.string(),
  admissionDate: z.string(),
}).refine(
  (data) => new Date(data.birthDate) < new Date(data.admissionDate),
  {
    message: 'La fecha de nacimiento debe ser anterior a la fecha de admisión',
    path: ['birthDate'],
  }
);
```

**Campo DNI**:
```typescript
<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={8}
  onInput={(e) => {
    // Solo permitir números
    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
  }}
/>
```

**Nuevo campo Address**:
```typescript
<Textarea
  placeholder="Dirección (opcional)"
  {...register('address')}
/>
```

**Modal**: Usar `ResponsiveDialog` en lugar de `Dialog`

### 5. Paginación - Todos los Módulos

**Componente reutilizable**: `/src/components/ui/data-table-pagination.tsx`

```typescript
interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}
```

**Integración con TanStack Query**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['students', page, pageSize, search],
  queryFn: () => api.get('/api/students', {
    params: { page, limit: pageSize, search }
  }),
});

const { data: students = [], pagination } = data || { data: [], pagination: {} };
```

**Aplicar a**:
- StudentsModule
- CoursesModule
- InstructorsModule
- GroupsModule
- BranchesModule (si existe)

### 6. Notificaciones - Duración

**Cambio global en todas las llamadas a `toast`**:
```typescript
toast.success('Operación exitosa', { duration: 1500 });
toast.error('Error en la operación', { duration: 1500 });
```

## 🔗 Flujo de Integración

### 1. Crear Branch
```
Usuario → Click "Nuevo" 
       → Formulario (sin código visible) 
       → Submit 
       → Backend genera código (FIL-001) 
       → Guardar en BD 
       → Response con código 
       → Mostrar en tabla 
       → Toast 1.5s
```

### 2. Crear Student
```
Usuario → Click "Nuevo" 
       → Modal normal (ResponsiveDialog)
       → Llenar DNI (solo números, 8 dígitos)
       → Llenar Nombre (requerido)
       → Otros campos opcionales
       → Validar fechas (birthDate < admissionDate)
       → Submit 
       → Backend valida y guarda
       → Toast 1.5s
       → Actualizar tabla con paginación
```

### 3. Maximizar Modal
```
Usuario → Click "Nuevo/Editar" 
       → Modal abierto (normal)
       → Click botón Maximize
       → Transición smooth a full screen (panel central)
       → Formulario con más espacio
       → Click Minimize → Vuelve a popup normal
```

### 4. Paginar Tabla
```
Usuario → Ver tabla (10 items por defecto)
       → Seleccionar 25/50/100 items
       → API fetch con ?page=1&limit=25
       → Backend devuelve data + pagination
       → Renderizar tabla + controles paginación
       → Click "Siguiente" → page=2
```

### 5. Colapsar Sidebar
```
Usuario → Click toggle (hamburger)
       → Sidebar: 240px → 60px (solo iconos)
       → Main content: ajusta ancho
       → Guardar estado en localStorage
       → Al recargar: mantiene estado
```

## ✅ Criterios de Aceptación

### Filiales
1. ✅ Código se genera automáticamente con formato `FIL-001`, `FIL-002`, etc.
2. ✅ Código se muestra en la tabla y en el formulario (solo lectura)
3. ✅ Notificaciones desaparecen en 1.5 segundos

### Students
1. ✅ Solo DNI y Nombre son obligatorios
2. ✅ Campo dirección agregado y funcional (opcional)
3. ✅ DNI acepta solo 8 dígitos numéricos (incluyendo "05252525")
4. ✅ Validación: fecha nacimiento < fecha admisión (con mensaje claro)
5. ✅ Email y teléfono son opcionales
6. ✅ Modal maximizable funciona correctamente

### Modal Maximizable
1. ✅ Funciona en Students, Courses, Instructors, Groups
2. ✅ Botón toggle visible en header del modal
3. ✅ Transición suave entre estados
4. ✅ En modo maximizado: ocupa solo panel central (respeta sidebar)
5. ✅ Formulario sigue funcional en ambos estados

### Paginación
1. ✅ Implementada en todas las tablas (Students, Courses, Instructors, Groups, Branches)
2. ✅ Opciones: 10, 25, 50, 100 items por página
3. ✅ Muestra información: "Mostrando X-Y de Z resultados"
4. ✅ Controles de navegación funcionales
5. ✅ Performance: carga solo items de la página actual

### Sidebar
1. ✅ Toggle button funcional
2. ✅ Colapsa y expande con animación suave
3. ✅ Muestra solo iconos cuando está colapsado
4. ✅ Estado persiste en localStorage
5. ✅ Main content ajusta su ancho dinámicamente

### General
1. ✅ No hay regresiones en funcionalidades existentes
2. ✅ Diseño responsive en todos los cambios
3. ✅ Mensajes de error claros y en español
4. ✅ Todas las validaciones funcionan correctamente

## 🚨 Consideraciones y Riesgos

### Base de Datos
- ⚠️ Migración debe ejecutarse antes de deploy
- ⚠️ Filiales existentes: asignar `code_number` secuencial manualmente
- ⚠️ Students existentes: `address` será NULL (está bien)

### Performance
- ⚠️ Paginación backend: agregar índices a campos usados en búsqueda/orden
- ⚠️ Con 10,000 estudiantes: considerar cache con Redis para consultas frecuentes

### UX
- ⚠️ Modal maximizado: verificar en pantallas pequeñas (laptop 13")
- ⚠️ Sidebar colapsado: asegurar que iconos sean claros

### Compatibilidad
- ⚠️ LocalStorage para sidebar: funciona en todos los navegadores modernos
- ⚠️ Validación DNI en frontend: funciona con IME (Input Method Editor)

## 🔄 Orden de Implementación

1. **Base de Datos** (5 min)
   - Crear migración
   - Actualizar schema.ts
   - Ejecutar migración

2. **Backend** (30 min)
   - Agregar paginación a endpoints
   - Código autogenerado branches
   - Validaciones students
   - Actualizar tipos TypeScript

3. **Frontend - Componentes Base** (45 min)
   - Crear `ResponsiveDialog`
   - Crear `DataTablePagination`
   - Implementar sidebar colapsable

4. **Frontend - Módulos** (90 min)
   - Actualizar BranchesModule (código + notificaciones)
   - Actualizar StudentsModule (validaciones + address + modal)
   - Actualizar CoursesModule (modal + paginación)
   - Actualizar InstructorsModule (modal + paginación)
   - Actualizar GroupsModule (modal + paginación)

5. **Testing y Ajustes** (30 min)
   - Probar flujos completos
   - Ajustar estilos
   - Verificar responsive
   - Validar performance

**Tiempo estimado total: 3 horas**

## 📚 Documentación Necesaria

- Actualizar README con nuevas validaciones de Students
- Documentar componente ResponsiveDialog para reutilización
- Añadir ejemplos de uso de paginación en API docs
- Documentar estructura de código de filiales

---

**Estado**: ⏸️ Pendiente de aprobación
**Fecha creación**: 2025-11-08
