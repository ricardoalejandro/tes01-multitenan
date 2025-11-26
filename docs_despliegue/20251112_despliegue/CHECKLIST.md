# ✅ CHECKLIST DE DESPLIEGUE - Sistema de Roles y Permisos

**Fecha**: _______________  
**Responsable**: _______________  
**Inicio**: _______________  
**Fin**: _______________  

---

## 📋 PRE-DESPLIEGUE

### Verificaciones Iniciales
- [ ] Leí `INDEX.md` (punto de entrada)
- [ ] Leí `README.md` (guía completa) O `QUICKSTART.md` (guía rápida)
- [ ] Tengo acceso SSH al servidor de producción
- [ ] Tengo credenciales de PostgreSQL
- [ ] Tengo credenciales de usuario admin del sistema

### Configuración de Entorno
- [ ] Variables de entorno configuradas:
  - [ ] `POSTGRES_HOST` _______________
  - [ ] `POSTGRES_PORT` _______________
  - [ ] `POSTGRES_USER` _______________
  - [ ] `POSTGRES_DB` _______________
  - [ ] `POSTGRES_PASSWORD` ✓ (configurado)
  - [ ] `REDIS_HOST` (opcional) _______________
  - [ ] `REDIS_PORT` (opcional) _______________

### Verificación de Servicios
- [ ] PostgreSQL está corriendo: `psql -U escolastica_user -d escolastica -c "SELECT 1"`
- [ ] Puedo conectarme a la base de datos
- [ ] Node.js versión 20+: `node --version` → _______________
- [ ] npm instalado: `npm --version` → _______________
- [ ] Tengo permisos de ejecución en scripts: `chmod +x *.sh`

### Preparación
- [ ] Notifiqué a usuarios sobre ventana de mantenimiento
- [ ] Tiempo estimado: 30 minutos - Inicio: _______ Fin esperado: _______
- [ ] Tengo backup externo guardado fuera del servidor
- [ ] Documenté el estado actual del sistema

---

## 🚀 EJECUCIÓN DEL DESPLIEGUE

### Opción A: Despliegue Automático (RECOMENDADO)
- [ ] Ejecuté: `./deploy_all.sh`
- [ ] Script completado sin errores
- [ ] Revisé el resumen final del script

### Opción B: Despliegue Manual (Paso a Paso)

#### FASE 1: BACKUP (CRÍTICO)
- [ ] **01_backup_database.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Backup creado en: `backups/backup_pre_roles_TIMESTAMP.dump`
  - [ ] Tamaño del backup: _______ MB
  - [ ] Backup verificado (integridad OK)
  - [ ] Backup copiado a ubicación externa: _______________

- [ ] **02_backup_files.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Backup creado en: `backups/backup_files_pre_roles_TIMESTAMP.tar.gz`
  - [ ] Tamaño del backup: _______ MB
  - [ ] Backup copiado a ubicación externa: _______________

#### FASE 2: PREPARACIÓN
- [ ] **03_stop_services.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Servicios detenidos:
    - [ ] Backend (puerto 3000 libre)
    - [ ] Frontend (puerto 5000 libre)
    - [ ] Docker Compose (si aplica)
    - [ ] PM2 (si aplica)

- [ ] **04_verify_database.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Conexión a PostgreSQL: OK
  - [ ] Total de tablas actuales: _______
  - [ ] Tablas de roles NO existen: ✓ (correcto para pre-migración)
  - [ ] Total usuarios: _______
  - [ ] Total sucursales: _______
  - [ ] Advertencias (si hay): _______________

#### FASE 3: MIGRACIÓN (CRÍTICO)
- [ ] **05_run_migration.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Confirmación manual proporcionada: ✓
  - [ ] Migración completada sin errores
  - [ ] 8 nuevas tablas creadas
  - [ ] Columnas añadidas a `users` (email, email_verified)
  - [ ] 3 roles base insertados
  - [ ] 21 permisos insertados

- [ ] **06_verify_migration.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Total de tests: _______
  - [ ] Tests pasados: _______
  - [ ] Errores: _______ (debe ser 0)
  - [ ] Advertencias: _______
  - [ ] Verificaciones exitosas:
    - [ ] Tabla `roles` existe con 3 registros
    - [ ] Tabla `role_permissions` existe con 21 registros
    - [ ] Tabla `user_branch_roles` existe
    - [ ] Tabla `philosophical_counseling` existe
    - [ ] Tabla `system_config` existe
    - [ ] Tabla `password_reset_tokens` existe
    - [ ] Columnas `email` y `email_verified` en `users`
    - [ ] Índices creados
    - [ ] Foreign keys creadas

