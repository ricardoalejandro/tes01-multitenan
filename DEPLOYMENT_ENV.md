# 🚀 Guía de Variables de Entorno para Despliegue

## 📋 Archivos de Configuración

Este proyecto utiliza diferentes archivos `.env` según el contexto:

| Archivo | Propósito | Usado por |
|---------|-----------|-----------|
| `.env` (raíz) | Variables para Docker Compose | `docker-compose.yml` |
| `.env.local` (raíz) | Variables para Next.js en desarrollo | Frontend Next.js |
| `backend/.env` | Variables para backend en desarrollo local | Backend Fastify |
| `.env.example` (raíz) | Plantilla de variables | Documentación |
| `backend/.env.example` | Plantilla backend | Documentación |

## 🔧 Configuración para Despliegue

### 1. Crear archivo .env principal

En la raíz del proyecto, copia el archivo de ejemplo:

```bash
cp .env.example .env
```

### 2. Modificar variables críticas

Edita `.env` y cambia los siguientes valores **OBLIGATORIOS** en producción:

```env
# ⚠️ CRÍTICO: Cambiar en producción
JWT_SECRET=genera-un-secreto-aleatorio-muy-largo-y-seguro-min-32-chars

# Credenciales de base de datos
POSTGRES_USER=tu_usuario_produccion
POSTGRES_PASSWORD=tu_password_seguro_produccion
POSTGRES_DB=escolastica_production

# URLs y puertos según tu servidor
CORS_ORIGIN=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
```

### 3. Variables por Entorno

#### 🏠 Desarrollo Local (localhost)
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
BACKEND_EXTERNAL_PORT=3000
FRONTEND_EXTERNAL_PORT=5000
```

#### 🧪 Staging (semi-productivo)
```env
NODE_ENV=production
CORS_ORIGIN=https://staging.tu-dominio.com
NEXT_PUBLIC_API_URL=https://staging-api.tu-dominio.com/api
BACKEND_EXTERNAL_PORT=3000
FRONTEND_EXTERNAL_PORT=5000

# Credenciales específicas de staging
POSTGRES_USER=escolastica_staging
POSTGRES_PASSWORD=password_staging_seguro
POSTGRES_DB=escolastica_staging_db
```

#### 🚀 Producción
```env
NODE_ENV=production
CORS_ORIGIN=https://escolastica.tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.escolastica.tu-dominio.com/api

# Puertos internos (si usas reverse proxy como nginx)
BACKEND_EXTERNAL_PORT=3000
FRONTEND_EXTERNAL_PORT=5000

# Credenciales de producción (NUNCA compartir)
JWT_SECRET=secret-super-largo-generado-con-openssl-rand
POSTGRES_USER=escolastica_prod
POSTGRES_PASSWORD=password-muy-seguro-de-produccion
POSTGRES_DB=escolastica_production
```

## 🔐 Generar JWT Secret Seguro

Para generar un JWT secret aleatorio y seguro:

```bash
# Opción 1: Con OpenSSL
openssl rand -base64 32

# Opción 2: Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Con /dev/urandom (Linux)
head -c 32 /dev/urandom | base64
```

## 📦 Desplegar con Docker Compose

### Paso 1: Verificar que .env existe
```bash
ls -la .env
```

### Paso 2: Validar variables
```bash
cat .env
```

### Paso 3: Desplegar
```bash
# Detener servicios anteriores
docker compose down

# Construir y desplegar con nuevas variables
docker compose up -d --build

# Verificar logs
docker compose logs -f
```

## 🔍 Verificar Variables en Contenedores

Para verificar que las variables se cargaron correctamente:

```bash
# Ver variables del backend
docker compose exec backend env | grep -E "(JWT|DATABASE|REDIS|PORT)"

# Ver variables del frontend
docker compose exec frontend env | grep -E "(NEXT_PUBLIC|PORT)"

# Ver variables de postgres
docker compose exec postgres env | grep POSTGRES
```

## ⚠️ Seguridad - IMPORTANTE

### ✅ Hacer en producción:
- ✅ Cambiar `JWT_SECRET` a un valor aleatorio largo (32+ caracteres)
- ✅ Usar contraseñas fuertes para `POSTGRES_PASSWORD`
- ✅ Configurar `CORS_ORIGIN` con tu dominio real
- ✅ Usar HTTPS en URLs de producción
- ✅ **NO commitear** el archivo `.env` a Git (está en `.gitignore`)

### ❌ NO hacer:
- ❌ Usar valores por defecto en producción
- ❌ Compartir el archivo `.env` de producción
- ❌ Commitear `.env` al repositorio
- ❌ Usar `localhost` en producción
- ❌ Dejar contraseñas débiles

## 📝 Checklist de Despliegue

Antes de desplegar en staging/producción:

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] `JWT_SECRET` cambiado a valor aleatorio seguro
- [ ] `POSTGRES_PASSWORD` cambiado a contraseña fuerte
- [ ] `POSTGRES_USER` actualizado (no usar 'postgres' en prod)
- [ ] `POSTGRES_DB` con nombre apropiado
- [ ] `CORS_ORIGIN` apunta al dominio correcto
- [ ] `NEXT_PUBLIC_API_URL` apunta a la API correcta
- [ ] Variables de puerto configuradas según infraestructura
- [ ] `.env` agregado a `.gitignore` (ya está incluido)
- [ ] Backup de `.env` en lugar seguro
- [ ] Equipo informado sobre ubicación de credenciales

## 🆘 Troubleshooting

### Error: "JWT_SECRET not defined"
**Solución**: Asegúrate que `.env` existe en la raíz y contiene `JWT_SECRET=...`

### Error: "Cannot connect to database"
**Solución**: Verifica que `DATABASE_URL` usa las credenciales correctas de `.env`

### Frontend no puede conectar al backend
**Solución**: Verifica que `NEXT_PUBLIC_API_URL` apunta a la URL correcta del backend

### Los cambios en .env no se aplican
**Solución**: 
```bash
docker compose down
docker compose up -d --build
```

## 📞 Soporte

Si necesitas ayuda con la configuración de variables de entorno, contacta al equipo de desarrollo.
