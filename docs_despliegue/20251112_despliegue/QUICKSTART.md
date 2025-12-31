# 🚀 Guía Rápida de Despliegue

## ⚡ Ejecución Rápida (Despliegue Completo)

```bash
# 1. Ir al directorio de despliegue
cd docs_despliegue/20251112_despliegue

# 2. Ejecutar scripts en orden
./01_backup_database.sh      # Backup de BD (5 min)
./02_backup_files.sh          # Backup de archivos (1 min)
./03_stop_services.sh         # Detener servicios (1 min)
./04_verify_database.sh       # Verificar BD pre-migración (1 min)
./05_run_migration.sh         # Ejecutar migración (3 min)
./06_verify_migration.sh      # Verificar migración (2 min)
./07_list_users_branches.sh   # Listar usuarios y sucursales (2 min)
./08_assign_admin_roles.sh    # Asignar roles automáticamente (4 min)
./10_start_backend.sh         # Iniciar backend (2 min)
./11_start_frontend.sh        # Iniciar frontend (3 min)
./12_health_check.sh          # Verificación completa (2 min)
```

**Tiempo total estimado: 26-33 minutos**

---

## 📚 Scripts Disponibles

### Fase 1: Preparación y Backup

#### `01_backup_database.sh`
- **Propósito**: Crear backup completo de PostgreSQL
- **Tiempo**: ~5 minutos
- **Output**: `backups/backup_pre_roles_TIMESTAMP.dump`
- **Rollback**: Este backup se usará para revertir cambios

```bash
./01_backup_database.sh
```

#### `02_backup_files.sh`
- **Propósito**: Respaldar código fuente crítico
- **Tiempo**: ~1 minuto
- **Output**: `backups/backup_files_pre_roles_TIMESTAMP.tar.gz`
- **Incluye**: backend/src, src, package.json, .env

```bash
./02_backup_files.sh
```

---

### Fase 2: Preparación de Sistema

#### `03_stop_services.sh`
- **Propósito**: Detener todos los servicios (Docker, PM2, Node)
- **Tiempo**: ~1 minuto
- **Verifica**: Puertos 3000, 5000, 5432, 6379

```bash
./03_stop_services.sh
```

#### `04_verify_database.sh`
- **Propósito**: Verificar estado actual de la BD
- **Tiempo**: ~1 minuto
- **Verifica**:
  - Conexión a PostgreSQL
  - Tablas existentes
  - Que NO existan tablas de roles (pre-migración)
  - Usuarios y sucursales disponibles

```bash
./04_verify_database.sh
```

---

### Fase 3: Migración

#### `05_run_migration.sh`
- **Propósito**: Ejecutar migración de roles y permisos
- **Tiempo**: ~3 minutos
- **Acciones**:
  - Crea 8 nuevas tablas
  - Añade columnas a `users` (email, email_verified)
  - Inserta 3 roles base
  - Inserta 21 permisos
  - Asigna emails temporales a usuarios sin email

```bash
./05_run_migration.sh
```

**⚠️ Requiere confirmación manual**

#### `06_verify_migration.sh`
- **Propósito**: Verificación exhaustiva post-migración
- **Tiempo**: ~2 minutos
- **Verifica**:
  - 8 nuevas tablas creadas
  - Columnas en `users`
  - 3 roles base
  - 21 permisos
  - Índices y constraints
  - Integridad referencial

```bash
./06_verify_migration.sh
```

---

### Fase 4: Asignación de Roles

#### `07_list_users_branches.sh`
- **Propósito**: Listar usuarios, sucursales y roles para planificar asignaciones
- **Tiempo**: ~2 minutos
- **Output**:
  - Tabla de sucursales
  - Tabla de usuarios con sus tipos
  - Roles disponibles
  - Roles ya asignados
  - Estadísticas

```bash
./07_list_users_branches.sh
```

**Exports**: 
- `/tmp/escolastica_users.txt`
- `/tmp/escolastica_branches.txt`
- `/tmp/escolastica_roles.txt`

#### `08_assign_admin_roles.sh`
- **Propósito**: Asignación automática de roles basada en `user_type`
- **Tiempo**: ~4 minutos
- **Lógica**:
  - `user_type='admin'` → Rol "Admin" en su sucursal
  - `user_type='instructor'` → Rol "Instructor" en su sucursal
  - `user_type='student'` → Sin asignación (no necesitan acceso al sistema)

```bash
./08_assign_admin_roles.sh
```

**⚠️ Requiere confirmación manual**

#### `09_assign_custom_roles.sql`
- **Propósito**: Script SQL para asignaciones manuales personalizadas
- **Uso**: Editar y ejecutar para casos especiales
- **Ejemplos incluidos**:
  - Asignar rol específico a usuario
  - Asignar múltiples roles
  - Usuario con diferentes roles en diferentes sucursales
  - Remover asignaciones

```bash
# Editar según necesidades
nano 09_assign_custom_roles.sql

# Ejecutar
psql -U escolastica_user -d escolastica -f 09_assign_custom_roles.sql
```

---

### Fase 5: Inicio de Servicios

