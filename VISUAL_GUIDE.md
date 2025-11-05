# 🎨 Guía Visual del Sistema

Este documento describe las interfaces visuales y flujos de usuario del sistema.

## 🖼️ Interfaces Implementadas

### 1. Página de Login
**URL**: `/login`

**Características**:
- ✨ Diseño centrado con gradiente
- 🎯 Logo del sistema (icono de graduación)
- 📝 Formulario simple (usuario/contraseña)
- ⚡ Estados de carga con spinner
- 🔔 Notificaciones toast
- 💡 Credenciales visibles para demo

**Elementos**:
- Card elevada con sombra
- Inputs con validación
- Botón con estado de carga
- Texto de ayuda con credenciales

**Flujo**:
1. Usuario ingresa credenciales
2. Click en "Iniciar Sesión"
3. Validación y generación de token
4. Redirección al Dashboard

---

### 2. Dashboard (Selector de Sucursales)
**URL**: `/dashboard`

**Características**:
- 🏢 Grid responsive de sucursales
- 👤 Información del usuario en header
- 🎨 Cards con hover effect
- 🔐 Panel de admin para superadmin
- 🚪 Botón de cerrar sesión

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  [LOGO] Sistema Académico        [Cerrar Sesión]    │
│  Bienvenido, admin (superadmin)                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Seleccione una Sucursal                           │
│  Elija la sucursal con la que desea trabajar       │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │[ICON] Activo│  │[ICON] Activo│  │             ││
│  │             │  │             │  │             ││
│  │ Sede Central│  │ Sede Norte  │  │   [Más...]  ││
│  │ SAC-001     │  │ SAC-002     │  │             ││
│  │             │  │             │  │             ││
│  │Sede principal│ │Sucursal en │  │             ││
│  │en Lima      │  │Lima Norte   │  │             ││
│  │             │  │             │  │             ││
│  │[Seleccionar]│  │[Seleccionar]│  │             ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                      │
│  ┌─────────────────────────────────────────────┐  │
│  │[SETTINGS ICON] Panel de Administrador        │  │
│  │Gestión de sucursales, usuarios y config      │  │
│  │[Ir al Panel de Administrador]                │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Cards de Sucursal**:
- Icono de edificio
- Badge de estado (Activo/Inactivo)
- Nombre y código
- Descripción
- Botón de selección

**Panel de Admin** (solo superadmin):
- Fondo con gradiente especial
- Icono de configuración
- Descripción de funcionalidad
- Botón destacado

---

### 3. Workspace (Espacio de Trabajo)
**URL**: `/workspace?branchId={id}`

**Características**:
- 🎯 Layout de dos columnas
- 📱 Sidebar fijo de navegación
- 🔄 Panel principal dinámico
- 🎨 Módulos con placeholders
- ⚡ Transiciones suaves

**Layout**:
```
┌──────────────┬─────────────────────────────────────┐
│              │                                     │
│ Sede Central │  📊 Inicio                          │
│ SAC-001      │                                     │
│              │  Bienvenido                         │
│ [← Volver]   │                                     │
├──────────────┤  ┌─────────┐  ┌─────────┐         │
│              │  │ [ICON]  │  │ [ICON]  │         │
│ 🏠 Inicio    │  │Probacio-│  │ Cursos  │         │
│              │  │nistas   │  │         │         │
│ 👥 Probacio- │  └─────────┘  └─────────┘         │
│   nistas     │                                     │
│              │  ┌─────────┐  ┌─────────┐         │
│ 📚 Cursos    │  │Instruc- │  │ Grupos  │         │
│              │  │tores    │  │         │         │
│ 👨‍🏫 Instructo-│  └─────────┘  └─────────┘         │
│   res        │                                     │
│              │  ┌─────────┐                       │
│ 📋 Grupos    │  │Asistencia                       │
│              │  │Próximam.│                       │
│ ✓ Asistencia │  └─────────┘                       │
│  [Próximam.] │                                     │
│              │                                     │
├──────────────┤                                     │
│              │                                     │
│[Cerrar Sesión│                                     │
└──────────────┴─────────────────────────────────────┘
```

**Sidebar**:
- Header con nombre de sucursal
- Botón "Volver al Dashboard"
- Navegación vertical con iconos
- Módulo activo destacado
- Footer con cerrar sesión

**Panel Principal**:
- Vista "Inicio" con resumen de módulos
- Módulos individuales (placeholders)
- Cada módulo tiene:
  - Título
  - Descripción
  - Mensaje "En construcción"

