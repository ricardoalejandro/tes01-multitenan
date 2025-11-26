# Plan: Sistema de Roles, Permisos y Autenticación Avanzada

**Fecha:** 12 de Noviembre de 2025  
**Alcance:** Backend + Frontend + Base de Datos  
**Estado:** Pendiente de aprobación

---

## 📊 ANÁLISIS DEL CÓDIGO EXISTENTE

### ✅ Lo que YA existe y funciona:
1. **Autenticación básica con JWT** (`/backend/src/routes/auth.ts`)
   - Login simple (username/password)
   - Generación de token JWT
   - Middleware `authenticate` para proteger rutas
   - Endpoint `/api/auth/me` que retorna usuario y todas las branches

2. **Sistema de usuarios básico** (`users` table en schema)
   - Campos: `id`, `username`, `passwordHash`, `role` (enum: superadmin, admin, instructor)
   - Roles limitados a 3 tipos
   - NO hay relación usuario-filial
   - NO hay permisos granulares

3. **Gestión de filiales** (`branches` table)
   - CRUD completo funcionando
   - Panel de admin en `/admin` (solo superadmin)
   - Status: 'active', 'inactive', 'eliminado'
   - **Falta campo `active` (boolean) para toggle**

4. **Dashboard existente** (`/src/app/dashboard/page.tsx`)
   - Muestra todas las branches al usuario
   - Actualmente NO filtra por permisos
   - Panel de admin abajo solo para superadmin

5. **Workspace** (`/src/app/workspace/page.tsx`)
   - Sidebar con módulos: Estudiantes, Cursos, Instructores, Grupos, Asistencia
   - Logout funcional
   - NO hay verificación de permisos por módulo

### ❌ Lo que FALTA implementar:
1. Sistema de roles personalizados con permisos granulares
2. Asignación de filiales y roles por filial a usuarios
3. Middleware de autorización por módulo
4. Reseteo de contraseña por email
5. Configuración SMTP
6. Módulo de gestión de usuarios
7. Módulo de gestión de roles
8. Header con perfil de usuario
9. Asesorías Filosóficas (histórico)
10. Rediseño del Enabler/Panel Administrador

---

## 🎯 ALCANCE DEL PROYECTO

### ✅ Base de Datos
- ✅ 8 nuevas tablas
- ✅ Modificar 2 tablas existentes
- ✅ Migraciones Drizzle

### ✅ Backend
- ✅ 7 nuevos endpoints/rutas
- ✅ Middleware de autorización avanzado
- ✅ Integración con nodemailer (SMTP)
- ✅ Sistema de tokens temporales

### ✅ Frontend
- ✅ 12 nuevos componentes/módulos
- ✅ Rediseño de vistas existentes
- ✅ Integración completa con nuevo backend

---

## 📐 DISEÑO UI/UX

### 1. **Vista de Inicio (Dashboard) - REDISEÑADA**

#### Para Administradores:
```
┌──────────────────────────────────────────────────────────┐
│  [🎓 Logo]  Sistema Académico    [👤 Juan Pérez ▼] [🚪] │ ← Header
└──────────────────────────────────────────────────────────┘

[☑️ Mostrar filiales inactivas]                              ← Toggle arriba

┌─────────────────────────────────────────────────────────┐
│  ⚙️  PANEL DE ADMINISTRADOR                             │ ← Primera fila DESTACADA
│  Gestionar filiales, usuarios y roles del sistema       │ ← (Fondo diferente, borde acento)
│                                                  [Entrar]│
└─────────────────────────────────────────────────────────┘

Vista: [Grid] [Lista] [Tabla]                               ← Toggle de vistas

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📍 Filial A  │  │ 📍 Filial B  │  │ 📍 Filial C  │
│ Lima         │  │ Cusco        │  │ Arequipa     │
│              │  │              │  │              │
│ Rol: Admin   │  │ Rol: Instruc │  │ Rol: Consult │
│      [Entrar]│  │      [Entrar]│  │      [Entrar]│
└──────────────┘  └──────────────┘  └──────────────┘
```