#### `10_start_backend.sh`
- **Propósito**: Iniciar backend (Fastify)
- **Tiempo**: ~2 minutos
- **Soporta**:
  - Docker Compose
  - PM2
  - Inicio manual (dev o producción)
- **Verifica**:
  - Dependencias npm
  - Variables de entorno
  - Conexión a PostgreSQL y Redis
  - Health check endpoint

```bash
./10_start_backend.sh
```

#### `11_start_frontend.sh`
- **Propósito**: Iniciar frontend (Next.js)
- **Tiempo**: ~3 minutos
- **Soporta**:
  - Docker Compose
  - PM2
  - Inicio manual (dev o producción)
- **Verifica**:
  - Dependencias npm
  - Build de Next.js
  - Variables de entorno
  - Backend accesible

```bash
./11_start_frontend.sh
```

**Modo manual**: Pregunta si iniciar en desarrollo o producción

---

### Fase 6: Verificación

#### `12_health_check.sh`
- **Propósito**: Verificación completa del sistema
- **Tiempo**: ~2 minutos
- **Tests**:
  1. **Infraestructura**: PostgreSQL, Redis
  2. **Backend**: Health, Auth, Nuevos endpoints
  3. **Frontend**: Páginas principales, Dashboard, Admin
  4. **Integración**: Test de login real
  5. **Datos**: Roles, permisos, usuarios con roles
  6. **Procesos**: Backend y Frontend corriendo

```bash
./12_health_check.sh
```

**Exit codes**:
- `0`: Todo OK
- `1`: Errores críticos

---

### Fase 7: Rollback (Si algo sale mal)

#### `13_rollback_database.sh`
- **Propósito**: Revertir cambios de migración
- **Tiempo**: ~10 minutos
- **Opciones**:
  1. **Restaurar desde backup** (RECOMENDADO)
     - Restaura BD completa al estado pre-migración
  2. **Eliminar tablas nuevas**
     - Mantiene datos existentes
     - Solo elimina tablas y columnas añadidas
  3. **Rollback manual**
     - Muestra comandos SQL para ejecutar manualmente

```bash
./13_rollback_database.sh
```

**⚠️⚠️⚠️ CUIDADO**: Requiere múltiples confirmaciones

---

## 🔧 Variables de Entorno

Los scripts usan estas variables (con defaults):

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=escolastica_user
POSTGRES_DB=escolastica
POSTGRES_PASSWORD=<requerido>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
BACKEND_URL=http://localhost:3000

# Frontend
FRONTEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Configura antes de ejecutar**:
```bash
export POSTGRES_PASSWORD="tu_password"
```

---

## 🚨 Troubleshooting Rápido

### Error: "No se puede conectar a PostgreSQL"
```bash
# Verificar que PostgreSQL esté corriendo
systemctl status postgresql
# o
docker-compose ps postgres

# Verificar puerto
lsof -i:5432
```

### Error: "Puerto 3000/5000 en uso"
```bash
# Liberar puerto
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Error: "Migración ya ejecutada"
```bash
# Verificar tabla roles
psql -U escolastica_user -d escolastica -c "SELECT * FROM roles;"

# Si existe, ya fue ejecutada
# Opción 1: Continuar sin re-migrar
# Opción 2: Rollback y volver a ejecutar
```

### Error: "Backend no responde"
```bash
# Ver logs según método
docker-compose logs -f backend    # Docker
pm2 logs escolastica-backend      # PM2
tail -f logs/backend.log          # Manual

# Verificar puerto
curl http://localhost:3000/health
```

### Error: "Frontend no carga"
```bash
# Ver logs según método
docker-compose logs -f frontend    # Docker
pm2 logs escolastica-frontend      # PM2
tail -f logs/frontend.log          # Manual

# Verificar build
ls -la .next/

# Rebuild si es necesario
npm run build
```

---

## ✅ Checklist de Despliegue

Usa este checklist para no olvidar pasos:

- [ ] Backups creados (01, 02)
- [ ] Servicios detenidos (03)
- [ ] Base de datos verificada (04)
- [ ] Migración ejecutada (05)
- [ ] Migración verificada (06)
- [ ] Usuarios y sucursales listados (07)
- [ ] Roles asignados (08)
- [ ] Backend iniciado (10)
- [ ] Frontend iniciado (11)
- [ ] Health check pasado (12)
- [ ] Sistema accesible en http://localhost:5000
- [ ] Login funcional
- [ ] Dashboard visible
- [ ] Panel admin accesible

---

## 📞 Soporte

Si encuentras problemas:

1. **Consulta README.md principal** en esta carpeta para guía completa
2. **Revisa logs** de servicios
3. **Ejecuta health check**: `./12_health_check.sh`
4. **Considera rollback** si hay errores críticos: `./13_rollback_database.sh`

---

## 📖 Documentación Completa

Ver `README.md` en este directorio para:
- Explicación detallada de cada fase
- Arquitectura de cambios
- Consideraciones de seguridad
- Procedimientos de monitoreo
- FAQ extendido

---

**Última actualización**: 12 de Noviembre 2025  
**Versión**: 1.0  
**Tiempo total**: 26-33 minutos
