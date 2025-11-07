# 📖 Guía de Inicio Rápido

Esta guía le ayudará a poner en marcha el Sistema de Gestión Académica Multi-Tenant en menos de 10 minutos.

## 🚀 Inicio Rápido con DevContainer (Recomendado)

### Requisitos Previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [Visual Studio Code](https://code.visualstudio.com/) instalado
- Extensión [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan
```

2. **Abrir en DevContainer**
   - Abrir el proyecto en VS Code
   - Presionar `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
   - Seleccionar "Dev Containers: Reopen in Container"
   - Esperar 3-5 minutos mientras se configura automáticamente

3. **Iniciar la aplicación**

Una vez que el DevContainer esté listo, abrir dos terminales en VS Code:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

4. **Acceder a la aplicación**
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/docs

5. **Iniciar sesión**
   - Usuario: `admin`
   - Contraseña: `escolastica123`

## 🐧 Instalación en Servidor Linux

### Instalador Automático

Para instalar en un servidor Linux con Ubuntu, Debian, CentOS o RHEL:

```bash
# 1. Clonar el repositorio
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan

# 2. Ejecutar el instalador (requiere sudo)
sudo bash scripts/install.sh
```

El instalador automáticamente:
- ✅ Actualiza el sistema
- ✅ Instala Node.js 20
- ✅ Instala PostgreSQL 17
- ✅ Instala Redis 7
- ✅ Instala Docker y Docker Compose
- ✅ Configura la base de datos
- ✅ Instala todas las dependencias
- ✅ Ejecuta migraciones y seeds
- ✅ Crea servicios systemd para producción

### Iniciar en Modo Desarrollo

```bash
# Iniciar ambos servicios (frontend y backend)
npm run dev:all

# O iniciarlos por separado
npm run dev              # Frontend en terminal 1
npm run backend:dev      # Backend en terminal 2
```

### Iniciar en Modo Producción

```bash
# 1. Build
npm run build
cd backend && npm run build && cd ..

# 2. Iniciar servicios con systemd
sudo systemctl start multitenant-backend
sudo systemctl start multitenant-frontend

# 3. Habilitar inicio automático
sudo systemctl enable multitenant-backend
sudo systemctl enable multitenant-frontend

# 4. Ver logs
sudo journalctl -u multitenant-backend -f
sudo journalctl -u multitenant-frontend -f
```

## 💻 Instalación Manual

### 1. Requisitos del Sistema

- **Node.js**: 20.x o superior
- **PostgreSQL**: 17.x
- **Redis**: 7.x
- **npm**: 10.x o superior

### 2. Instalar PostgreSQL 17

**Ubuntu/Debian:**
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-17
```

**CentOS/RHEL:**
```bash
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo yum install -y postgresql17-server
sudo /usr/pgsql-17/bin/postgresql-17-setup initdb
sudo systemctl enable postgresql-17
sudo systemctl start postgresql-17
```

### 3. Instalar Redis 7

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**CentOS/RHEL:**
```bash
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 4. Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 5. Configurar la Base de Datos

```bash
# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE multitenant_db;"

# Establecer contraseña para el usuario postgres
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### 6. Clonar e Instalar el Proyecto

```bash
# Clonar repositorio
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan

# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..
```

### 7. Configurar Variables de Entorno

**Frontend (.env):**
```bash
cp .env.example .env
```

Contenido del archivo `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**Backend (backend/.env):**
```bash
cd backend
cp .env.example .env
```

Contenido del archivo `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multitenant_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5000
```

⚠️ **IMPORTANTE**: Cambie `JWT_SECRET` en producción por una clave segura.

### 8. Ejecutar Migraciones y Seed

```bash
cd backend
npm run db:push    # Crear tablas en la base de datos
npm run db:seed    # Insertar datos iniciales
cd ..
```

### 9. Iniciar la Aplicación

**Opción A - Con un solo comando:**
```bash
npm run dev:all
```

**Opción B - En terminales separadas:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 10. Acceder a la Aplicación

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000
- **Documentación API**: http://localhost:3000/docs
- **Usuario**: admin
- **Contraseña**: escolastica123

## 🐳 Despliegue con Docker

### Usando Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 🔧 Comandos Útiles

### Base de Datos

```bash
cd backend

# Ver schema actual
npm run db:studio

# Generar nuevas migraciones
npm run db:generate

# Aplicar migraciones
npm run db:push

# Re-seed de datos
npm run db:seed
```

### Testing

```bash
# Tests E2E de la API
bash scripts/e2e-test.sh
```

### Scripts de Utilidad

```bash
# Iniciar todos los servicios
bash scripts/start-all.sh

# Detener todos los servicios
bash scripts/stop-all.sh
```

## 🔒 Configuración de Seguridad para Producción

### 1. Cambiar JWT Secret

Editar `backend/.env`:
```env
JWT_SECRET=$(openssl rand -hex 32)
```

### 2. Configurar PostgreSQL

```bash
# Crear usuario específico
sudo -u postgres psql
CREATE USER multitenant_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE multitenant_db TO multitenant_user;
\q
```

Actualizar `backend/.env`:
```env
DATABASE_URL=postgresql://multitenant_user:secure_password_here@localhost:5432/multitenant_db
```

### 3. Configurar Firewall

```bash
# Permitir solo los puertos necesarios
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. Usar HTTPS

Configurar un reverse proxy con Nginx y Let's Encrypt para HTTPS.

## 🆘 Solución de Problemas

### Error: "Cannot connect to database"

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U postgres -d multitenant_db -c "SELECT 1;"
```

### Error: "Redis connection failed"

```bash
# Verificar que Redis esté corriendo
sudo systemctl status redis-server

# Probar conexión
redis-cli ping
```

### Error: "Port already in use"

```bash
# Ver qué proceso está usando el puerto
sudo lsof -i :3000
sudo lsof -i :5000

# Matar el proceso si es necesario
kill -9 <PID>
```

### Error: "Permission denied"

```bash
# Dar permisos de ejecución a scripts
chmod +x scripts/*.sh
chmod +x .devcontainer/setup.sh
```

## 📚 Recursos Adicionales

- [Documentación completa](README.md)
- [API Documentation](http://localhost:3000/docs) (cuando esté corriendo)
- [Reportar un problema](https://github.com/ricardoalejandro/tes01-multitenan/issues)

## 🎓 Próximos Pasos

1. Explorar el dashboard
2. Crear más sucursales (como superadmin)
3. Agregar estudiantes
4. Crear cursos
5. Registrar instructores
6. Organizar grupos de clases

---

**¡Felicidades! Su sistema está listo para usar.** 🎉
