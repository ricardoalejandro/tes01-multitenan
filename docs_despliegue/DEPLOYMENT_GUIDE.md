# 🚀 Guía de Deployment - Probacionismo

## 📋 Flujo de Trabajo Automatizado

### Despliegue Rápido (Recomendado)

```bash
# Desde tu máquina local:
ssh root@72.61.37.46 'cd /root/proyectos/probacionismo && ./deploy.sh'

# O conectándote al VPS:
ssh root@72.61.37.46
cd /root/proyectos/probacionismo
./deploy.sh
```

El script `deploy.sh` hace TODO automáticamente:
1. ✅ Actualiza código desde git (`develop`)
2. ✅ Aplica configuración de producción (`.env.production`)
3. ✅ Detiene contenedores (preservando datos)
4. ✅ Reconstruye imágenes con código nuevo
5. ✅ Levanta servicios
6. ✅ Verifica que todo funcione

---

## 📁 Estructura de Archivos de Configuración

```
/root/proyectos/probacionismo/
├── .env                    ← Archivo activo (copia de .env.production)
├── .env.example            ← Plantilla (para git)
├── .env.development        ← Valores de desarrollo (NO usar en VPS)
├── .env.production         ← Valores de producción (USAR EN VPS)
├── deploy.sh               ← Script de despliegue automático
├── backup.sh               ← Script de backup
└── update.sh               ← Script legacy (deprecado, usar deploy.sh)
```

### ⚠️ IMPORTANTE:

- **`.env.production`** contiene los valores REALES de producción (passwords, secrets, dominio)
- **`.env`** es una copia temporal que usa Docker Compose
- **NUNCA commitear** `.env` ni `.env.production` a git
- **SÍ commitear** `.env.example` como plantilla

---

## 🎯 URLs de Producción

Tu aplicación está disponible en:

- **URL Principal:** https://naperu.cloud/
- **Login:** https://naperu.cloud/login  
- **Dashboard:** https://naperu.cloud/dashboard
- **API:** https://naperu.cloud/api/

