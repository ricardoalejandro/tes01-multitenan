# 🔧 Troubleshooting - Probacionismo

## ❌ Error: "404 Not Found" en `/probacionismo/api`

### Síntoma
El navegador muestra en consola:
```
POST http://72.61.37.46/probacionismo/api/auth/login 404 (Not Found)
```

### Causa
El navegador tiene caché viejo con la URL anterior.

### Solución
**Limpia el caché del navegador:**

#### Opción 1: Hard Reload (Más Rápido)
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

#### Opción 2: Limpiar Todo el Caché
**Chrome/Edge:**
1. Presiona `F12` para abrir DevTools
2. Click derecho en el botón de recargar 🔄
3. Selecciona **"Empty Cache and Hard Reload"**

**Firefox:**
1. Presiona `Ctrl + Shift + Delete`
2. Marca solo **"Caché"**
3. Click en **"Limpiar ahora"**

---

## ❌ Error: WebSocket connection failed

### Síntoma
```
WebSocket connection to 'ws://72.61.37.46/_next/webpack-hmr' failed
```

### Causa
Este error es normal en desarrollo. El Hot Module Replacement (HMR) no afecta la funcionalidad.

### Solución
✅ **Ya está solucionado** - nginx ahora soporta WebSocket.

Si persiste, solo afecta al hot-reload en desarrollo, no a la funcionalidad de la app.

---

## ❌ Error: Cambios de código no se reflejan

### Solución
```bash
cd /root/proyectos/probacionismo
./update.sh
```

O manualmente:
```bash
docker compose down
docker compose build --no-cache frontend backend
docker compose up -d
```

---

## ❌ Error: Cannot connect to API

### Verificación
```bash
# Ver logs del backend
docker logs multitenant_backend --tail 50

# Ver logs del frontend
docker logs multitenant_frontend --tail 50

# Verificar contenedores
docker compose ps

# Verificar nginx
sudo nginx -t
sudo systemctl status nginx
```

### Solución
```bash
# Reiniciar servicios
docker compose restart

# Si persiste, reconstruir
cd /root/proyectos/probacionismo
docker compose down
docker compose up -d
```

---

## 🔍 Comandos Útiles

### Ver logs en tiempo real
```bash
# Todos los servicios
docker compose logs -f

# Solo frontend
docker compose logs -f frontend

# Solo backend
docker compose logs -f backend
```

### Ver configuración actual
```bash
# Variables de entorno
cat /root/proyectos/probacionismo/.env

# Nginx
sudo cat /etc/nginx/sites-available/probacionismo

# Estado de contenedores
docker compose ps
```

### Reiniciar todo
```bash
cd /root/proyectos/probacionismo
docker compose restart
```

### Verificar conectividad
```bash
# Frontend
curl -I http://72.61.37.46/

# API
curl http://72.61.37.46/api/

# Backend directo
curl -I http://localhost:3000/api/
```

---

## �� Resumen de URLs

- **Frontend:** http://72.61.37.46/
- **Login:** http://72.61.37.46/login
- **Dashboard:** http://72.61.37.46/dashboard
- **API:** http://72.61.37.46/api/

---

## ✅ Checklist de Verificación

- [ ] Los contenedores están corriendo: `docker compose ps`
- [ ] Nginx está activo: `sudo systemctl status nginx`
- [ ] El .env tiene la URL correcta: `grep NEXT_PUBLIC_API_URL .env`
- [ ] El navegador tiene caché limpio (Ctrl+Shift+R)
- [ ] El frontend responde: `curl -I http://72.61.37.46/`
- [ ] El API responde: `curl http://72.61.37.46/api/`
