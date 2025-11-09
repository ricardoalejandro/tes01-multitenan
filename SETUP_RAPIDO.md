# ⚙️ Configuración Rápida para Despliegue

## 🚀 Instrucciones para tu equipo de infraestructura

### Paso 1: Clonar el repositorio
```bash
git clone <tu-repositorio>
cd escolastica
```

### Paso 2: Crear archivo de variables de entorno
```bash
cp .env.example .env
```

### Paso 3: Editar variables críticas en `.env`

**OBLIGATORIO cambiar en producción/staging:**

```env
# Generar con: openssl rand -base64 32
JWT_SECRET=TU_SECRET_GENERADO_AQUI

# Credenciales de base de datos
POSTGRES_USER=escolastica_prod
POSTGRES_PASSWORD=PASSWORD_SEGURO_AQUI
POSTGRES_DB=escolastica_production

# URLs de tu dominio
CORS_ORIGIN=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
```

### Paso 4: Validar configuración
```bash
./scripts/validate-env.sh
```

### Paso 5: Desplegar
```bash
docker compose up -d --build
```

### Paso 6: Verificar servicios
```bash
docker compose ps
docker compose logs -f
```

## 📋 Checklist Rápido

- [ ] Archivo `.env` creado
- [ ] `JWT_SECRET` cambiado (generar con `openssl rand -base64 32`)
- [ ] Credenciales de PostgreSQL actualizadas
- [ ] URLs configuradas según dominio
- [ ] Script de validación ejecutado sin errores
- [ ] Servicios desplegados y corriendo
- [ ] Logs verificados sin errores

## 🆘 Si algo falla

1. Ver logs: `docker compose logs backend`
2. Ver logs: `docker compose logs frontend`
3. Reiniciar: `docker compose restart`
4. Revisar documentación completa en `DEPLOYMENT_ENV.md`

## 📞 Contacto

Para dudas sobre la configuración, contactar al equipo de desarrollo.