### 🔒 Seguridad Implementada:
- ✅ HTTPS con certificado SSL (Let's Encrypt)
- ✅ Renovación automática de certificado
- ✅ Redirección HTTP → HTTPS
- ✅ Security headers configurados
- ✅ Nginx como reverse proxy

---

## 📦 Backups Automáticos

### Configuración Actual:
- **Frecuencia:** Diario a las 3:00 AM
- **Ubicación:** `/root/backupsBD/probacionismo/`
- **Formato:** `backup_YYYY-MM-DD_HH-MM-SS.sql.gz`
- **Retención:** 30 días (automático)

### Comandos de Backup:

```bash
# Crear backup manual
./backup.sh

# Ver backups disponibles
ls -lh /root/backupsBD/probacionismo/

# Restaurar backup específico
gunzip < /root/backupsBD/probacionismo/backup_2025-11-11_03-00-00.sql.gz | \
  docker exec -i multitenant_postgres psql -U postgres -d multitenant_db
```

---

## 🔧 Variables de Entorno de Producción

### Archivo: `.env.production`

```bash
# SEGURIDAD
JWT_SECRET=<secret-aleatorio-64-caracteres>
POSTGRES_PASSWORD=<password-seguro>

# URLS Y DOMINIO
NODE_ENV=production
CORS_ORIGIN=https://naperu.cloud
NEXT_PUBLIC_API_URL=https://naperu.cloud/api

# PUERTOS (NO CAMBIAR)
BACKEND_PORT=3000
FRONTEND_PORT=5000
```

### ⚠️ Cambiar Secrets:

Si necesitas cambiar secrets en producción:

```bash
# 1. Editar archivo
nano .env.production

# 2. Redesplegar
./deploy.sh
```

---

## 🛠️ Comandos Útiles

### Ver estado de servicios
```bash
docker compose ps
```

### Ver logs en tiempo real
```bash
docker compose logs -f

# Logs específicos
docker compose logs -f backend
docker compose logs -f frontend
```

### Reiniciar servicios (sin rebuild)
```bash
docker compose restart
```

### Rebuild completo (si hay problemas graves)
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Verificar Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/probacionismo_error.log
```

### Verificar espacio en disco
```bash
df -h /
docker system df
```

### Limpiar espacio de Docker
```bash
docker system prune -a --volumes -f
```

---

## 🔍 Verificar que Todo Funciona

### Desde el VPS:
```bash
# Backend health check
curl http://localhost:3000/health

# Frontend
curl -I http://localhost:5000

# HTTPS público
curl -I https://naperu.cloud
```

### Desde el navegador:
1. Abre https://naperu.cloud
2. Debería aparecer el login
3. Loguéate con: `admin` / `escolastica123`
4. Verifica que el dashboard cargue correctamente

---

## ⚠️ Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL esté corriendo
docker compose ps postgres

# Ver logs
docker compose logs postgres
```

### Error: "CORS policy blocked"
```bash
# Verificar CORS_ORIGIN en .env.production
grep CORS_ORIGIN .env.production

# Debe ser: CORS_ORIGIN=https://naperu.cloud
```

### Error: "504 Gateway Timeout"
```bash
# Verificar que backend esté respondiendo
docker compose logs backend --tail 50

# Reiniciar si es necesario
docker compose restart backend
```

### Frontend no carga
```bash
# Limpiar caché del navegador
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# Verificar logs
docker compose logs frontend --tail 50
```

**Para más problemas:** Consulta `TROUBLESHOOTING.md`

---

## 📊 Arquitectura Actual

```
Internet
   ↓
https://naperu.cloud (72.61.37.46)
   ↓
Nginx (:80/:443)
   ↓
┌─────────────────────────────┐
│ Docker Compose              │
│                             │
│ Frontend (:5000)            │
│ Backend (:3000)             │
│ PostgreSQL (:5432) PRIVADO  │
│ Redis (:6379) PRIVADO       │
└─────────────────────────────┘
```

---

## 💡 Tips y Mejores Prácticas

1. **Siempre hacer backup antes de cambios importantes**
   ```bash
   ./backup.sh
   ```

2. **Monitorear logs después del despliegue**
   ```bash
   docker compose logs -f --tail 50
   ```

3. **Verificar estado de servicios regularmente**
   ```bash
   docker compose ps
   ```

4. **Renovación SSL automática** (configurada con certbot)
   - El certificado se renueva solo cada 60 días
   - Verificar: `sudo certbot renew --dry-run`

5. **Mantener limpio el sistema**
   ```bash
   # Cada mes
   docker system prune -a --volumes -f
   ```

6. **Documentar cambios importantes**
   - Actualiza estos archivos si cambias algo crítico
   - Guarda logs de errores importantes

---

## 🔐 Seguridad

### Checklist de Seguridad (Actualizado 2025-11-28):
- ✅ JWT_SECRET único y fuerte (64 caracteres)
- ✅ Passwords seguros en PostgreSQL (43 caracteres)
- ✅ HTTPS con certificado válido (Let's Encrypt, expira Feb 2026)
- ✅ CORS configurado correctamente
- ✅ PostgreSQL en red privada (puerto 5432 NO expuesto)
- ✅ Redis en red privada con contraseña (puerto 6379 NO expuesto)
- ✅ **Puertos 3000/5000 solo en localhost** (127.0.0.1, no accesibles desde internet)
- ✅ Nginx como único punto de entrada público
- ✅ Backups automáticos configurados (3:00 AM diario)
- ✅ **Firewall UFW activo** (solo puertos 22, 80, 443)
- ✅ **Fail2ban activo** (bloquea IPs con 3 intentos fallidos SSH por 24h)
- ✅ **SSH solo con claves** (password authentication deshabilitado)

### ⚠️ IMPORTANTE - Lecciones del Incidente de Seguridad (Nov 2025):

El 10 de noviembre de 2025 se detectó un ataque de ransomware que entró por Redis expuesto. 
**Acciones tomadas:**

1. **Redis ahora tiene contraseña obligatoria** (configurada en `.env`)
2. **Puertos de BD/Redis NO se exponen a internet**
3. **Archivo malicioso `dump.rdb` eliminado** 
4. **Fail2ban instalado** para bloquear fuerza bruta
5. **Puertos 3000/5000 cambiados de 0.0.0.0 a 127.0.0.1**

### Verificar Seguridad:
```bash
# Ver puertos expuestos
netstat -tlnp | grep LISTEN

# Verificar fail2ban
fail2ban-client status sshd

# Verificar firewall
ufw status

# Ver intentos de ataque bloqueados
grep "Ban" /var/log/fail2ban.log | tail -20
```

### Actualizar Secrets:
```bash
# 1. Generar nuevo secret
openssl rand -base64 48

# 2. Editar .env.production
nano .env.production

# 3. Redesplegar
./deploy.sh
```

---

## 📝 Notas para el Próximo Despliegue

### Pendientes de Migración de BD:
Las siguientes columnas/tablas fueron agregadas manualmente y deben incluirse en futuras migraciones:

```sql
-- Agregado 2025-11-28: Campos de horario en grupos
ALTER TABLE class_groups ADD COLUMN start_time text;
ALTER TABLE class_groups ADD COLUMN end_time text;

-- Agregado 2025-11-28: Tabla de asistentes de grupo
CREATE TABLE group_assistants (...);
```

### Cambios en docker-compose.yml (2025-11-28):
Los puertos del backend y frontend fueron cambiados para mayor seguridad:
```yaml
# ANTES (inseguro):
ports:
  - "3000:3000"  # Expuesto a internet
  
# AHORA (seguro):
ports:
  - "127.0.0.1:3000:3000"  # Solo localhost
```

### Frontend en Modo Producción:
**IMPORTANTE**: El frontend debe desplegarse en modo producción para mejor rendimiento.
Cambiar en `docker-compose.yml`:
```yaml
# De:
target: development
NODE_ENV: development

# A:
target: runner
NODE_ENV: production
```

Esto reduce el bundle de ~6MB a ~400KB y mejora el tiempo de carga de ~60s a ~5s.

---

## 🎉 ¡Listo para Producción!

Tu aplicación está completamente configurada y lista para recibir usuarios en:

**https://naperu.cloud** 🚀
