# 📦 Paquete de Despliegue - Sistema de Roles y Permisos

**Fecha**: 12 de Noviembre 2025  
**Versión**: 1.0  
**Sistema**: Escolastica - Sistema de Gestión Académica  
**Cambio**: Implementación de Roles Personalizados, Permisos Granulares y Asesorías Filosóficas

---

## 🎯 ¿Por Dónde Empezar?

### Opción 1: Despliegue Automático (RECOMENDADO) ⚡

Si quieres ejecutar todo el proceso de una sola vez:

```bash
cd docs_despliegue/20251112_despliegue
./deploy_all.sh
```

**Tiempo**: 26-33 minutos  
**Interacción**: Requiere algunas confirmaciones manuales  
**Ventaja**: Todo automatizado, manejo de errores incluido

---

### Opción 2: Paso a Paso Manual 🔧

Si prefieres control total de cada paso:

1. **Lee primero**: `QUICKSTART.md` (guía rápida)
2. **Ejecuta los scripts en orden**: `01_backup_database.sh` → `02_backup_files.sh` → ... → `12_health_check.sh`

**Tiempo**: 26-33 minutos  
**Interacción**: Control completo de cada paso  
**Ventaja**: Ideal para entender cada fase

---

### Opción 3: Solo Lectura 📖

Si primero quieres entender todo:

1. **Lee**: `README.md` (guía completa y detallada, 500+ líneas)
2. **Lee**: `QUICKSTART.md` (resumen ejecutivo)
3. **Luego elige**: Opción 1 (automático) u Opción 2 (manual)

---

## 📂 Estructura del Paquete

```
20251112_despliegue/
│
├── 📄 INDEX.md (este archivo)
│   └── Punto de entrada, empieza aquí
│
├── 📄 README.md (21 KB)
│   └── Guía COMPLETA de despliegue
│       - Prerrequisitos detallados
│       - 7 fases explicadas
│       - Procedimientos de rollback
│       - Troubleshooting extenso
│       - FAQ completo
│
├── 📄 QUICKSTART.md (8.6 KB)
│   └── Guía RÁPIDA de despliegue
│       - Resumen de cada script
│       - Comandos directos
│       - Troubleshooting básico
│       - Checklist
│
├── 🔧 deploy_all.sh (SCRIPT MAESTRO)
│   └── Ejecuta todos los pasos automáticamente
│       - Manejo de errores
│       - Resumen final
│       - Opción de continuar/abortar
│
├── ⬇️ FASE 1: PREPARACIÓN Y BACKUP
│   ├── 01_backup_database.sh (2.3 KB)
│   │   └── Backup completo de PostgreSQL
│   └── 02_backup_files.sh (2.2 KB)
│       └── Backup de código fuente
│
├── ⚙️ FASE 2: PREPARACIÓN DE SISTEMA
│   ├── 03_stop_services.sh (4.6 KB)
│   │   └── Detener servicios (Docker/PM2/Manual)
│   └── 04_verify_database.sh (4.9 KB)
│       └── Verificar BD pre-migración
│
├── 🗄️ FASE 3: MIGRACIÓN
│   ├── 05_run_migration.sh (5.1 KB)
│   │   └── Ejecutar migración (8 tablas, 21 permisos)
│   └── 06_verify_migration.sh (8.7 KB)
│       └── Verificación exhaustiva post-migración
│
├── 👥 FASE 4: ASIGNACIÓN DE ROLES
│   ├── 07_list_users_branches.sh (6.1 KB)
│   │   └── Listar usuarios, sucursales y roles
│   ├── 08_assign_admin_roles.sh (6.4 KB)
│   │   └── Asignación automática de roles
│   └── 09_assign_custom_roles.sql (5.7 KB)
│       └── Asignaciones manuales personalizadas
│
├── 🚀 FASE 5: INICIO DE SERVICIOS
│   ├── 10_start_backend.sh (7.1 KB)
│   │   └── Iniciar backend (Fastify)
│   └── 11_start_frontend.sh (8.1 KB)
│       └── Iniciar frontend (Next.js)
│
├── ✅ FASE 6: VERIFICACIÓN
│   └── 12_health_check.sh (12 KB)
│       └── Verificación completa del sistema
│
└── ⏪ FASE 7: ROLLBACK (si algo sale mal)
    └── 13_rollback_database.sh (9.8 KB)
        └── Revertir cambios de migración
```

**Total de archivos**: 16  
**Tamaño total**: ~148 KB  
**Scripts ejecutables**: 13 `.sh` + 1 `.sql`

---

## 🚀 Inicio Rápido (Para Expertos)

```bash
# 1. Ir al directorio
cd docs_despliegue/20251112_despliegue

# 2. Configurar variables de entorno
export POSTGRES_PASSWORD="tu_password_aqui"

# 3. Ejecutar despliegue automático
./deploy_all.sh

# 4. O ejecutar paso a paso
./01_backup_database.sh
./02_backup_files.sh
# ... y así sucesivamente
```

---

## ⚠️ Información Crítica

### Prerrequisitos OBLIGATORIOS