**Módulos Disponibles**:
1. 🏠 **Inicio** - Dashboard con cards de módulos
2. 👥 **Probacionistas** - CRUD de estudiantes
3. 📚 **Cursos** - Gestión de cursos y temas
4. 👨‍🏫 **Instructores** - Gestión de docentes
5. 📋 **Grupos** - Organización de clases
6. ✓ **Asistencia** - Control de asistencia (próximamente)

---

### 4. Panel de Administrador
**URL**: `/admin`

**Características**:
- 🛠️ CRUD completo de sucursales
- ➕ Formulario de creación/edición
- 🗑️ Confirmación de eliminación
- 📊 Grid responsive de cards
- 🔄 Estados vacíos con CTA

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Panel de Administrador        [← Volver][+ Nueva]  │
│  Gestión de sucursales                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [FORMULARIO - Solo cuando está activo]            │
│  ┌─────────────────────────────────────────────┐  │
│  │ Nueva/Editar Sucursal                        │  │
│  │                                              │  │
│  │ Nombre: [_______________]  Código: [_____]  │  │
│  │ Descripción: [________________________]     │  │
│  │                                              │  │
│  │ [Crear/Actualizar] [Cancelar]               │  │
│  └─────────────────────────────────────────────┘  │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │[ICON] Activo│  │[ICON] Activo│  │             ││
│  │             │  │             │  │             ││
│  │ Sede Central│  │ Sede Norte  │  │   [Más...]  ││
│  │ SAC-001     │  │ SAC-002     │  │             ││
│  │             │  │             │  │             ││
│  │Sede principal│ │Sucursal en │  │             ││
│  │             │  │             │  │             ││
│  │[✏️ Editar]  │  │[✏️ Editar]  │  │             ││
│  │   [🗑️ ]     │  │   [🗑️ ]     │  │             ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────┘
```

**Formulario**:
- Campos: Nombre, Código, Descripción
- Validación en tiempo real
- Botones de acción y cancelación
- Aparece/desaparece dinámicamente

**Cards de Sucursal**:
- Información completa
- Botón "Editar" (carga formulario)
- Botón "Eliminar" (con confirmación)

**Estado Vacío**:
- Icono grande de edificio
- Mensaje "No hay sucursales"
- Botón CTA "Nueva Sucursal"

---

## 🎨 Sistema de Diseño

### Colores

**Neutrales** (12 tonos):
```
neutral-1: #fcfcfc (más claro)
neutral-6: #e2e2e2 (bordes)
neutral-9: #8f8f8f (texto secundario)
neutral-12: #171717 (texto principal)
```

**Acentos** (12 tonos):
```
accent-1: #fbfdff (más claro)
accent-3: #e6f4ff (fondos)
accent-9: #0090ff (primario)
accent-11: #0d74ce (hover)
```

**Modo Oscuro**:
- Variables invertidas automáticamente
- Selector: `[data-appearance="dark"]`

### Tipografía

**Fuente**: Inter (Google Fonts)

**Tamaños**:
- Títulos h1: 3xl (30px)
- Títulos h2: 2xl (24px)
- Títulos h3: xl (20px)
- Texto normal: sm (14px)
- Texto pequeño: xs (12px)

### Componentes

**Button**:
- Variantes: default, destructive, outline, secondary, ghost, link
- Tamaños: default (40px), sm (36px), lg (44px), icon (40x40px)
- Estados: hover, focus, disabled

**Input**:
- Altura: 40px
- Border radius: md (6px)
- Focus: ring azul (accent-9)
- Estados: normal, focus, disabled, error

**Card**:
- Background: blanco (neutral-1)
- Border: neutral-6
- Border radius: lg (8px)
- Shadow: suave

### Espaciado

Sistema de 8px:
- 1 = 4px
- 2 = 8px
- 4 = 16px
- 6 = 24px
- 8 = 32px

### Animaciones

- Transiciones: 200ms ease
- Hover: transform scale(1.02)
- Loading: spin animation
- Toast: slide in/out

---

## 📱 Responsive Design

### Breakpoints

```
sm:  640px  (móvil horizontal)
md:  768px  (tablet)
lg:  1024px (desktop)
xl:  1280px (desktop grande)
2xl: 1536px (pantalla ultra ancha)
```

### Adaptaciones

**Login**: Siempre centrado, max-width: 448px

**Dashboard**:
- Móvil: 1 columna
- Tablet: 2 columnas
- Desktop: 3 columnas

**Workspace**:
- Móvil: Sidebar colapsable (futuro)
- Desktop: Sidebar fijo 256px

**Admin**:
- Igual que Dashboard
- Formulario: full width en móvil, 2 cols en desktop

---

## 🔔 Notificaciones (Sonner)

**Posición**: Top-right

**Tipos**:
- Success (verde): ✅ "¡Bienvenido!"
- Error (rojo): ❌ "Credenciales inválidas"
- Info (azul): ℹ️ "Procesando..."
- Warning (amarillo): ⚠️ "Atención"

**Duración**: 4 segundos (auto-dismiss)

**Acciones**: Dismiss manual con X

---

## 🎯 Estados de la UI

### Loading States

**Global**:
- Spinner circular en el centro
- 32x32px
- Border azul (accent-9)
- Animación continua

**Buttons**:
- Spinner pequeño (16x16px)
- Texto "Cargando..."
- Disabled mientras carga

### Empty States

**Listas vacías**:
- Icono grande (64x64px)
- Título descriptivo
- Mensaje explicativo
- CTA para acción

**Ejemplo** (Sucursales vacías):
```
      [🏢]
  No hay sucursales
  Cree su primera sucursal
      [+ Nueva]
