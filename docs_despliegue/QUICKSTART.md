# ⚡ Quick Start - Despliegue Rápido

## 🎯 Despliegue en Un Solo Comando

```bash
ssh root@72.61.37.46 'cd /root/proyectos/probacionismo && ./deploy.sh'
```

¡Eso es todo! El script automáticamente:
- ✅ Actualiza el código desde git
- ✅ Aplica configuración de producción
- ✅ Reconstruye contenedores
- ✅ Preserva datos de base de datos
- ✅ Verifica que todo funcione

---

## 📋 Comandos Esenciales

### Desplegar cambios (recomendado)
```bash
./deploy.sh
```

### Ver estado
```bash
docker compose ps
```

### Ver logs
```bash
docker compose logs -f
```

### Hacer backup manual
```bash
./backup.sh
```

### Reiniciar servicios (sin rebuild)
```bash
docker compose restart
```

---

## 🌐 URLs

- **Aplicación:** https://naperu.cloud
- **Login:** https://naperu.cloud/login
- **Dashboard:** https://naperu.cloud/dashboard
- **API:** https://naperu.cloud/api/

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `escolastica123`

---

## 🐛 Si algo falla

### 1. Ver logs completos
```bash
docker compose logs --tail=100
```

### 2. Ver logs específicos
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### 3. Verificar configuración
```bash
cat .env.production
sudo nginx -t
```

### 4. Reiniciar Nginx
```bash
sudo systemctl restart nginx
```

### 5. Limpiar caché del navegador
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## 📚 Más Ayuda

- **Guía completa:** `DEPLOYMENT_GUIDE.md`
- **Solución de problemas:** `TROUBLESHOOTING.md`
- **Protección de datos:** `DATA_PROTECTION.md`

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