#### Para Usuarios Normales:
```
┌──────────────────────────────────────────────────────────┐
│  [🎓 Logo]  Sistema Académico    [👤 María López ▼] [🚪]│
└──────────────────────────────────────────────────────────┘

[☑️ Mostrar filiales inactivas]

Vista: [Grid] [Lista] [Tabla]

┌──────────────┐  ┌──────────────┐
│ 📍 Filial A  │  │ 📍 Filial B  │  ← Solo sus filiales
│ Lima         │  │ Cusco        │     (NO ve Panel Admin)
│              │  │              │
│ Rol: Instruc │  │ Rol: Consult │
│      [Entrar]│  │      [Entrar]│
└──────────────┘  └──────────────┘
```

### 2. **Panel de Administrador (Enabler) - REDISEÑADO**

Al hacer clic en "PANEL DE ADMINISTRADOR":

```
┌────────────────────────────────────────────────────────┐
│  Panel de Administrador            [← Volver] [🚪]     │
└────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📍 Gestión de Filiales                                 │
│  Crear, editar y administrar sucursales                 │
│                                              [Entrar →] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  👥 Gestión de Usuarios                                 │
│  Administrar usuarios, roles y permisos                 │
│                                              [Entrar →] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  🎭 Gestión de Roles                                    │
│  Configurar roles y permisos por módulo                 │
│                                              [Entrar →] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📧 Configuración SMTP                                  │
│  Configurar servidor de correo electrónico              │
│                                              [Entrar →] │
└─────────────────────────────────────────────────────────┘
```

### 3. **Módulo Gestión de Usuarios**

```
┌────────────────────────────────────────────────────────┐
│  👥 Gestión de Usuarios        [+ Nuevo Usuario]       │
└────────────────────────────────────────────────────────┘

Búsqueda: [_______________] 🔍

┌────────────────────────────────────────────────────────┐
│ Username  │ Nombre      │ Email         │ Tipo    │ Acc│
├───────────┼─────────────┼───────────────┼─────────┼────┤
│ jperez    │ Juan Pérez  │ juan@...      │ Admin   │ ✏️🗑│
│ mlopez    │ María López │ maria@...     │ Normal  │ ✏️🗑│
└────────────────────────────────────────────────────────┘
```

**Formulario Nuevo/Editar Usuario:**
```
┌─────────────────────────────────────────┐
│  Nuevo Usuario                    [X]   │
├─────────────────────────────────────────┤
│  Username: [__________]   (requerido)   │
│  Nombre:   [__________]   (requerido)   │
│  Email:    [__________]   (requerido,   │
│                            NO editable)  │
│  Teléfono: [__________]   (opcional)    │
│  Contraseña: [________]   (solo crear)  │
│                                          │
│  Tipo: (•) Administrador                │
│        ( ) Usuario Normal                │
│                                          │
│  ─── Asignación de Filiales ───         │
│  Filial Lima      Rol: [Administrador▼] │
│  Filial Cusco     Rol: [Instructor   ▼] │
│  [+ Agregar Filial]                      │
│                                          │
│          [Guardar] [Cancelar]            │
└─────────────────────────────────────────┘
```

### 4. **Módulo Gestión de Roles**

```
┌────────────────────────────────────────────────────────┐
│  🎭 Gestión de Roles             [+ Nuevo Rol]         │
└────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Rol              │ Descripción    │ Acc│
├──────────────────┼────────────────┼────┤
│ Administrador    │ Acceso total   │ ✏️ │
│ Instructor       │ Maneja clases  │ ✏️🗑│
│ Consultor        │ Solo lectura   │ ✏️🗑│
└─────────────────────────────────────────┘
```

