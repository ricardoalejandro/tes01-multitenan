# 🚀 Inicio Rápido con Docker

## Requisitos
- **Ubuntu** (u otro Linux)
- **Docker** instalado
- **Docker Compose** instalado

## Instalación de Docker (si no lo tienes)

```bash
# Actualizar sistema
sudo apt-get update

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER

# Reiniciar sesión o ejecutar:
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

## Uso

### 1. Clonar el repositorio

```bash
git clone https://github.com/ricardoalejandro/tes01-multitenan.git
cd tes01-multitenan
```

### 2. Levantar todos los servicios

```bash
docker compose up -d
```

**¡ESO ES TODO!** 🎉

El comando anterior:
- ✅ Descarga las imágenes base de PostgreSQL y Redis
- ✅ Construye las imágenes de Frontend y Backend
- ✅ Instala todas las dependencias dentro de los contenedores
- ✅ Compila el código TypeScript
- ✅ Ejecuta las migraciones de base de datos
- ✅ Inserta los datos iniciales (seed)
- ✅ Inicia todos los servicios

### 3. Acceder a la aplicación

Espera 1-2 minutos la primera vez (mientras construye las imágenes), luego:

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs

### 4. Credenciales por defecto

- **Usuario**: `admin`
- **Contraseña**: `escolastica123`

## Comandos Útiles

### Ver logs en tiempo real
```bash
docker compose logs -f
```

### Ver logs de un servicio específico
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Reiniciar servicios
```bash
docker compose restart
```

### Detener servicios
```bash
docker compose down
```

### Reconstruir imágenes (después de cambios en código)
```bash
docker compose up -d --build
```

### Limpiar todo (⚠️ elimina la base de datos)
```bash
docker compose down -v
```

## Solución de Problemas

### Puerto en uso
Si ves error de que un puerto está en uso:

```bash
# Ver qué está usando el puerto
sudo lsof -i :5000
sudo lsof -i :3000

# Cambiar puertos en docker-compose.yml
```

### Reconstruir desde cero
```bash
# Detener y limpiar todo
docker compose down -v

# Limpiar imágenes
docker image prune -a

# Volver a construir
docker compose up -d --build
```

### Ver estado de los contenedores
```bash
docker compose ps
```

## Arquitectura

El sistema consta de 4 servicios:

```
┌─────────────────────────────────────┐
│    multitenant-network              │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ Frontend │  │ Backend  │       │
│  │ Next.js  │→ │ Fastify  │       │
│  │  :5000   │  │  :3000   │       │
│  └──────────┘  └─────┬────┘       │
│                      │             │
│  ┌──────────┐  ┌────▼─────┐       │
│  │  Redis   │  │PostgreSQL│       │
│  │  :6379   │  │  :5432   │       │
│  └──────────┘  └──────────┘       │
└─────────────────────────────────────┘
```

## Notas Importantes

- ❌ **NO necesitas instalar Node.js en tu Ubuntu**
- ❌ **NO necesitas instalar PostgreSQL en tu Ubuntu**
- ❌ **NO necesitas instalar Redis en tu Ubuntu**
- ❌ **NO necesitas instalar dependencias npm en tu Ubuntu**
- ✅ **SOLO necesitas Docker y Docker Compose**
- ✅ **TODO se maneja dentro de los contenedores**

## Desarrollo

Si quieres hacer cambios en el código:

1. Edita los archivos en tu editor favorito
2. Ejecuta: `docker compose up -d --build`
3. Los cambios se aplicarán

## Más Información

- [Documentación completa de Docker](DOCKER.md)
- [README principal](README.md)
- [Guía de inicio rápido](QUICKSTART.md)