#### FASE 4: ASIGNACIÓN DE ROLES
- [ ] **07_list_users_branches.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Total usuarios listados: _______
  - [ ] Total sucursales listadas: _______
  - [ ] Total roles disponibles: 3
  - [ ] Usuarios sin roles: _______
  - [ ] Archivos exportados:
    - [ ] `/tmp/escolastica_users.txt`
    - [ ] `/tmp/escolastica_branches.txt`
    - [ ] `/tmp/escolastica_roles.txt`

- [ ] **08_assign_admin_roles.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Confirmación manual proporcionada: ✓
  - [ ] Usuarios con roles ANTES: _______
  - [ ] Usuarios con roles AHORA: _______
  - [ ] Nuevas asignaciones: _______
  - [ ] Usuarios tipo 'admin' asignados al rol Admin: _______
  - [ ] Usuarios tipo 'instructor' asignados al rol Instructor: _______
  - [ ] Usuarios sin roles restantes: _______

- [ ] **09_assign_custom_roles.sql** (OPCIONAL)
  - [ ] ¿Se requirieron asignaciones manuales? Sí [ ] No [ ]
  - [ ] Archivo editado y ejecutado: ✓
  - [ ] Asignaciones personalizadas realizadas: _______

#### FASE 5: INICIO DE SERVICIOS
- [ ] **10_start_backend.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Método de inicio: Docker [ ] PM2 [ ] Manual [ ]
  - [ ] Backend corriendo en puerto 3000: ✓
  - [ ] Health check OK: `curl http://localhost:3000/health`
  - [ ] Respuesta health: _______________
  - [ ] Logs sin errores críticos

- [ ] **11_start_frontend.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Método de inicio: Docker [ ] PM2 [ ] Manual [ ]
  - [ ] Modo: Desarrollo [ ] Producción [ ]
  - [ ] Frontend corriendo en puerto 5000: ✓
  - [ ] Frontend responde: `curl http://localhost:5000`
  - [ ] Logs sin errores críticos

#### FASE 6: VERIFICACIÓN
- [ ] **12_health_check.sh**
  - [ ] Ejecutado: ✓
  - [ ] Tiempo: _______ min
  - [ ] Total de tests ejecutados: _______
  - [ ] Tests pasados: _______
  - [ ] Errores: _______ (debe ser 0)
  - [ ] Advertencias: _______
  - [ ] Verificaciones exitosas:
    - [ ] PostgreSQL accesible
    - [ ] Redis accesible (opcional)
    - [ ] Backend health endpoint OK
    - [ ] Backend auth endpoints protegidos (401)
    - [ ] Nuevos endpoints accesibles
    - [ ] Frontend accesible
    - [ ] Página de login accesible
    - [ ] Dashboard accesible
    - [ ] Páginas de admin accesibles
    - [ ] 3 roles en base de datos
    - [ ] 21 permisos en base de datos
    - [ ] Usuarios con roles asignados: _______
    - [ ] Todos los usuarios tienen email

---

## ✅ POST-DESPLIEGUE

### Verificación Funcional Manual
- [ ] Accedí a: http://localhost:5000 (o dominio de producción)
- [ ] Login con credenciales de admin: Usuario: _______ ✓
- [ ] Dashboard rediseñado visible
- [ ] Panel de administración (primera fila) visible
- [ ] Accedí a `/admin` - Enabler con 4 módulos visible
- [ ] Accedí a `/admin/branches` - CRUD funcional
- [ ] Accedí a `/admin/users` - Página carga (estructura)
- [ ] Accedí a `/admin/roles` - Página carga (estructura)
- [ ] Accedí a `/admin/smtp` - Página carga (estructura)
- [ ] Navegación entre módulos funciona sin errores

### Pruebas de Integración
- [ ] Puedo ver lista de estudiantes
- [ ] Puedo ver lista de cursos
- [ ] Puedo ver lista de grupos
- [ ] Puedo ver lista de instructores
- [ ] Permisos se respetan (si no tengo permiso, no veo módulo)
- [ ] Usuario tipo 'admin' tiene acceso a todo (bypass de permisos)