**Formulario Configurar Rol:**
```
┌─────────────────────────────────────────────────┐
│  Configurar Rol: Instructor              [X]    │
├─────────────────────────────────────────────────┤
│  Nombre: [Instructor]                           │
│  Descripción: [Maneja clases y asistencias]     │
│                                                  │
│  ─── Permisos por Módulo ───                    │
│                                                  │
│  📚 Probacionistas                               │
│    [ ] Sin acceso                                │
│    [•] Ver (solo lectura)                        │
│    [ ] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  📖 Cursos                                       │
│    [ ] Sin acceso                                │
│    [•] Ver (solo lectura)                        │
│    [ ] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  👨‍🏫 Instructores                                 │
│    [ ] Sin acceso                                │
│    [•] Ver (solo lectura)                        │
│    [ ] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  📁 Grupos                                       │
│    [ ] Sin acceso                                │
│    [ ] Ver (solo lectura)                        │
│    [•] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  ✅ Asistencia                                   │
│    [ ] Sin acceso                                │
│    [ ] Ver (solo lectura)                        │
│    [•] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  💬 Asesorías Filosóficas                        │
│    [ ] Sin acceso                                │
│    [ ] Ver (solo lectura)                        │
│    [•] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│  📋 Inscripciones                                │
│    [ ] Sin acceso                                │
│    [•] Ver (solo lectura)                        │
│    [ ] Crear/Modificar                           │
│    [ ] Eliminar                                  │
│                                                  │
│            [Guardar] [Cancelar]                  │
└─────────────────────────────────────────────────┘
```

### 5. **Detalle de Estudiante con Asesorías Filosóficas**

```
┌────────────────────────────────────────────────────────┐
│  Probacionista: Juan Pérez García            [X]       │
├────────────────────────────────────────────────────────┤
│  [Información] [Inscripciones] [Asesorías] [Historial]│ ← Tabs
└────────────────────────────────────────────────────────┘

En tab "Asesorías":

┌────────────────────────────────────────────────────────┐
│  💬 Asesorías Filosóficas        [+ Nueva Asesoría]    │
├────────────────────────────────────────────────────────┤
│ Fecha      │ Instructor  │ Grupo     │ Estado │ Acción│
├────────────┼─────────────┼───────────┼────────┼───────┤
│ 10/11/2025 │ M. García   │ Grupo A   │ 🔥 Cal │ [Ver] │
│ 05/11/2025 │ J. Díaz     │ Grupo A   │ 😐 Tib │ [Ver] │
│ 01/10/2025 │ M. García   │ Grupo A   │ ❄️ Frí │ [Ver] │
└────────────────────────────────────────────────────────┘
```

**Formulario Nueva Asesoría:**
```
┌─────────────────────────────────────────┐
│  Nueva Asesoría Filosófica        [X]   │
├─────────────────────────────────────────┤
│  Probacionista: Juan Pérez García       │
│  Grupo: [Grupo A - Lima ▼] (auto)      │
│  Instructor: [María García  ▼]         │
│  Fecha: [10/11/2025]                    │
│                                          │
│  Indicador:                              │
│    ( ) ❄️  Frío                          │
│    ( ) 😐 Tibio                          │
│    (•) 🔥 Caliente                       │
│                                          │
│  Observaciones:                          │
│  [________________________________]      │
│  [________________________________]      │
│  [________________________________]      │
│                                          │
│          [Guardar] [Cancelar]            │
└─────────────────────────────────────────┘
```

### 6. **Header con Usuario (Estilo ERPNext)**

```
┌──────────────────────────────────────────────────────┐
│ [🎓] Sistema  [Filial: Lima ▼]   [👤 Juan Pérez ▼]  │
└──────────────────────────────────────────────────────┘

Dropdown al hacer clic en usuario:
┌──────────────────────┐
│ 👤 Mi Perfil         │
│ 🔑 Cambiar Contraseña│
│ ──────────────────── │
│ 🚪 Cerrar Sesión     │
└──────────────────────┘
```

### 7. **Mi Perfil**

```
┌─────────────────────────────────────────┐
│  👤 Mi Perfil                     [X]   │
├─────────────────────────────────────────┤
│  Username: jperez (no editable)         │
│  Nombre:   [Juan Pérez García     ]     │
│  Email:    juan@example.com (bloqueado) │
│  Teléfono: [987654321             ]     │
│                                          │
│  Tipo: Administrador (no editable)      │
│                                          │
│  [🔑 Solicitar Cambio de Contraseña]    │
│                                          │
│          [Guardar] [Cancelar]            │
└─────────────────────────────────────────┘
```

### 8. **Olvidé Contraseña / Resetear**

**Página Login con link:**
```
[Usuario: _______]
[Contraseña: ____]
[Iniciar Sesión]

¿Olvidaste tu contraseña?  ← Link
```