- ✅ Node.js 20+
- ✅ PostgreSQL 17 (con credenciales configuradas)
- ✅ npm/pnpm
- ✅ Git
- ✅ Acceso a servidor de producción
- ✅ Backup externo verificado

### Variables de Entorno Requeridas

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=escolastica_user
POSTGRES_DB=escolastica
POSTGRES_PASSWORD=<tu_password>  # ⚠️ REQUERIDO
```

### Tiempos Estimados

| Fase | Tiempo |
|------|--------|
| Fase 1: Backup | 6 min |
| Fase 2: Preparación | 2 min |
| Fase 3: Migración | 5 min |
| Fase 4: Roles | 6 min |
| Fase 5: Servicios | 5 min |
| Fase 6: Verificación | 2 min |
| **TOTAL** | **26-33 min** |

---

## 📊 ¿Qué se va a Desplegar?

### Backend (30+ endpoints nuevos)
- `/api/auth/*` - Login mejorado, forgot-password, reset-password
- `/api/users/*` - CRUD de usuarios con roles por sucursal
- `/api/roles/*` - Gestión de roles personalizados
- `/api/system/smtp/*` - Configuración SMTP
- `/api/counseling/*` - Asesorías filosóficas

### Base de Datos (8 tablas nuevas)
- `roles` - Roles del sistema
- `role_permissions` - Permisos por módulo
- `user_branch_roles` - Asignación usuario-sucursal-rol
- `philosophical_counseling` - Asesorías con datos históricos
- `system_config` - Configuración SMTP
- `password_reset_tokens` - Tokens para reset de password
- `users` - Modificada (añade email, email_verified)
- `branches` - Sin cambios estructurales

### Frontend (11 páginas nuevas)
- `/dashboard` - Rediseñado con panel admin
- `/admin` - Enabler con 4 módulos
- `/admin/branches` - Gestión de sucursales (completo)
- `/admin/users` - Gestión de usuarios (estructura)
- `/admin/roles` - Configuración de roles (estructura)
- `/admin/smtp` - Configuración SMTP (estructura)
- `/profile` - Perfil de usuario (estructura)
- `/forgot-password` - Solicitud de reset (estructura)
- `/reset-password` - Reset con token (estructura)
- + Componente de asesorías filosóficas

---

## 🆘 En Caso de Problemas

### Durante el Despliegue

1. **NO entres en pánico**
2. Lee el error cuidadosamente
3. Consulta `README.md` sección "Troubleshooting"
4. Si es crítico, ejecuta: `./13_rollback_database.sh`

### Después del Despliegue

1. Ejecuta health check: `./12_health_check.sh`
2. Si falla, revisa logs:
   - Backend: `docker-compose logs backend` o `tail -f logs/backend.log`
   - Frontend: `docker-compose logs frontend` o `tail -f logs/frontend.log`
3. Verifica que todos los servicios estén corriendo

### Opciones de Rollback

El script `13_rollback_database.sh` ofrece 3 opciones:
1. **Restaurar desde backup** (RECOMENDADO) - Revierte todo
2. **Eliminar tablas nuevas** - Mantiene datos existentes
3. **Rollback manual** - Control total

---

## 📞 Contacto y Soporte

- **Documentación técnica**: `docs_readme/IMPLEMENTACION_ROLES_PERMISOS.md`
- **Plan original**: `docs_readme/plan_sistema_roles_permisos_autenticacion.md`

---

## ✅ Checklist Pre-Despliegue

Antes de empezar, verifica:

- [ ] Leí `README.md` o `QUICKSTART.md`
- [ ] Tengo acceso al servidor de producción
- [ ] PostgreSQL está corriendo
- [ ] Tengo credenciales de base de datos
- [ ] Variables de entorno configuradas
- [ ] Backup externo realizado
- [ ] Tengo ~30 minutos de ventana de mantenimiento
- [ ] Notifiqué a usuarios del downtime
- [ ] Tengo plan de rollback listo

---

## 🎉 Post-Despliegue

Después de completar el despliegue:

1. ✅ Accede a http://localhost:5000 (o tu dominio)
2. ✅ Login con credenciales de admin
3. ✅ Verifica dashboard rediseñado
4. ✅ Accede a `/admin` y verifica módulos
5. ✅ Configura SMTP en `/admin/smtp`
6. ✅ Prueba reseteo de contraseña
7. ✅ Asigna roles adicionales si es necesario
8. ✅ Monitorea logs por 24 horas

---

## 📝 Notas del Desarrollador

> Este despliegue implementa un cambio arquitectónico importante:
> - De sistema con `user_type` fijo (admin/instructor/student)
> - A sistema con roles personalizables y permisos granulares por módulo
> - Un usuario puede tener diferentes roles en diferentes sucursales
> - Los permisos se evalúan por módulo (branches, students, courses, etc.)
> - El tipo 'admin' mantiene acceso total (bypass de permisos)

**Compatibilidad hacia atrás**: ✅ El sistema anterior seguirá funcionando. Los usuarios con `user_type='admin'` mantienen acceso completo. Los nuevos roles se aplican progresivamente.

---

**🚀 ¡Éxito en tu despliegue!**

Para cualquier duda, revisa `README.md` (guía completa) o `QUICKSTART.md` (guía rápida).
