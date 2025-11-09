# 🐳 Docker Deployment Guide

This guide explains how to run the Multi-Tenant Academic System using Docker Compose.

## 🏗️ Architecture

The system consists of 4 independent services:

```
┌─────────────────────────────────────────────────┐
│            multitenant-network                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Frontend │  │ Backend  │  │PostgreSQL│     │
│  │ Next.js  │─▶│ Fastify  │─▶│    17    │     │
│  │  :5000   │  │  :3000   │  │  :5432   │     │
│  └──────────┘  └─────┬────┘  └──────────┘     │
│                      │                          │
│                      │       ┌──────────┐       │
│                      └──────▶│  Redis   │       │
│                              │    7     │       │
│                              │  :6379   │       │
│                              └──────────┘       │
└─────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher

### Start All Services

```bash
# Start in detached mode
docker compose up -d

# Or start with logs visible
docker compose up
```

### Access the Application

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs

### Default Credentials

- **Username**: `admin`
- **Password**: `escolastica123`

## 📋 Available Commands

### Start Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend
docker compose up -d frontend
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v
```

### Rebuild Services

```bash
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build backend
docker compose build frontend

# Rebuild and restart
docker compose up -d --build
```

### Check Service Status

```bash
# View running containers
docker compose ps

# View service health
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
```

## 🔧 Configuration

### Environment Variables

The system uses environment variables defined in `docker-compose.yml`:

#### Backend Environment

```yaml
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/multitenant_db
REDIS_URL: redis://redis:6379
JWT_SECRET: your-super-secret-jwt-key-change-in-production
CORS_ORIGIN: http://localhost:5000
```

#### Frontend Environment

```yaml
NEXT_PUBLIC_API_URL: http://localhost:3000/api
```

### Custom Configuration

Create a `.env` file in the project root to override defaults:

```env
# Security (IMPORTANT: Change in production!)
JWT_SECRET=your-custom-secure-secret-key-here

# Optional: Custom ports
FRONTEND_PORT=5000
BACKEND_PORT=3000
POSTGRES_PORT=5432
REDIS_PORT=6379
```

Then update `docker-compose.yml` to use these variables:

```yaml
services:
  backend:
    environment:
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "${BACKEND_PORT:-3000}:3000"
```

## 🗄️ Database Management

### Initialize Database

The database is automatically initialized on first run. To manually run migrations:

```bash
# Access backend container
docker compose exec backend sh

# Run migrations
npm run db:push

# Seed initial data
npm run db:seed
```

### Backup Database

```bash
# Backup
docker compose exec postgres pg_dump -U postgres multitenant_db > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres multitenant_db < backup.sql
```

### Connect to Database

```bash
# Using psql
docker compose exec postgres psql -U postgres -d multitenant_db

# Using external tool (e.g., pgAdmin, DBeaver)
# Host: localhost
# Port: 5432
# Database: multitenant_db
# User: postgres
# Password: postgres
```

## 🧪 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker compose logs

# Check container status
docker compose ps

# Restart all services
docker compose restart
```

### Port Conflicts

If ports 3000, 5000, 5432, or 6379 are already in use:

```bash
# Find what's using the port
lsof -i :3000
lsof -i :5000

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker compose ps postgres

# Check postgres logs
docker compose logs postgres

# Verify connection
docker compose exec postgres pg_isready -U postgres
```

### Redis Connection Issues

```bash
# Check if redis is healthy
docker compose ps redis

# Test redis connection
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Build Failures

```bash
# Clean build cache
docker compose build --no-cache

# Remove old images
docker image prune -a

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Container Crashes

```bash
# Check exit code and logs
docker compose ps
docker compose logs <service-name>

# Restart specific service
docker compose restart <service-name>
```

## 🔒 Production Deployment

### Security Checklist

- [ ] Change `JWT_SECRET` to a strong, random value
- [ ] Change PostgreSQL password
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up backup strategy
- [ ] Enable Docker logging
- [ ] Use Docker secrets for sensitive data

### Use Docker Secrets (Recommended)

```bash
# Create secrets
echo "your-secure-jwt-secret" | docker secret create jwt_secret -
echo "secure-db-password" | docker secret create db_password -

# Update docker-compose.yml to use secrets
```

### Reverse Proxy Setup

For production, use Nginx or Traefik as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### View Resource Usage

```bash
# CPU and memory usage
docker stats

# Disk usage
docker system df
```

### Health Checks

All services have built-in health checks:

```bash
# Check health status
docker compose ps

# Manually check endpoints
curl http://localhost:3000/health
curl http://localhost:5000
```

## 🧹 Maintenance

### Clean Up

```bash
# Remove stopped containers
docker compose down

# Remove unused images
docker image prune

# Remove unused volumes (⚠️ deletes data)
docker volume prune

# Complete cleanup
docker system prune -a --volumes
```

### Update Services

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Project README](README.md)
- [Deployment Guide](DEPLOYMENT.md)

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker compose logs`
2. Review the [Troubleshooting](#-troubleshooting) section
3. Open an issue on GitHub

---

**Happy Deploying! 🚀**