**Página Solicitar Reseteo:**
```
┌─────────────────────────────────────┐
│  🔑 Recuperar Contraseña            │
├─────────────────────────────────────┤
│  Ingresa tu correo electrónico:     │
│  [_________________________]        │
│                                      │
│  [Enviar Instrucciones]              │
│                                      │
│  [← Volver al Login]                 │
└─────────────────────────────────────┘
```

**Página Cambiar Contraseña (con token):**
```
┌─────────────────────────────────────┐
│  🔑 Cambiar Contraseña              │
├─────────────────────────────────────┤
│  Nueva Contraseña:                   │
│  [_________________________]        │
│                                      │
│  Confirmar Contraseña:               │
│  [_________________________]        │
│                                      │
│  [Cambiar Contraseña]                │
└─────────────────────────────────────┘
```

### 9. **Configuración SMTP**

```
┌─────────────────────────────────────────┐
│  📧 Configuración SMTP          [X]     │
├─────────────────────────────────────────┤
│  Host SMTP:                              │
│  [smtp.gmail.com              ]         │
│                                          │
│  Puerto:                                 │
│  [587]                                   │
│                                          │
│  Email remitente:                        │
│  [sistema@escolastica.com     ]         │
│                                          │
│  Contraseña:                             │
│  [••••••••••••••]                        │
│                                          │
│  Seguridad:                              │
│  (•) TLS  ( ) SSL                        │
│                                          │
│  Nombre del remitente:                   │
│  [Sistema Escolástica         ]         │
│                                          │
│  [🧪 Probar Conexión] [Guardar]         │
│                                          │
│  Estado: ✅ Conexión exitosa             │
└─────────────────────────────────────────┘
```

---

## 🗄️ DISEÑO DE BASE DE DATOS

### **NUEVAS TABLAS**

#### 1. `roles` (Roles personalizados)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- true para Admin (no eliminable)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `role_permissions` (Permisos por rol y módulo)
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'students', 'courses', 'instructors', 'groups', 'attendance', 'counseling', 'enrollments'
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, module)
);
```

#### 3. `user_branch_roles` (Usuario → Filial → Rol)
```sql
CREATE TABLE user_branch_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);
```

#### 4. `philosophical_counseling` (Asesorías Filosóficas - HISTÓRICO)
```sql
CREATE TABLE philosophical_counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  group_name TEXT NOT NULL, -- HISTÓRICO: nombre del grupo al momento
  group_code TEXT, -- HISTÓRICO: código del grupo al momento
  counseling_date DATE NOT NULL DEFAULT CURRENT_DATE,
  indicator TEXT NOT NULL, -- 'frio', 'tibio', 'caliente'
  observations TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_counseling_student ON philosophical_counseling(student_id);
CREATE INDEX idx_counseling_date ON philosophical_counseling(counseling_date DESC);
```

#### 5. `system_config` (Configuración SMTP y global)
```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);
```

#### 6. `password_reset_tokens` (Tokens temporales para reseteo)
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at);
```

### **MODIFICAR TABLAS EXISTENTES**

#### 1. `users` (Añadir campos)
```sql
ALTER TABLE users
  ADD COLUMN full_name TEXT,
  ADD COLUMN email TEXT UNIQUE NOT NULL,
  ADD COLUMN phone TEXT,
  ADD COLUMN user_type TEXT NOT NULL DEFAULT 'normal', -- 'admin' | 'normal'
  DROP COLUMN role; -- Ya no usaremos el enum antiguo
```

#### 2. `branches` (Añadir campo active)
```sql
ALTER TABLE branches
  ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
```

---

## 🔌 BACKEND - ENDPOINTS

### **1. Auth Routes (`/api/auth/`)**

#### Modificar existentes:
- **POST `/login`** → Retornar usuario + filiales asignadas + roles
  ```json
  {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "username": "jperez",
      "fullName": "Juan Pérez",
      "email": "juan@example.com",
      "userType": "admin"
    },
    "branches": [
      {
        "id": "uuid",
        "name": "Lima",
        "code": "LIM-001",
        "roleId": "uuid",
        "roleName": "Administrador",
        "permissions": { ... }
      }
    ]
  }
  ```

- **GET `/me`** → Retornar usuario completo + filiales con roles

#### Nuevos endpoints:
- **POST `/forgot-password`** - Solicitar reseteo (envía email)
  ```json
  { "email": "juan@example.com" }
  ```

