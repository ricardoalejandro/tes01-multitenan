# 🚀 Guía de Despliegue en Producción

Esta guía cubre el despliegue del Sistema de Gestión Académica Multi-Tenant en un entorno de producción.

## 📋 Requisitos del Servidor

### Hardware Mínimo
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Almacenamiento**: 20 GB SSD
- **Ancho de banda**: 100 Mbps

### Hardware Recomendado
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Almacenamiento**: 50+ GB SSD
- **Ancho de banda**: 1 Gbps

### Software
- **OS**: Ubuntu 20.04+, Debian 10+, CentOS 7+, o RHEL 7+
- **Node.js**: 20.x
- **PostgreSQL**: 17.x
- **Redis**: 7.x
- **Nginx**: (opcional, para reverse proxy)
- **Certbot**: (opcional, para SSL/HTTPS)

## 🔧 Instalación Automática

### Paso 1: Preparar el Servidor

```bash
# Actualizar el sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar git
sudo apt-get install -y git

# Clonar el repositorio
cd /opt
sudo git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan
```

### Paso 2: Ejecutar el Instalador

```bash
sudo bash scripts/install.sh
```

El instalador automáticamente:
1. Instala todas las dependencias del sistema
2. Configura PostgreSQL y Redis
3. Instala dependencias del proyecto
4. Ejecuta migraciones de base de datos
5. Crea servicios systemd
6. Configura variables de entorno

### Paso 3: Configurar Variables de Entorno

Editar `/opt/tes01-multitenan/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:SECURE_PASSWORD@localhost:5432/multitenant_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=GENERATE_SECURE_KEY_HERE
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
```

⚠️ **IMPORTANTE**:
- Cambiar `SECURE_PASSWORD` por una contraseña fuerte
- Generar `JWT_SECRET` con: `openssl rand -hex 32`
- Actualizar `CORS_ORIGIN` con su dominio

Editar `/opt/tes01-multitenan/.env`:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

### Paso 4: Build para Producción

```bash
cd /opt/tes01-multitenan

# Build frontend
npm run build

# Build backend
cd backend
npm run build
cd ..
```

### Paso 5: Iniciar Servicios

```bash
# Iniciar servicios
sudo systemctl start multitenant-backend
sudo systemctl start multitenant-frontend

# Habilitar inicio automático
sudo systemctl enable multitenant-backend
sudo systemctl enable multitenant-frontend

# Verificar estado
sudo systemctl status multitenant-backend
sudo systemctl status multitenant-frontend
```

## 🌐 Configurar Nginx como Reverse Proxy

### Instalar Nginx

```bash
sudo apt-get install -y nginx
```

### Configurar Nginx

Crear archivo `/etc/nginx/sites-available/multitenant`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation
    location /docs {
        proxy_pass http://localhost:3000/docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:3000/health;
    }

    # Limits
    client_max_body_size 20M;
}
```

### Habilitar el sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/multitenant /etc/nginx/sites-enabled/

# Eliminar sitio por defecto
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 🔒 Configurar SSL con Let's Encrypt

### Instalar Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Obtener Certificado SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot automáticamente:
- Obtendrá el certificado
- Actualizará la configuración de Nginx
- Configurará la renovación automática

### Verificar Renovación Automática

```bash
sudo certbot renew --dry-run
```

## 🔥 Configurar Firewall

```bash
# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

## 🗄️ Configuración de PostgreSQL para Producción

### Crear Usuario Específico

```bash
sudo -u postgres psql
```

```sql
-- Crear usuario
CREATE USER multitenant_user WITH PASSWORD 'secure_password_here';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE multitenant_db TO multitenant_user;

-- Salir
\q
```

### Configurar Backups Automáticos

Crear script `/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="multitenant_db_${TIMESTAMP}.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -U postgres multitenant_db | gzip > "${BACKUP_DIR}/${FILENAME}"

# Mantener solo los últimos 30 backups
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup completado: ${FILENAME}"
```

Hacer ejecutable:

```bash
chmod +x /opt/scripts/backup-db.sh
```

Agregar a crontab:

```bash
sudo crontab -e
```

Agregar línea:

```
0 2 * * * /opt/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
```

## 📊 Monitoreo y Logs

### Ver Logs de la Aplicación

```bash
# Logs del backend
sudo journalctl -u multitenant-backend -f

# Logs del frontend
sudo journalctl -u multitenant-frontend -f

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Configurar Logrotate

Crear `/etc/logrotate.d/multitenant`:

```
/var/log/multitenant/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## 🔄 Actualización del Sistema

### Actualizar Código

```bash
cd /opt/tes01-multitenan

# Detener servicios
sudo systemctl stop multitenant-backend
sudo systemctl stop multitenant-frontend

# Hacer backup de .env
cp backend/.env backend/.env.backup
cp .env .env.backup

# Actualizar código
git pull origin main

# Restaurar .env si fue sobrescrito
cp backend/.env.backup backend/.env
cp .env.backup .env

# Instalar nuevas dependencias
npm install
cd backend && npm install && cd ..

# Ejecutar migraciones
cd backend
npm run db:push
cd ..

# Build
npm run build
cd backend && npm run build && cd ..

# Reiniciar servicios
sudo systemctl start multitenant-backend
sudo systemctl start multitenant-frontend
```

## 🐳 Despliegue con Docker (Alternativo)

### Usando Docker Compose en Producción

Crear `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://your-domain.com/api
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/multitenant_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:17-alpine
    restart: always
    environment:
      - POSTGRES_DB=multitenant_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Iniciar con Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Optimizaciones de Rendimiento

### 1. Configurar PM2 para Node.js

```bash
npm install -g pm2

# Iniciar aplicaciones con PM2
pm2 start npm --name "multitenant-frontend" -- start
cd backend && pm2 start npm --name "multitenant-backend" -- start

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
```

### 2. Optimizar PostgreSQL

Editar `/etc/postgresql/17/main/postgresql.conf`:

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 3. Optimizar Redis

Editar `/etc/redis/redis.conf`:

```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## 🔐 Checklist de Seguridad

- [ ] Cambiar contraseñas por defecto
- [ ] Generar JWT_SECRET fuerte
- [ ] Configurar firewall (ufw)
- [ ] Instalar SSL/HTTPS con Let's Encrypt
- [ ] Configurar headers de seguridad en Nginx
- [ ] Deshabilitar acceso root por SSH
- [ ] Configurar fail2ban
- [ ] Mantener sistema actualizado
- [ ] Configurar backups automáticos
- [ ] Monitorear logs regularmente
- [ ] Limitar rate limiting en API
- [ ] Configurar CORS correctamente

## 🆘 Troubleshooting

### Servicio no inicia

```bash
# Ver logs detallados
sudo journalctl -xe -u multitenant-backend

# Verificar configuración
cd /opt/tes01-multitenan/backend
npm run build

# Verificar conexión a base de datos
psql -U postgres -d multitenant_db -c "SELECT 1;"
```

### Error de conexión a Redis

```bash
# Verificar Redis
sudo systemctl status redis-server
redis-cli ping
```

### Nginx no sirve la aplicación

```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

## 📞 Soporte

Para más ayuda:
- Documentación: [README.md](README.md)
- Issues: https://github.com/ricardoalejandro/tes01-multitenan/issues

---

**¡Su sistema está listo para producción!** 🎉
