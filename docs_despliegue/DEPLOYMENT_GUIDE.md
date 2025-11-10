# 🚀 Guía de Deployment - Probacionismo

## 📋 Flujo de Trabajo (Workflow)

Tu flujo de trabajo típico será:

1. **Desarrollas localmente** en tu máquina
2. **Haces commit y push** a la rama `develop`
3. **Te conectas al VPS** y actualizas el código
4. **Ejecutas el script de despliegue**
5. **¡Listo!** - Cambios en producción

---

## 🔄 Actualizar la Aplicación (Paso a Paso)

### 1. Conectarse al VPS
```bash
ssh root@72.61.37.46
```

### 2. Ir al directorio del proyecto
```bash
cd /root/proyectos/probacionismo
```

### 3. Bajar los últimos cambios de la rama develop
```bash
git pull origin develop
```

### 4. Ejecutar el script de despliegue
```bash
./update.sh
```

¡Eso es todo! El script automáticamente:
- Detiene los contenedores actuales
- Reconstruye las imágenes con el código nuevo
- Levanta los contenedores actualizados
- Muestra el estado final

---

## ⚡ Comando Rápido (Todo en Uno)

Si prefieres un solo comando:
```bash
cd /root/proyectos/probacionismo && git pull origin develop && ./update.sh
```

---

## 🎯 URL de Producción

Tu aplicación está disponible públicamente en:

**URL:** `http://72.61.37.46/`

- Login: `http://72.61.37.46/login`
- Dashboard: `http://72.61.37.46/dashboard`
- API: `http://72.61.37.46/api/*`

---

## 📋 Arquitectura Actual

```
GitHub (rama develop)
        ↓ git pull
    VPS: /root/proyectos/probacionismo
        ↓ ./update.sh
    Docker Compose (rebuild + restart)
        ↓
    Nginx (72.61.37.46)
        ↓
    ┌───────────────────┬───────────────────┐
    ↓                   ↓                    ↓
Frontend:5000    Backend:3000         Servicios
(Next.js)        (Fastify)         (PostgreSQL:5432
                                    Redis:6379)
```

---

## 🔧 Configuración Actual

### Nginx Reverse Proxy
- **Ubicación:** `/etc/nginx/sites-available/probacionismo`
- **Frontend:** `http://72.61.37.46/` → `http://localhost:5000`
- **Backend API:** `http://72.61.37.46/api/*` → `http://localhost:3000/api/*`

### Variables de Entorno (`.env`)
```bash
# Frontend accede al backend a través de la IP pública
NEXT_PUBLIC_API_URL=http://72.61.37.46/api

# CORS configurado para aceptar peticiones desde la IP pública
CORS_ORIGIN=http://72.61.37.46
```

### Contenedores Docker
- `multitenant_frontend` - Puerto 5000 (Next.js)
- `multitenant_backend` - Puerto 3000 (Fastify)
- `multitenant_postgres` - Puerto 5432 (PostgreSQL)
- `multitenant_redis` - Puerto 6379 (Redis)

---

## 🔍 Verificar que Todo Funciona

```bash
# Ver estado de contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Verificar frontend
curl -I http://72.61.37.46/

# Verificar API
curl http://72.61.37.46/api/
```

---

## 📝 Logs

```bash
# Ver logs de frontend
docker compose logs -f frontend

# Ver logs de backend
docker compose logs -f backend

# Ver logs de nginx
sudo tail -f /var/log/nginx/probacionismo_access.log
sudo tail -f /var/log/nginx/probacionismo_error.log

# Ver últimas 50 líneas
docker compose logs --tail=50 frontend
docker compose logs --tail=50 backend
```

---

## 🛠️ Comandos Útiles

### Reiniciar servicios (sin rebuild)
```bash
cd /root/proyectos/probacionismo
docker compose restart
```

### Rebuild completo (si hay problemas)
```bash
cd /root/proyectos/probacionismo
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Ver qué cambió en el último pull
```bash
cd /root/proyectos/probacionismo
git log -1 --stat
```

### Cambiar de rama
```bash
cd /root/proyectos/probacionismo
git checkout nombre-de-rama
git pull origin nombre-de-rama
./update.sh
```

---

## 🔒 Seguridad y Firewall

### Puertos Abiertos
```bash
# Ver puertos abiertos
sudo ufw status

# Abrir puerto HTTP (ya está abierto)
sudo ufw allow 80/tcp

# Abrir puerto HTTPS (para futuro)
sudo ufw allow 443/tcp
```

---

## 🌐 Próximos Pasos (Opcional)

### 1. Configurar Dominio
Si compras un dominio (ej: `probacionismo.com`):

1. Configura DNS - Registro A apuntando a `72.61.37.46`
2. Actualiza nginx:
```bash
sudo nano /etc/nginx/sites-available/probacionismo
# Cambiar: server_name 72.61.37.46;
# Por: server_name probacionismo.com www.probacionismo.com;
sudo systemctl reload nginx
```
3. Actualiza `.env`:
```bash
NEXT_PUBLIC_API_URL=http://probacionismo.com/api
CORS_ORIGIN=http://probacionismo.com
```
4. Redeploy:
```bash
./update.sh
```

### 2. Agregar HTTPS con Let's Encrypt
```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d probacionismo.com -d www.probacionismo.com

# El certificado se renovará automáticamente
```

---

## 📦 Backup

### Base de Datos
```bash
# Crear backup
docker exec multitenant_postgres pg_dump -U postgres multitenant_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
cat backup_20241110_120000.sql | docker exec -i multitenant_postgres psql -U postgres -d multitenant_db
```

### Código y Configuración
```bash
cd /root/proyectos/
tar -czf probacionismo_backup_$(date +%Y%m%d_%H%M%S).tar.gz probacionismo/
```

---

## ⚠️ Troubleshooting

Si algo no funciona, consulta: `TROUBLESHOOTING.md`

O ejecuta:
```bash
# Verificar todo está corriendo
docker compose ps
sudo systemctl status nginx

# Ver logs de errores
docker compose logs --tail=50
sudo tail -50 /var/log/nginx/probacionismo_error.log
```

---

## 📞 Resumen Rápido

**Para actualizar después de hacer cambios:**
```bash
ssh root@72.61.37.46
cd /root/proyectos/probacionismo
git pull origin develop
./update.sh
```

**URL de producción:** http://72.61.37.46/

**Verificar estado:** `docker compose ps`

¡Eso es todo! 🚀