- **GET `/verify-token/:token`** - Validar token de reseteo

- **POST `/reset-password/:token`** - Cambiar contraseña con token
  ```json
  { "newPassword": "nueva123" }
  ```

- **POST `/request-password-change`** - Solicitar cambio (usuario logueado)

### **2. Users Routes (`/api/users/`)** ⭐ NUEVO

- **GET `/`** - Listar usuarios (paginado, búsqueda)
- **POST `/`** - Crear usuario
  ```json
  {
    "username": "jperez",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "987654321",
    "password": "temp123",
    "userType": "normal",
    "branchRoles": [
      { "branchId": "uuid", "roleId": "uuid" },
      { "branchId": "uuid2", "roleId": "uuid2" }
    ]
  }
  ```
- **PUT `/:id`** - Actualizar usuario
- **DELETE `/:id`** - Eliminar usuario (soft delete)
- **GET `/:id/branches`** - Obtener filiales asignadas
- **POST `/:id/assign-branches`** - Asignar/actualizar filiales y roles

### **3. Roles Routes (`/api/roles/`)** ⭐ NUEVO

- **GET `/`** - Listar roles
- **POST `/`** - Crear rol
  ```json
  {
    "name": "Instructor",
    "description": "Maneja clases y asistencias",
    "permissions": [
      { "module": "students", "canView": true, "canCreate": false, "canEdit": false, "canDelete": false },
      { "module": "groups", "canView": true, "canCreate": true, "canEdit": true, "canDelete": false },
      { "module": "attendance", "canView": true, "canCreate": true, "canEdit": true, "canDelete": false }
    ]
  }
  ```
- **PUT `/:id`** - Actualizar rol y permisos
- **DELETE `/:id`** - Eliminar rol (solo no-system)
- **GET `/:id/permissions`** - Obtener permisos del rol

### **4. Profile Routes (`/api/profile/`)** ⭐ NUEVO

- **GET `/me`** - Obtener perfil propio
- **PUT `/me`** - Editar perfil propio (solo fullName, phone)

### **5. System Config Routes (`/api/system/config`)** ⭐ NUEVO

- **GET `/smtp`** - Obtener config SMTP (ofuscar password)
- **POST `/smtp`** - Guardar config SMTP
- **POST `/smtp/test`** - Probar conexión SMTP

### **6. Counseling Routes (`/api/students/:studentId/counseling`)** ⭐ NUEVO

- **GET `/`** - Listar asesorías del estudiante
- **POST `/`** - Crear nueva asesoría
  ```json
  {
    "instructorId": "uuid",
    "branchId": "uuid",
    "groupName": "Grupo A - Lima", // HISTÓRICO
    "groupCode": "GRP-001", // HISTÓRICO
    "counselingDate": "2025-11-10",
    "indicator": "caliente",
    "observations": "Excelente progreso..."
  }
  ```
- **PUT `/:id`** - Editar asesoría
- **DELETE `/:id`** - Eliminar asesoría

### **7. Branches Routes (modificar existente)**

- **GET `/`** - Añadir parámetro `?includeInactive=true`
- **PUT `/:id/toggle-active`** - Activar/desactivar filial

---

## 🛡️ MIDDLEWARE DE AUTORIZACIÓN

### `checkPermission(module, action)`

Middleware que valida si el usuario tiene permiso para ejecutar una acción en un módulo:

```typescript
// backend/src/middleware/checkPermission.ts
export function checkPermission(module: string, action: 'view' | 'create' | 'edit' | 'delete') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request.user as any);
    const branchId = request.query.branchId || request.body.branchId;
    
    // Administradores tienen acceso total
    if (user.userType === 'admin') {
      return;
    }
    
    // Verificar permiso específico del rol en la filial
    const permission = await getPermission(user.userId, branchId, module, action);
    
    if (!permission) {
      return reply.code(403).send({ error: 'No tienes permiso para esta acción' });
    }
  };
}
```

**Uso en rutas:**
```typescript
fastify.get('/students', {
  onRequest: [fastify.authenticate, checkPermission('students', 'view')]
}, async (request, reply) => { ... });

fastify.post('/students', {
  onRequest: [fastify.authenticate, checkPermission('students', 'create')]
}, async (request, reply) => { ... });
```