```

### Error States

**Form errors**:
- Border rojo en input
- Mensaje debajo del campo
- Icono de error

**Page errors**:
- Toast rojo
- Mensaje descriptivo
- No redirección automática (excepto 401)

---

## 🌈 Experiencia de Usuario

### Feedback Visual

**Hover**:
- Cards: sombra aumentada
- Buttons: color más oscuro
- Links: subrayado

**Focus**:
- Ring azul (2px)
- Outline removido
- Visible en navegación por teclado

**Active**:
- Módulo activo: fondo azul + texto blanco
- Button pressed: scale(0.98)

### Transiciones

**Page transitions**:
- Next.js navegación instantánea
- Loading states mientras carga data

**Component transitions**:
- Fade in: opacity 0 → 1
- Slide in: transform translateY
- Duración: 200-300ms

### Accesibilidad

**Teclado**:
- Tab navigation funcional
- Focus visible
- Enter para submit
- Escape para cerrar modales

**Screen readers**:
- Labels en todos los inputs
- Alt text en iconos (Lucide tiene aria)
- Semantic HTML

**Contraste**:
- WCAG AA compliant
- Texto sobre fondos claros/oscuros
- Estados disabled visibles

---

## 📊 Flujos Completos

### Flujo 1: Primer Uso

```
1. Acceso a http://localhost:5000
   ↓
2. Redirección automática a /login
   ↓
3. Ingreso de credenciales
   ↓
4. Token guardado en localStorage
   ↓
5. Redirección a /dashboard
   ↓
6. Carga de sucursales y usuario
   ↓
7. Selección de sucursal
   ↓
8. Redirección a /workspace?branchId={id}
   ↓
9. Vista de módulos disponibles
```

### Flujo 2: Gestión de Sucursales (Admin)

```
1. En dashboard, click "Panel de Administrador"
   ↓
2. Vista de todas las sucursales
   ↓
3. Click "+ Nueva Sucursal"
   ↓
4. Formulario aparece
   ↓
5. Completar campos
   ↓
6. Click "Crear"
   ↓
7. API call → Success toast
   ↓
8. Lista actualizada
   ↓
9. Formulario se oculta
```

### Flujo 3: Navegación en Workspace

```
1. Usuario en workspace
   ↓
2. Click en "Probacionistas"
   ↓
3. Panel principal actualiza
   ↓
4. Vista de módulo (placeholder)
   ↓
5. Sidebar mantiene estado activo
   ↓
6. Click en "← Volver"
   ↓
7. Regreso a dashboard
```

---

## 🎨 Mejoras Futuras (UI/UX)

### Corto Plazo
- [ ] Tablas con paginación visual
- [ ] Modales para formularios
- [ ] Breadcrumbs de navegación
- [ ] Tooltips informativos
- [ ] Drag and drop para reordenar

### Mediano Plazo
- [ ] Gráficos con Recharts
- [ ] Calendario para sesiones
- [ ] Timeline de actividades
- [ ] Dashboard con widgets
- [ ] Filtros avanzados

### Largo Plazo
- [ ] Tema personalizable por usuario
- [ ] Atajos de teclado
- [ ] Tour guiado (onboarding)
- [ ] PWA (offline support)
- [ ] Mobile app (React Native)

---

**Diseño creado con**: Figma mindset + Tailwind CSS 4 + Radix UI primitives
**Inspiración**: Modern SaaS dashboards (Linear, Notion, Vercel)
**Accesibilidad**: WCAG 2.1 Level AA
