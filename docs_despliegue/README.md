# 📚 Documentación de Despliegue - Probacionismo

Documentación operativa para el despliegue y mantenimiento de la aplicación en producción.

## 🚀 Quick Start

**Desplegar cambios en producción:**
```bash
ssh root@72.61.37.46 'cd /root/proyectos/probacionismo && ./deploy.sh'
```

## 📋 Documentos Disponibles

1. **[QUICKSTART.md](QUICKSTART.md)** ⭐ EMPIEZA AQUÍ
   - Comando de despliegue automático
   - URLs de producción
   - Comandos esenciales
   - Solución rápida de problemas

2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** 📖 Guía Completa
   - Proceso de despliegue detallado
   - Configuración de variables de entorno
   - Arquitectura de la aplicación
   - Backups automáticos
   - Protección de datos
   - Solución de problemas
   - Comandos útiles

## 🌐 Información de Producción

- **URL:** https://naperu.cloud
- **VPS:** 72.61.37.46
- **Ubicación:** `/root/proyectos/probacionismo`
- **Rama:** `develop`

## 🎯 Flujo de Trabajo

1. Desarrollas y haces commit/push a `develop`
2. Ejecutas `./deploy.sh` en el VPS
3. ¡Listo! Cambios en producción

## 📞 Soporte

Para problemas específicos, consulta la sección de troubleshooting en `DEPLOYMENT_GUIDE.md` o revisa los logs:
```bash
docker compose logs -f
```