---

## 🎨 FRONTEND - COMPONENTES

### **Nuevos Componentes**

1. **`/src/app/dashboard/page.tsx`** - REDISEÑAR
   - Vista con tres modos (Grid/Lista/Tabla)
   - Toggle "Mostrar inactivas"
   - Panel Admin destacado (primera fila, solo admin)
   - Filtrar filiales por usuario

2. **`/src/app/admin/page.tsx`** - REDISEÑAR (Enabler)
   - 4 opciones: Filiales, Usuarios, Roles, Config SMTP
   - Solo accesible por admins

3. **`/src/app/admin/users/page.tsx`** ⭐ NUEVO
   - CRUD usuarios
   - Asignar filiales y roles

4. **`/src/app/admin/roles/page.tsx`** ⭐ NUEVO
   - CRUD roles
   - Configurar permisos por módulo

5. **`/src/app/admin/smtp/page.tsx`** ⭐ NUEVO
   - Formulario config SMTP
   - Test connection

6. **`/src/app/profile/page.tsx`** ⭐ NUEVO
   - Editar perfil propio
   - Solicitar cambio de contraseña

7. **`/src/app/forgot-password/page.tsx`** ⭐ NUEVO
   - Solicitar reseteo por email

8. **`/src/app/reset-password/page.tsx`** ⭐ NUEVO
   - Cambiar contraseña con token

9. **`/src/components/ui/header-with-user.tsx`** ⭐ NUEVO
   - Header global con usuario logueado
   - Dropdown: Perfil, Cambiar contraseña, Logout

10. **`/src/components/modules/PhilosophicalCounselingTab.tsx`** ⭐ NUEVO
    - Pestaña dentro de StudentDetails
    - Lista de asesorías
    - Formulario crear/editar

11. **`/src/components/modules/UserManagementModule.tsx`** ⭐ NUEVO
    - Tabla de usuarios
    - Formularios CRUD

12. **`/src/components/modules/RoleManagementModule.tsx`** ⭐ NUEVO
    - Lista de roles
    - Configurador de permisos

---

## 🔗 FLUJO DE INTEGRACIÓN

### **1. Login → Dashboard**

```
Usuario ingresa credenciales
  ↓
Backend valida y retorna:
  - Token JWT
  - Usuario (id, username, fullName, email, userType)
  - Filiales asignadas con roles y permisos
  ↓
Frontend guarda en localStorage:
  - auth_token
  - user
  - user_branches (con permisos)
  ↓
Redirige a /dashboard
  ↓
Dashboard muestra:
  - SI es admin: Panel Admin (primera fila) + Sus filiales
  - SI es normal: Solo sus filiales asignadas
```

### **2. Seleccionar Filial → Workspace**

```
Usuario hace clic en una filial
  ↓
Frontend guarda:
  - selected_branch (id)
  - selected_role (roleId)
  - selected_permissions (objeto)
  ↓
Redirige a /workspace?branchId=xxx
  ↓
Workspace verifica permisos:
  - Oculta módulos sin permiso 'view'
  - Deshabilita botones según permisos (create, edit, delete)
```

### **3. Crear Asesoría Filosófica**

```
Usuario abre detalle de estudiante
  ↓
Tab "Asesorías" carga lista histórica
  ↓
Usuario hace clic "Nueva Asesoría"
  ↓
Formulario pre-rellena:
  - Estudiante (auto)
  - Grupo actual del estudiante (nombre + código HISTÓRICO)
  ↓
Usuario selecciona:
  - Instructor
  - Indicador (frío/tibio/caliente)
  - Observaciones
  ↓
Frontend envía POST /api/students/:id/counseling
Backend guarda con datos HISTÓRICOS (no FK a group)
  ↓
Respuesta exitosa → Refresca lista
```

### **4. Resetear Contraseña**

