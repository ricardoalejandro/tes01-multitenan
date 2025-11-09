# 🎯 CONFIGURACIÓN DE VARIABLES DE ENTORNO

## 📌 Estado Actual: DESARROLLO

Este proyecto está configurado para funcionar **automáticamente** en desarrollo. Los archivos `.env` con datos de prueba están incluidos en Git.

---

## ✅ Para Desarrollo (Setup Instantáneo)

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio>
cd escolastica

# 2. Levantar servicios
docker compose up -d

# 3. ¡Listo! Todo funciona automáticamente 🎉
```

**No necesitas configurar nada.** Los archivos `.env` con datos de prueba ya están incluidos.

---

## 🔐 Variables de Entorno Incluidas (Desarrollo)

### Archivo: `.env` (raíz)
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=multitenant_db
CORS_ORIGIN=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Archivo: `backend/.env`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multitenant_db
REDIS_URL=redis://multitenant_redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=4000
CORS_ORIGIN=http://localhost:5000
```

### Archivo: `.env.local` (frontend - también incluido)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

⚠️ **Estos son datos de PRUEBA, seguros para compartir en Git.**

---

## 🚀 Cuando Vayas a Producción

**Antes de desplegar en producción, lee**: [`README_PRODUCCION.md`](./README_PRODUCCION.md)

Pasos resumidos:
1. Descomentar líneas en `.gitignore` para proteger `.env`
2. Cambiar credenciales en `.env` y `backend/.env`
3. Usar contraseñas seguras y JWT secret aleatorio
4. Configurar URLs reales de tu dominio

---

## 📚 Documentación Adicional

- **[DEPLOYMENT_ENV.md](./DEPLOYMENT_ENV.md)** - Guía completa de variables de entorno
- **[SETUP_RAPIDO.md](./SETUP_RAPIDO.md)** - Setup rápido para equipo de infraestructura
- **[README_PRODUCCION.md](./README_PRODUCCION.md)** - ⚠️ Checklist pre-producción

---

## 🔧 Scripts Útiles

```bash
# Validar que todas las variables estén configuradas
./scripts/validate-env.sh

# Ver logs
docker compose logs -f

# Reiniciar servicios
docker compose restart

# Reconstruir todo
docker compose up -d --build
```

---

## ❓ FAQ

### ¿Por qué están los .env en Git?
**R:** Solo en desarrollo. Contienen datos de prueba (usuario: `postgres`, password: `postgres`). Cuando vayas a producción, se removerán del repositorio.

### ¿Esto es seguro?
**R:** Sí, mientras uses estos archivos SOLO para desarrollo local con datos de prueba. Nunca pongas credenciales reales aquí.

### ¿Qué pasa si clono el repo en otra máquina?
**R:** Todo funciona inmediatamente. Solo ejecuta `docker compose up -d` y listo.

### ¿Cuándo debo cambiar las credenciales?
**R:** Cuando vayas a producción/staging. Lee `README_PRODUCCION.md` antes.

---

**Última actualización:** Noviembre 2025  
**Ambiente:** Desarrollo  
**Próximo paso:** Migración a producción (pendiente)
