# 🚀 GUÍA DE DESPLIEGUE - Sistema de Roles y Permisos

**Fecha:** 12 de Noviembre de 2025  
**Versión:** 2.0.0  
**Responsable:** Experto en Despliegue  
**Tiempo estimado:** 30-45 minutos  
**Nivel de riesgo:** 🟡 MEDIO (Requiere migración de BD y puede romper sesiones activas)

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Pre-requisitos](#pre-requisitos)
3. [Backup y Seguridad](#backup-y-seguridad)
4. [Pasos de Despliegue](#pasos-de-despliegue)
5. [Validación Post-Despliegue](#validación-post-despliegue)
6. [Rollback](#rollback)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué se está desplegando?

Sistema completo de **Roles y Permisos Personalizables** que incluye:

- ✅ 8 nuevas tablas en base de datos
- ✅ 2 tablas existentes modificadas
- ✅ 30+ nuevos endpoints API
- ✅ Sistema de reseteo de contraseña por email
- ✅ Asesorías filosóficas con datos históricos
- ✅ Dashboard rediseñado
- ✅ Panel de administrador completo

### Cambios Críticos

⚠️ **IMPORTANTE:**
1. **Base de datos**: Requiere ejecutar migración SQL (añade 8 tablas, modifica 2)
2. **Usuarios existentes**: Se les asignará email temporal `username@temp.escolastica.local`
3. **Sesiones activas**: Pueden romperse, usuarios deberán volver a loguearse
4. **Nueva dependencia**: `nodemailer` (se instala en este proceso)

### Impacto en Usuarios

- 🟢 **Sin downtime** si se sigue el proceso correctamente
- 🟡 **Re-login requerido** para todos los usuarios después del despliegue
- 🟢 **Funcionalidad existente** se mantiene intacta
- 🟢 **Nuevas funcionalidades** disponibles inmediatamente

---

## ✅ PRE-REQUISITOS

### 1. Accesos Requeridos

- [ ] Acceso SSH al servidor
- [ ] Credenciales de PostgreSQL con permisos de DDL (CREATE TABLE, ALTER TABLE)
- [ ] Acceso al repositorio Git (rama: `feature/cambios-9-noviembre-revision`)
- [ ] Acceso a Docker / Docker Compose (si aplica)

### 2. Herramientas Necesarias

```bash
# Verificar instalaciones
node --version    # >= 18.0.0
npm --version     # >= 9.0.0
psql --version    # >= 14.0
docker --version  # >= 20.0 (si aplica)
git --version     # >= 2.0
```

### 3. Variables de Entorno (Opcionales)

Si se desea configurar SMTP desde el inicio:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sistema@escolastica.com
SMTP_PASSWORD=tu_password_de_aplicacion
SMTP_FROM_NAME=Sistema Escolástica
```

### 4. Documentación a Revisar

- [ ] `IMPLEMENTACION_ROLES_PERMISOS.md` - Resumen técnico
- [ ] `plan_sistema_roles_permisos_autenticacion.md` - Plan completo
- [ ] Este documento (README.md) - Guía de despliegue

---

## 💾 BACKUP Y SEGURIDAD

### ⚠️ CRÍTICO - BACKUP ANTES DE CONTINUAR

**NUNCA continúes sin un backup completo y verificado.**

### 1. Backup de Base de Datos

```bash
# Ejecutar script de backup automático
./01_backup_database.sh

# O manualmente:
pg_dump -U escolastica_user -d escolastica -F c -f backup_pre_roles_$(date +%Y%m%d_%H%M%S).dump

# Verificar que el backup se creó
ls -lh backup_pre_roles_*.dump
```

### 2. Backup de Archivos del Sistema

```bash
# Ejecutar script de backup de archivos
./02_backup_files.sh

# O manualmente:
tar -czf backup_escolastica_$(date +%Y%m%d_%H%M%S).tar.gz \
  /ruta/al/proyecto/escolastica \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist
```

### 3. Verificar Backups

```bash
# Verificar integridad del backup de BD
pg_restore -l backup_pre_roles_*.dump | head -20

# Verificar backup de archivos
tar -tzf backup_escolastica_*.tar.gz | head -20
```

### 4. Guardar Backups en Ubicación Segura

```bash
# Copiar a ubicación segura
cp backup_*.dump /ruta/segura/backups/
cp backup_*.tar.gz /ruta/segura/backups/

# O subir a S3/Cloud Storage
# aws s3 cp backup_*.dump s3://mi-bucket/backups/
```

---

## 🚀 PASOS DE DESPLIEGUE

### FASE 1: Preparación del Entorno

#### 1.1 Detener Servicios (Mantenimiento)

```bash
# Ejecutar script
./03_stop_services.sh

# O manualmente con Docker:
docker-compose stop frontend backend

# O con PM2:
pm2 stop backend
pm2 stop frontend

# O con systemd:
sudo systemctl stop escolastica-backend
sudo systemctl stop escolastica-frontend
```

**⏱️ Duración estimada:** 1 minuto

#### 1.2 Actualizar Código desde Git

```bash
# Navegar al directorio del proyecto
cd /ruta/al/proyecto/escolastica

# Verificar rama actual
git branch

# Cambiar a la rama del despliegue
git fetch origin
git checkout feature/cambios-9-noviembre-revision
git pull origin feature/cambios-9-noviembre-revision

# Verificar que se descargaron los cambios
git log -5 --oneline
```

**⏱️ Duración estimada:** 2 minutos

**✅ Verificación:**
```bash
# Verificar que existen los nuevos archivos
ls -la backend/src/routes/users.ts
ls -la backend/src/routes/roles.ts
ls -la backend/src/middleware/checkPermission.ts
ls -la backend/src/db/migrations/0001_add_roles_permissions_system.sql
```

### FASE 2: Backend - Instalación de Dependencias

#### 2.1 Instalar Nodemailer

```bash
cd backend

# Instalar nodemailer
npm install nodemailer @types/nodemailer

# Verificar instalación
npm list nodemailer
```

**⏱️ Duración estimada:** 1 minuto

**✅ Verificación:**
```bash
# Debe mostrar la versión instalada
npm list nodemailer | grep nodemailer
# Salida esperada: nodemailer@6.9.7 o superior
```

### FASE 3: Base de Datos - Migración

⚠️ **CRÍTICO:** Esta es la parte más importante del despliegue.

#### 3.1 Verificar Conexión a Base de Datos

```bash
# Ejecutar script de verificación
./04_verify_database.sh

# O manualmente:
psql -U escolastica_user -d escolastica -c "SELECT version();"
```

**✅ Verificación:** Debe mostrar la versión de PostgreSQL sin errores.

#### 3.2 Ejecutar Migración SQL

**Opción A - Con script automatizado (RECOMENDADO):**

```bash
# Ejecutar desde la raíz del proyecto
./05_run_migration.sh
```

**Opción B - Manualmente:**

```bash
cd backend

# Ejecutar migración
psql -U escolastica_user -d escolastica -f src/db/migrations/0001_add_roles_permissions_system.sql

# O si usas variables de entorno:
psql $DATABASE_URL -f src/db/migrations/0001_add_roles_permissions_system.sql
```

**⏱️ Duración estimada:** 2-3 minutos

**✅ Verificación Crítica:**

```bash
# Ejecutar script de verificación
./06_verify_migration.sh

# O manualmente verificar las nuevas tablas:
psql -U escolastica_user -d escolastica <<EOF
-- Verificar tablas nuevas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'role_permissions', 'user_branch_roles', 
                    'philosophical_counseling', 'system_config', 'password_reset_tokens')
ORDER BY table_name;

-- Verificar roles seed
SELECT id, name, is_system_role FROM roles ORDER BY name;

-- Verificar permisos seed (debe haber ~21 registros)
SELECT COUNT(*) as total_permissions FROM role_permissions;

-- Verificar columnas nuevas en users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('full_name', 'email', 'phone', 'user_type');

-- Verificar columna nueva en branches
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'branches' 
AND column_name = 'active';
EOF
```

**📊 Resultado Esperado:**

```
-- Tablas nuevas (6):
password_reset_tokens
philosophical_counseling
role_permissions
roles
system_config
user_branch_roles

-- Roles seed (3):
Administrador (is_system_role: true)
Consultor     (is_system_role: false)
Instructor    (is_system_role: false)

-- Total permisos: 21
-- Columnas users: full_name, email, phone, user_type
-- Columna branches: active
```

### FASE 4: Asignar Roles a Usuarios Existentes

⚠️ **IMPORTANTE:** Los usuarios necesitan roles asignados para acceder al sistema.

#### 4.1 Listar Usuarios y Filiales Existentes

```bash
# Ejecutar script
./07_list_users_branches.sh

# O manualmente:
psql -U escolastica_user -d escolastica <<EOF
-- Ver usuarios existentes
SELECT id, username, email, user_type FROM users ORDER BY username;

-- Ver filiales existentes
SELECT id, name, code FROM branches ORDER BY name;

-- Ver roles disponibles
SELECT id, name FROM roles ORDER BY name;
EOF
```

#### 4.2 Asignar Roles

**Opción A - Script Automatizado para Admin Principal:**

```bash
# Asigna rol Administrador al usuario 'admin' en todas las filiales
./08_assign_admin_roles.sh
```

**Opción B - Manual (Personalizado):**

```bash
# Editar y ejecutar el script SQL
nano 09_assign_custom_roles.sql

# Ejecutar
psql -U escolastica_user -d escolastica -f 09_assign_custom_roles.sql
```

**Ejemplo de asignación manual:**

```sql
-- Asignar rol Administrador a usuario admin en todas las filiales
INSERT INTO user_branch_roles (user_id, branch_id, role_id)
SELECT 
  (SELECT id FROM users WHERE username = 'admin'),
  b.id,
  (SELECT id FROM roles WHERE name = 'Administrador')
FROM branches b
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- Asignar rol Instructor a un usuario específico en filial específica
INSERT INTO user_branch_roles (user_id, branch_id, role_id)
VALUES (
  (SELECT id FROM users WHERE username = 'instructor1'),
  (SELECT id FROM branches WHERE code = 'LIM-001'),
  (SELECT id FROM roles WHERE name = 'Instructor')
)
ON CONFLICT (user_id, branch_id) DO NOTHING;
```

**⏱️ Duración estimada:** 3-5 minutos

**✅ Verificación:**

```bash
psql -U escolastica_user -d escolastica <<EOF
-- Ver asignaciones creadas
SELECT 
  u.username,
  b.name as branch_name,
  r.name as role_name,
  ubr.assigned_at
FROM user_branch_roles ubr
JOIN users u ON ubr.user_id = u.id
JOIN branches b ON ubr.branch_id = b.id
JOIN roles r ON ubr.role_id = r.id
ORDER BY u.username, b.name;
EOF
```

### FASE 5: Backend - Compilación y Reinicio

#### 5.1 Compilar Backend (si usa TypeScript compilado)

```bash
cd backend

# Limpiar dist anterior
rm -rf dist

# Compilar
npm run build

# Verificar compilación
ls -la dist/
```

**⏱️ Duración estimada:** 2 minutos

#### 5.2 Iniciar Backend

```bash
# Ejecutar script
cd ..
./10_start_backend.sh

# O con Docker:
docker-compose up -d backend

# O con PM2:
cd backend
pm2 start npm --name "escolastica-backend" -- start

# O con systemd:
sudo systemctl start escolastica-backend
```

**⏱️ Duración estimada:** 30 segundos

**✅ Verificación:**

```bash
# Verificar que el servicio está corriendo
docker-compose ps backend
# O
pm2 list
# O
sudo systemctl status escolastica-backend

# Verificar logs (NO debe haber errores críticos)
docker-compose logs -f backend --tail=50
# O
pm2 logs backend --lines 50
```

**🔍 Buscar en logs:**
- ✅ "Server running at http://..."
- ✅ "Connected to Redis" (puede mostrar warning si Redis no está activo, es OK)
- ❌ NO debe haber errores de conexión a BD
- ❌ NO debe haber errores de módulos faltantes

### FASE 6: Frontend - Reinstalación y Reinicio

#### 6.1 Reinstalar Dependencias Frontend (Precaución)

```bash
cd frontend  # o la raíz si Next.js está en raíz

# Limpiar caché
rm -rf .next
rm -rf node_modules/.cache

# Reinstalar (solo si es necesario)
# npm ci
```

**⏱️ Duración estimada:** 1 minuto

#### 6.2 Compilar Frontend (Producción)

```bash
# Si es Next.js
npm run build

# Verificar build
ls -la .next/
```

**⏱️ Duración estimada:** 2-3 minutos

#### 6.3 Iniciar Frontend

```bash
# Ejecutar script
cd ..
./11_start_frontend.sh

# O con Docker:
docker-compose up -d frontend

# O con PM2:
cd frontend
pm2 start npm --name "escolastica-frontend" -- start

# O con systemd:
sudo systemctl start escolastica-frontend
```

**⏱️ Duración estimada:** 30 segundos

**✅ Verificación:**

```bash
# Verificar que el servicio está corriendo
docker-compose ps
# O
pm2 list

# Verificar logs
docker-compose logs -f frontend --tail=50
# O
pm2 logs frontend --lines 50
```

### FASE 7: Verificar Servicios Completos

```bash
# Ejecutar script de health check
./12_health_check.sh

# O manualmente:
curl http://localhost:3000/health
# Debe responder: {"status":"ok","timestamp":"..."}

curl http://localhost:5000/
# Debe responder con HTML de la app
```

**⏱️ Duración estimada:** 1 minuto

---

## ✅ VALIDACIÓN POST-DESPLIEGUE

### Test 1: Health Check de API

```bash
curl -X GET http://localhost:3000/health
```

**✅ Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T..."
}
```

### Test 2: Login y Respuesta con Roles

```bash
# Test de login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "tu_password"
  }'
```

**✅ Respuesta esperada debe incluir:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "username": "admin",
    "fullName": null,
    "email": "admin@temp.escolastica.local",
    "userType": "normal"
  },
  "branches": [
    {
      "id": "...",
      "name": "Sede Lima",
      "code": "LIM-001",
      "roleId": "...",
      "roleName": "Administrador",
      "permissions": {
        "students": { "canView": true, "canCreate": true, ... }
      }
    }
  ]
}
```

### Test 3: Endpoints de Roles

```bash
# Obtener token del test anterior
TOKEN="tu_token_jwt"

# Listar roles
curl -X GET http://localhost:3000/api/roles \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Respuesta esperada:**
```json
{
  "roles": [
    {
      "id": "...",
      "name": "Administrador",
      "description": "Acceso completo al sistema",
      "isSystemRole": true
    },
    {
      "id": "...",
      "name": "Instructor",
      "description": "Gestiona grupos y asistencias",
      "isSystemRole": false
    },
    {
      "id": "...",
      "name": "Consultor",
      "description": "Acceso de solo lectura",
      "isSystemRole": false
    }
  ]
}
```

### Test 4: Verificar Frontend

1. **Abrir navegador:** http://localhost:5000/login
2. **Iniciar sesión** con usuario admin
3. **Verificar dashboard:**
   - ✅ Debe mostrar "PANEL DE ADMINISTRADOR" en primera fila (si es admin)
   - ✅ Debe mostrar filiales asignadas
   - ✅ Toggle "Mostrar filiales inactivas" debe estar visible
   - ✅ Botones de vista (Grid/Lista/Tabla) deben funcionar
4. **Click en Panel de Administrador:**
   - ✅ Debe mostrar 4 módulos (Filiales, Usuarios, Roles, SMTP)
5. **Click en Gestión de Filiales:**
   - ✅ Debe mostrar CRUD funcional de filiales

### Test 5: Verificar Middleware de Permisos

```bash
# Intentar acceder a endpoint protegido sin permisos
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer token_de_usuario_sin_permisos"
```

**✅ Respuesta esperada (si no tiene permisos):**
```json
{
  "error": "No tienes permiso para esta acción"
}
```

**Status esperado:** 403 Forbidden

---

## 🔄 ROLLBACK

### ⚠️ Cuándo hacer Rollback

- Error crítico en migración de BD
- Servicios no inician correctamente
- Usuarios no pueden hacer login
- Errores masivos en logs

### Proceso de Rollback

#### 1. Detener Servicios

```bash
./03_stop_services.sh
```

#### 2. Restaurar Base de Datos

```bash
# Restaurar desde backup
./13_rollback_database.sh

# O manualmente:
psql -U escolastica_user -d escolastica -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pg_restore -U escolastica_user -d escolastica backup_pre_roles_*.dump
```

**⏱️ Duración estimada:** 3-5 minutos

#### 3. Revertir Código

```bash
# Volver a rama anterior
git checkout main  # o la rama estable anterior
git pull

# Reinstalar dependencias de la versión anterior
cd backend && npm install
cd ../frontend && npm install
```

#### 4. Reiniciar Servicios

```bash
./10_start_backend.sh
./11_start_frontend.sh
```

#### 5. Verificar Rollback Exitoso

```bash
./12_health_check.sh

# Verificar que funciona login antiguo
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tu_password"}'
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: Error al Ejecutar Migración

**Síntoma:**
```
ERROR:  column "email" of relation "users" already exists
```

**Solución:**
```bash
# La columna ya existe, verificar manualmente
psql -U escolastica_user -d escolastica -c "SELECT email FROM users LIMIT 1;"

# Si funciona, continuar con el resto de la migración
# Editar el SQL y comentar la línea que falla
```

### Problema 2: Backend No Inicia - Módulo No Encontrado

**Síntoma:**
```
Error: Cannot find module 'nodemailer'
```

**Solución:**
```bash
cd backend
npm install nodemailer @types/nodemailer
npm run build
./10_start_backend.sh
```

### Problema 3: Usuarios No Pueden Hacer Login

**Síntoma:**
```json
{"error": "Invalid credentials"}
```

**Diagnóstico:**
```bash
# Verificar que el usuario existe
psql -U escolastica_user -d escolastica -c "SELECT id, username, email FROM users WHERE username='admin';"

# Verificar que tiene roles asignados
psql -U escolastica_user -d escolastica <<EOF
SELECT u.username, COUNT(ubr.id) as roles_count
FROM users u
LEFT JOIN user_branch_roles ubr ON u.id = ubr.user_id
WHERE u.username = 'admin'
GROUP BY u.username;
EOF
```

**Solución:**
```bash
# Si no tiene roles asignados
./08_assign_admin_roles.sh
```

### Problema 4: Dashboard No Muestra Panel de Administrador

**Síntoma:** Usuario admin no ve el panel destacado

**Diagnóstico:**
```bash
# Verificar user_type en BD
psql -U escolastica_user -d escolastica -c "SELECT username, user_type FROM users WHERE username='admin';"
```

**Solución:**
```bash
# Si user_type es 'normal', actualizar a 'admin'
psql -U escolastica_user -d escolastica -c "UPDATE users SET user_type='admin' WHERE username='admin';"
```

### Problema 5: Error 500 en Endpoint de Roles

**Síntoma:**
```json
{"error": "Internal Server Error"}
```

**Diagnóstico:**
```bash
# Revisar logs del backend
docker-compose logs backend --tail=100 | grep ERROR
# O
pm2 logs backend --lines 100 | grep ERROR
```

**Soluciones comunes:**
- Verificar que todas las tablas fueron creadas
- Verificar que el middleware está correctamente importado
- Reiniciar backend completamente

### Problema 6: Frontend Muestra Página en Blanco

**Síntoma:** Pantalla blanca al cargar la app

**Diagnóstico:**
```bash
# Ver logs del frontend
docker-compose logs frontend --tail=100
# O revisar consola del navegador (F12)
```

**Solución:**
```bash
cd frontend
rm -rf .next
npm run build
docker-compose restart frontend
```

---

## 📞 CONTACTO Y SOPORTE

### Durante el Despliegue

Si encuentras problemas durante el despliegue:

1. **DETENER inmediatamente** y no continuar
2. **Documentar el error** (screenshot de logs)
3. **Contactar al equipo técnico**
4. **NO intentar soluciones no documentadas** sin supervisión

### Información para Soporte

Al reportar un problema, incluir:

- ✅ Paso exacto donde ocurrió el error
- ✅ Logs completos (últimas 100 líneas)
- ✅ Resultado de `./12_health_check.sh`
- ✅ Captura de pantalla del error
- ✅ Versión de PostgreSQL: `psql --version`
- ✅ Versión de Node: `node --version`

---

## 📊 CHECKLIST FINAL

Antes de dar por completado el despliegue:

### Backend
- [ ] Migración ejecutada sin errores
- [ ] 8 nuevas tablas creadas
- [ ] 3 roles seed creados (Administrador, Instructor, Consultor)
- [ ] 21 permisos seed creados
- [ ] nodemailer instalado
- [ ] Backend iniciado sin errores
- [ ] Health check responde OK
- [ ] Login retorna usuario + branches + roles

### Frontend
- [ ] Build completado sin errores
- [ ] Frontend iniciado sin errores
- [ ] Dashboard carga correctamente
- [ ] Panel Admin visible para admins
- [ ] Toggle y vistas funcionan
- [ ] Navegación entre páginas funciona

### Base de Datos
- [ ] Backup creado y verificado
- [ ] Migración completada 100%
- [ ] Usuarios tienen emails asignados
- [ ] Al menos un usuario tiene roles asignados
- [ ] Verificación de tablas exitosa

### Validación
- [ ] Test 1: Health Check ✅
- [ ] Test 2: Login con roles ✅
- [ ] Test 3: Endpoint /api/roles ✅
- [ ] Test 4: Frontend dashboard ✅
- [ ] Test 5: Middleware permisos ✅

---

## ⏱️ TIEMPO TOTAL ESTIMADO

| Fase | Duración | Acumulado |
|------|----------|-----------|
| Preparación y Backup | 5 min | 5 min |
| Detener servicios | 1 min | 6 min |
| Actualizar código | 2 min | 8 min |
| Instalar dependencias | 1 min | 9 min |
| Ejecutar migración | 3 min | 12 min |
| Asignar roles | 4 min | 16 min |
| Compilar backend | 2 min | 18 min |
| Iniciar backend | 1 min | 19 min |
| Compilar frontend | 3 min | 22 min |
| Iniciar frontend | 1 min | 23 min |
| Validación completa | 10 min | 33 min |
| **TOTAL** | **33 min** | - |

⏰ **Con contingencias:** 45 minutos máximo

---

## 🎉 POST-DESPLIEGUE

### Comunicar a Usuarios

Una vez completado el despliegue exitosamente:

1. **Notificar** que el sistema está nuevamente disponible
2. **Informar** que deben volver a iniciar sesión
3. **Comunicar** nuevas funcionalidades disponibles:
   - Panel de administrador (solo admins)
   - Dashboard con vistas personalizables
   - Sistema de permisos por rol

### Monitoreo Post-Despliegue

Durante las primeras 24 horas:

- ✅ Monitorear logs constantemente
- ✅ Verificar uso de memoria y CPU
- ✅ Revisar quejas de usuarios
- ✅ Validar que todos los módulos funcionan

---

**Documento creado:** 12 de Noviembre de 2025  
**Última actualización:** 12 de Noviembre de 2025  
**Versión:** 1.0.0