```
Usuario hace clic "Olvidé mi contraseña"
  ↓
Ingresa email → POST /api/auth/forgot-password
  ↓
Backend:
  - Busca usuario por email
  - Genera token aleatorio (UUID)
  - Guarda en password_reset_tokens (expires_at: +1 hora)
  - Envía email con link: https://app.com/reset-password?token=xxx
  ↓
Usuario hace clic en link
  ↓
Frontend valida token: GET /api/auth/verify-token/:token
  ↓
Si válido → Muestra formulario cambiar contraseña
  ↓
Usuario ingresa nueva contraseña → POST /api/auth/reset-password/:token
  ↓
Backend:
  - Valida token (no usado, no expirado)
  - Actualiza password_hash
  - Marca token como usado
  ↓
Redirige a /login con mensaje éxito
```

---

## ✅ CRITERIOS DE ACEPTACIÓN

### **Base de Datos**
1. ✅ 8 nuevas tablas creadas y migradas
2. ✅ Tablas `users` y `branches` modificadas correctamente
3. ✅ Relaciones FK correctas y índices optimizados
4. ✅ Datos históricos en `philosophical_counseling` (no FK a groups)

### **Backend**
1. ✅ Login retorna usuario + filiales + roles + permisos
2. ✅ Middleware `checkPermission` valida acceso por módulo
3. ✅ CRUD completo de usuarios y asignación de roles
4. ✅ CRUD completo de roles y configuración de permisos
5. ✅ Sistema de reseteo de contraseña por email funcional
6. ✅ Configuración SMTP con test connection
7. ✅ CRUD de asesorías filosóficas con datos históricos
8. ✅ Endpoint branches filtra por `active` según toggle

### **Frontend**
1. ✅ Dashboard muestra Panel Admin solo a administradores (primera fila)
2. ✅ Dashboard filtra filiales según usuario logueado
3. ✅ Toggle "Mostrar inactivas" funcional
4. ✅ Tres vistas (Grid/Lista/Tabla) en dashboard
5. ✅ Panel Admin rediseñado (4 módulos: Filiales, Usuarios, Roles, SMTP)
6. ✅ Módulo Gestión de Usuarios completo (CRUD + asignación)
7. ✅ Módulo Gestión de Roles completo (CRUD + permisos)
8. ✅ Header con usuario logueado y dropdown funcional
9. ✅ Página "Mi Perfil" permite editar datos (excepto email)
10. ✅ Flujo de reseteo de contraseña completo
11. ✅ Tab "Asesorías Filosóficas" en detalle de estudiante
12. ✅ Formulario crear/editar asesoría con datos históricos
13. ✅ Workspace valida permisos y oculta/deshabilita según rol
14. ✅ Notificaciones apropiadas (Sonner) en todas las acciones

### **Experiencia de Usuario**
1. ✅ Usuario normal NO ve Panel de Administrador
2. ✅ Usuario solo ve sus filiales asignadas
3. ✅ Asesorías muestran grupo histórico (aunque probacionista cambie)
4. ✅ Email NO es editable después de crear usuario
5. ✅ Cambio de contraseña siempre por email (ambos flujos)
6. ✅ Diseño sobrio, profesional, consistente (Shadcn/ui)
7. ✅ Responsive en mobile, tablet, desktop

---

## 🚨 CONSIDERACIONES Y RIESGOS

### **Alto Riesgo**
1. **Migración de usuarios existentes**: Hay que migrar `users` con rol enum a nuevo sistema
   - Solución: Script de migración que crea roles por defecto y asigna
2. **Cambio de autenticación**: Puede romper sesiones activas
   - Solución: Invalidar todos los tokens actuales al desplegar
3. **Datos históricos**: Si se borran grupos, las asesorías deben mantener el nombre
   - Solución: Guardar como TEXT, no FK

### **Medio Riesgo**
1. **SMTP puede no estar configurado**: Reseteo no funcionará
   - Solución: Validar config antes de enviar, mostrar error claro
2. **Permisos complejos**: Puede confundir a administradores
   - Solución: Roles predefinidos + wizard guiado

### **Bajo Riesgo**
1. **Rendimiento de consultas con muchos permisos**
   - Solución: Índices adecuados + caché en Redis

---

## 📦 DEPENDENCIAS NUEVAS

### Backend
```json
{
  "nodemailer": "^6.9.7",
  "@types/nodemailer": "^6.4.14",
  "crypto": "built-in"
}
```

### Frontend
- No se requieren nuevas dependencias (Shadcn/ui ya instalado)

---