### Configuración SMTP (Opcional)
- [ ] Accedí a `/admin/smtp`
- [ ] Configuré servidor SMTP:
  - [ ] Host: _______________
  - [ ] Puerto: _______________
  - [ ] Usuario: _______________
  - [ ] De: _______________
- [ ] Probé conexión: Test email enviado ✓
- [ ] Email de prueba recibido

### Prueba de Reseteo de Contraseña
- [ ] Accedí a `/forgot-password`
- [ ] Solicité reset para usuario: _______________
- [ ] Email de reset recibido
- [ ] Link de reset funcional
- [ ] Pude cambiar contraseña
- [ ] Login con nueva contraseña exitoso

### Monitoreo Inicial
- [ ] Backend logs sin errores: `tail -f logs/backend.log`
- [ ] Frontend logs sin errores: `tail -f logs/frontend.log`
- [ ] PostgreSQL logs sin errores: `docker-compose logs postgres`
- [ ] Uso de CPU: _______ % (normal < 50%)
- [ ] Uso de RAM: _______ % (normal < 70%)
- [ ] Uso de disco: _______ % (normal < 80%)

### Documentación
- [ ] Documenté cambios realizados
- [ ] Actualicé log de cambios del sistema
- [ ] Guardé credenciales en lugar seguro
- [ ] Notifiqué a usuarios que el sistema está disponible
- [ ] Compartí guía de uso del nuevo sistema de roles

---

## 🚨 ROLLBACK (Solo si algo salió mal)

### ¿Se requirió rollback?
- [ ] Sí → Completa esta sección
- [ ] No → Omitir

### Ejecución de Rollback
- [ ] **13_rollback_database.sh**
  - [ ] Ejecutado: ✓
  - [ ] Opción seleccionada: 
    - [ ] 1. Restaurar desde backup (RECOMENDADO)
    - [ ] 2. Eliminar tablas nuevas
    - [ ] 3. Rollback manual
  - [ ] Backup utilizado: _______________
  - [ ] Rollback completado: ✓
  - [ ] Todas las tablas nuevas eliminadas
  - [ ] Columnas removidas de `users`
  - [ ] Sistema funcional con versión anterior
  - [ ] Motivo del rollback: _______________

### Verificación Post-Rollback
- [ ] Base de datos restaurada al estado pre-migración
- [ ] Servicios reiniciados
- [ ] Sistema funcional
- [ ] Usuarios pueden acceder
- [ ] Documenté el problema y el rollback

---

## 📊 RESUMEN EJECUTIVO

### Tiempos Reales
- Inicio del despliegue: _______________
- Fin del despliegue: _______________
- Duración total: _______ minutos
- Downtime real: _______ minutos

### Resultados
- [ ] ✅ Despliegue exitoso
- [ ] ⚠️  Despliegue con advertencias (funcionando)
- [ ] ❌ Despliegue fallido - Rollback ejecutado

### Estadísticas Finales
- Tablas en base de datos: _______
- Roles configurados: 3 (Super Admin, Admin, Instructor)
- Permisos totales: 21
- Usuarios con roles asignados: _______
- Usuarios sin roles: _______
- Sucursales activas: _______

### Problemas Encontrados
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Soluciones Aplicadas
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Notas Adicionales
_______________________________________________
_______________________________________________
_______________________________________________

---

## 📝 FIRMAS

**Ejecutado por**: _____________________  
**Fecha**: _____________________  
**Hora**: _____________________  

**Revisado por**: _____________________  
**Fecha**: _____________________  
**Hora**: _____________________  

**Aprobado por**: _____________________  
**Fecha**: _____________________  
**Hora**: _____________________  

---

## 🔐 ACCESOS Y CREDENCIALES (Guardar en lugar seguro)

- [ ] Usuario admin de PostgreSQL documentado
- [ ] Password de PostgreSQL en gestor de passwords
- [ ] Credenciales SMTP documentadas (si se configuró)
- [ ] Token JWT_SECRET respaldado
- [ ] Accesos SSH documentados

---

**✅ DESPLIEGUE COMPLETADO**

Fecha: _____________________  
Sistema operacional: [ ] Sí [ ] No  
Usuarios notificados: [ ] Sí [ ] No  
Monitoreo activado: [ ] Sí [ ] No  

**Próxima revisión programada**: _____________________
