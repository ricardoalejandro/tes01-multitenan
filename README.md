# 🎓 Sistema de Gestión Académica Multi-Tenant

Sistema completo de gestión académica para instituciones educativas con múltiples sucursales. Construido con Next.js, Fastify, PostgreSQL y Redis.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Características Principales

- ✅ **Multi-tenancy completo** con aislamiento de datos por sucursal
- ✅ **Next.js 14** con App Router y Server Components
- ✅ **Diseño profesional** con Tailwind CSS 4 y Shadcn/ui
- ✅ **Backend robusto** con Fastify y PostgreSQL 17
- ✅ **Cache Redis** para rendimiento óptimo
- ✅ **Autenticación JWT** con bcrypt
- ✅ **Paginación server-side** y búsqueda en tiempo real
- ✅ **Docker & DevContainer** para desarrollo rápido
- ✅ **Instalador automático** para despliegue en Linux
- ✅ **API REST completa** con documentación Swagger

## 📋 Tabla de Contenidos

- [Requisitos](#-requisitos)
- [Instalación Rápida](#-instalación-rápida)
- [Arquitectura](#-arquitectura)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Desarrollo](#-desarrollo)
- [Producción](#-producción)
- [API Documentation](#-api-documentation)
- [Estructura del Proyecto](#-estructura-del-proyecto)

## 🔧 Requisitos

### Para Instalación Automática (Linux)
- Sistema operativo: Ubuntu 20.04+, Debian 10+, CentOS 7+, o RHEL 7+
- Permisos de sudo/root
- Acceso a Internet

### Para Desarrollo Manual
- Node.js 20.x o superior
- PostgreSQL 17
- Redis 7
- npm 10.x o superior

### Para Desarrollo con DevContainer
- Docker Desktop
- Visual Studio Code
- Extensión Dev Containers

## 🚀 Instalación Rápida

### Opción 1: Instalador Automático (Recomendado para Producción)

```bash
# Clonar el repositorio
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan

# Ejecutar instalador (requiere sudo)
sudo bash scripts/install.sh
```

El instalador automáticamente:
- ✅ Instala Node.js 20
- ✅ Instala PostgreSQL 17
- ✅ Instala Redis 7
- ✅ Instala Docker y Docker Compose
- ✅ Configura la base de datos
- ✅ Instala dependencias del proyecto
- ✅ Ejecuta migraciones y seeds
- ✅ Crea servicios systemd

### Opción 2: DevContainer (Recomendado para Desarrollo)

1. Abrir el proyecto en VS Code
2. Instalar la extensión "Dev Containers"
3. Presionar `Ctrl+Shift+P` y seleccionar "Dev Containers: Reopen in Container"
4. Esperar 3-5 minutos mientras se configura el entorno
5. Una vez listo, abrir dos terminales y ejecutar:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run backend:dev
```

### Opción 3: Instalación Manual

```bash
# 1. Instalar dependencias del sistema
# PostgreSQL 17, Redis 7, Node.js 20

# 2. Crear base de datos
createdb multitenant_db

# 3. Clonar e instalar dependencias
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan

# Instalar dependencias
npm install
cd backend && npm install && cd ..

# 4. Configurar variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env

# Editar los archivos .env con tus credenciales

# 5. Ejecutar migraciones y seed
cd backend
npm run db:push
npm run db:seed
cd ..

# 6. Iniciar servicios
npm run dev:all
```

## 🏗️ Arquitectura

### Stack Tecnológico

#### Frontend
- **Framework**: Next.js 14.2 con App Router
- **UI**: Tailwind CSS 4.1.11 + Shadcn/ui
- **Estado**: TanStack Query (React Query) 5.83.1
- **Forms**: React Hook Form 7.54.2 + Zod 3.25.76
- **HTTP**: Axios 1.13.1
- **Iconos**: Lucide React
- **Notificaciones**: Sonner 2.0.1
- **Tema**: next-themes con modo oscuro

#### Backend
- **Framework**: Fastify 5.3.0
- **Base de Datos**: PostgreSQL 17
- **ORM**: Drizzle ORM 0.36.4
- **Cache**: Redis 7
- **Autenticación**: JWT (@fastify/jwt 9.0.1) + Bcrypt 5.1.1
- **Seguridad**: Helmet 12.0.1 + CORS 10.0.1 + Rate Limiting
- **Documentación**: Swagger/OpenAPI
- **Logger**: Pino Pretty

#### Infraestructura
- **Contenedores**: Docker + Docker Compose
- **Dev Environment**: DevContainer
- **Runtime**: Node.js 20
- **Puertos**: Frontend (5000), Backend (3000), PostgreSQL (5432), Redis (6379)

### Modelo de Datos

El sistema cuenta con 14 tablas principales:

1. **users** - Usuarios del sistema (superadmin, admin, instructor)
2. **branches** - Sucursales/Filiales (multi-tenant)
3. **students** - Probacionistas/Estudiantes
4. **courses** - Cursos
5. **course_themes** - Temas de cada curso
6. **instructors** - Instructores
7. **instructor_specialties** - Especialidades de instructores
8. **class_groups** - Grupos de clases
9. **group_selected_days** - Días de clase seleccionados
10. **group_courses** - Cursos asignados a grupos
11. **class_sessions** - Sesiones de clase generadas
12. **session_themes** - Temas por sesión
13. **group_enrollments** - Inscripciones de estudiantes
14. **attendance_records** - Registros de asistencia

## 📚 Módulos del Sistema

### 1. Autenticación
- Login con JWT
- Roles: superadmin, admin, instructor
- Credenciales por defecto: `admin` / `escolastica123`

### 2. Gestión de Sucursales (Branches)
- CRUD completo de sucursales
- Código único por sucursal
- Solo accesible por superadmin

### 3. Probacionistas (Students)
- CRUD con paginación server-side
- Búsqueda en tiempo real
- Importar/Exportar Excel
- Datos personales completos
- Seguimiento de estado y mensualidad

### 4. Cursos
- Gestión de cursos por sucursal
- Temas ordenados secuencialmente
- Importar/Exportar JSON

### 5. Instructores
- CRUD de instructores
- Especialidades múltiples
- Tarifa por hora
- Importar/Exportar Excel

### 6. Grupos de Clases
- Creación de grupos
- Asignación de cursos e instructores
- Generación automática de horarios
- Frecuencias: Diario, Semanal, Mensual

### 7. Inscripciones
- Inscripción de estudiantes a grupos
- Búsqueda y filtros
- Inscripción masiva

### 8. Asistencia
- Toma de asistencia por sesión
- Estados: Presente, Ausente, Tardanza, Justificado
- Estadísticas y reportes

## 💻 Desarrollo

### Estructura de Comandos

```bash
# Desarrollo
npm run dev                 # Iniciar frontend (puerto 5000)
npm run backend:dev         # Iniciar backend (puerto 3000)
npm run dev:all             # Iniciar ambos con concurrently

# Build
npm run build               # Build frontend
npm run backend:build       # Build backend

# Base de datos
cd backend
npm run db:generate         # Generar migraciones
npm run db:push             # Aplicar migraciones
npm run db:studio           # Abrir Drizzle Studio
npm run db:seed             # Seed de datos iniciales

# Testing
bash scripts/e2e-test.sh    # Tests E2E
```

### Variables de Entorno

#### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

#### Backend (backend/.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multitenant_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5000
```

### Flujo de Desarrollo

1. Crear una nueva rama: `git checkout -b feature/nueva-funcionalidad`
2. Realizar cambios
3. Probar localmente
4. Commit: `git commit -m "feat: descripción"`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Crear Pull Request

## 🚀 Producción

### Con Docker Compose

```bash
# Build y iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Con Systemd (Después del instalador)

```bash
# Build de producción
npm run build
cd backend && npm run build && cd ..

# Iniciar servicios
sudo systemctl start multitenant-backend
sudo systemctl start multitenant-frontend

# Habilitar inicio automático
sudo systemctl enable multitenant-backend
sudo systemctl enable multitenant-frontend

# Ver estado
sudo systemctl status multitenant-backend
sudo systemctl status multitenant-frontend
```

## 📖 API Documentation

Una vez iniciado el backend, la documentación completa de la API está disponible en:

**Swagger UI**: http://localhost:3000/docs

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

#### Branches
- `GET /api/branches` - Listar sucursales
- `POST /api/branches` - Crear sucursal
- `GET /api/branches/:id` - Obtener sucursal
- `PUT /api/branches/:id` - Actualizar sucursal
- `DELETE /api/branches/:id` - Eliminar sucursal

#### Students
- `GET /api/students?branchId={id}&page=1&limit=10&search={query}`
- `POST /api/students`
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

_(Ver documentación completa en Swagger)_

## 📁 Estructura del Proyecto

```
tes01-multitenan/
├── .devcontainer/          # Configuración DevContainer
│   ├── devcontainer.json
│   ├── Dockerfile
│   └── setup.sh
├── backend/                # Backend Fastify
│   ├── src/
│   │   ├── db/            # Database schema y conexión
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Middleware personalizado
│   │   └── index.ts       # Entry point
│   ├── package.json
│   └── tsconfig.json
├── src/                    # Frontend Next.js
│   ├── app/               # App Router
│   ├── components/        # React components
│   │   └── ui/           # UI components (Shadcn)
│   ├── lib/              # Utilidades y API client
│   └── hooks/            # Custom hooks
├── scripts/               # Scripts de utilidad
│   ├── install.sh        # Instalador automático
│   ├── start-all.sh      # Iniciar servicios
│   ├── stop-all.sh       # Detener servicios
│   └── e2e-test.sh       # Tests E2E
├── docker-compose.yml     # Docker Compose config
├── package.json          # Frontend dependencies
└── README.md             # Este archivo
```

## 🔐 Seguridad

- ✅ JWT para autenticación
- ✅ Bcrypt para hash de contraseñas (10 rounds)
- ✅ Rate limiting (100 req/min)
- ✅ Helmet para security headers
- ✅ CORS configurado
- ✅ Validación con Zod
- ✅ SQL injection protection (Drizzle ORM)
- ✅ XSS protection

## 🎨 Diseño UI/UX

- Diseño moderno y profesional
- Responsive (móvil, tablet, desktop)
- Modo oscuro/claro
- Componentes reutilizables con Shadcn/ui
- Paleta de colores personalizada
- Animaciones suaves
- Feedback visual (toasts, loaders, estados)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 👥 Soporte

Para soporte y preguntas:
- Abrir un issue en GitHub
- Email: soporte@ejemplo.com

## 🎉 Créditos

Desarrollado con ❤️ por el equipo de desarrollo.

---

**¡Disfruta tu Sistema de Gestión Académica Multi-Tenant!** 🚀