## 📅 ORDEN DE IMPLEMENTACIÓN SUGERIDO

### **Fase 1: Base de Datos y Migraciones** (Backend)
1. Crear nuevas tablas (roles, role_permissions, user_branch_roles, etc.)
2. Modificar tablas existentes (users, branches)
3. Script de migración de datos (roles por defecto, asignar admin)
4. Seed de datos de prueba

### **Fase 2: Backend - Autenticación y Usuarios** (Backend)
1. Modificar `/api/auth/login` para retornar filiales + roles
2. Modificar `/api/auth/me`
3. Crear rutas `/api/users` (CRUD completo)
4. Crear rutas `/api/roles` (CRUD completo)
5. Implementar middleware `checkPermission`

### **Fase 3: Backend - Reseteo de Contraseña** (Backend)
1. Configurar nodemailer
2. Crear rutas `/api/auth/forgot-password`, `/reset-password`
3. Crear `/api/system/config` (SMTP)
4. Implementar envío de emails

### **Fase 4: Backend - Asesorías Filosóficas** (Backend)
1. Crear rutas `/api/students/:id/counseling`
2. Validaciones y lógica de negocio

### **Fase 5: Frontend - Dashboard y Enabler** (Frontend)
1. Rediseñar `/dashboard` (Panel Admin + Filiales + Toggle + 3 vistas)
2. Rediseñar `/admin` (Enabler con 4 módulos)
3. Crear header con usuario logueado

### **Fase 6: Frontend - Gestión de Usuarios y Roles** (Frontend)
1. Crear `/admin/users` (CRUD + asignación)
2. Crear `/admin/roles` (CRUD + permisos)
3. Crear `/admin/smtp` (config + test)

### **Fase 7: Frontend - Perfil y Reseteo** (Frontend)
1. Crear `/profile` (editar datos)
2. Crear `/forgot-password`
3. Crear `/reset-password`
4. Modificar `/login` (añadir link)

### **Fase 8: Frontend - Asesorías Filosóficas** (Frontend)
1. Crear `PhilosophicalCounselingTab` component
2. Integrar en `StudentDetails`
3. Formularios CRUD

### **Fase 9: Integración y Validación de Permisos** (Frontend + Backend)
1. Validar permisos en workspace
2. Ocultar/deshabilitar módulos según rol
3. Validar todos los flujos completos

### **Fase 10: Testing y Ajustes** (Full Stack)
1. Pruebas de cada flujo
2. Ajustes de diseño
3. Optimización de rendimiento
4. Documentación final

---

## ❓ PREGUNTAS PENDIENTES

1. ✅ **Roles predefinidos**: ¿Creo roles por defecto (Admin, Instructor, Consultor) en el seed?
2. ✅ **Migración de usuarios actuales**: ¿Convierto todos los usuarios existentes a tipo "admin"?
3. ✅ **Email obligatorio**: ¿Añado validación para que todos los usuarios tengan email antes de desplegar?
4. ✅ **Token de reseteo**: ¿Tiempo de expiración 1 hora es suficiente?
5. ✅ **Asesorías**: ¿El instructor puede editar/borrar asesorías antiguas o solo ver?

---

## 🎯 RESUMEN DE IMPACTO

### ✅ **Base de Datos**: 
- **8 nuevas tablas**
- **2 tablas modificadas**
- **1 script de migración**
- **Datos de seed** (roles, permisos, config)

### ✅ **Backend**: 
- **7 archivos de rutas nuevos/modificados**
- **1 middleware nuevo** (checkPermission)
- **1 servicio nuevo** (emailService)
- **~30 nuevos endpoints**

### ✅ **Frontend**: 
- **12 componentes/páginas nuevos**
- **4 componentes existentes modificados**
- **1 header global nuevo**
- **~15 archivos modificados/creados**

---

## 📝 NOTAS FINALES

- Este plan es **extenso y detallado** porque afecta TODO el sistema
- Estimación: **3-5 días de desarrollo full-time**
- Requiere **testing exhaustivo** antes de producción
- **Compatibilidad hacia atrás**: Puede romper sesiones actuales (avisar a usuarios)
- **Rollback plan**: Guardar backup de BD antes de migrar

---

**¿Apruebas este plan para proceder con la implementación?** 🚀
