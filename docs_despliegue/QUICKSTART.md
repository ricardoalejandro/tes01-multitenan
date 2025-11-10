# ⚡ Quick Start - Despliegue Rápido

## 🎯 Tu Flujo de Trabajo Diario

```bash
# 1. Conectarse al VPS
ssh root@72.61.37.46

# 2. Actualizar código y desplegar
cd /root/proyectos/probacionismo && git pull origin develop && ./update.sh
```

¡Eso es todo! Tu aplicación se actualizará automáticamente.

---

## 📋 Comandos Esenciales

### Desplegar cambios
```bash
cd /root/proyectos/probacionismo
git pull origin develop
./update.sh
```

### Ver estado
```bash
docker compose ps
```

### Ver logs
```bash
docker compose logs -f frontend
docker compose logs -f backend
```

### Reiniciar (sin rebuild)
```bash
docker compose restart
```

---

## 🌐 URLs

- **Aplicación:** http://72.61.37.46/
- **Login:** http://72.61.37.46/login
- **Dashboard:** http://72.61.37.46/dashboard
- **API:** http://72.61.37.46/api/

---

## 🐛 Si algo falla

1. **Ver logs:**
   ```bash
   docker compose logs --tail=50
   ```

2. **Reiniciar:**
   ```bash
   docker compose restart
   ```

3. **Rebuild completo:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

4. **Limpiar caché del navegador:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

---

## 📚 Más Ayuda

- **Guía completa:** `DEPLOYMENT_GUIDE.md`
- **Solución de problemas:** `TROUBLESHOOTING.md`

---

## 💡 Tips

### Ver qué cambió en el último pull
```bash
git log -1 --stat
```

### Hacer backup de la base de datos
```bash
docker exec multitenant_postgres pg_dump -U postgres multitenant_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Cambiar a otra rama
```bash
git checkout nombre-rama
git pull origin nombre-rama
./update.sh
```

### Ver estructura de archivos actualizada
```bash
git pull origin develop && ls -la
```

---

## ⚡ Atajos Útiles

### Todo en un comando
```bash
# SSH + Pull + Deploy
ssh root@72.61.37.46 'cd /root/proyectos/probacionismo && git pull origin develop && ./update.sh'
```

### Alias para tu máquina local (opcional)
Agrega esto a tu `~/.bashrc` o `~/.zshrc`:

```bash
alias deploy-probacionismo="ssh root@72.61.37.46 'cd /root/proyectos/probacionismo && git pull origin develop && ./update.sh'"
```

Luego solo ejecuta desde tu máquina local:
```bash
deploy-probacionismo
```

---

## 🎉 ¡Listo para producción!

Cada vez que hagas `git push` a develop, solo necesitas:

1. SSH al VPS
2. `git pull`
3. `./update.sh`

¡Así de simple! 🚀
