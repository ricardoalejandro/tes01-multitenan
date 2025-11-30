#!/bin/bash
# ===========================================
# Script de Despliegue - Probacionismo
# ===========================================
set -e

cd /root/proyectos/Probacionismo

echo "🚀 Iniciando despliegue de Probacionismo..."
echo "📅 $(date)"
echo ""

# 1. Hacer backup antes del despliegue
echo "📦 Creando backup pre-despliegue..."
./backup.sh || echo "⚠️  Backup falló (puede ser primera vez)"
echo ""

# 2. Actualizar código
echo "📥 Actualizando código desde git..."
git fetch origin develop
git reset --hard origin/develop
echo ""

# 3. Detener contenedores (preserva volúmenes)
echo "🛑 Deteniendo contenedores..."
docker compose down
echo ""

# 4. Reconstruir imágenes
echo "�� Reconstruyendo imágenes..."
docker compose build --no-cache
echo ""

# 5. Iniciar servicios
echo "🚀 Iniciando servicios..."
docker compose up -d
echo ""

# 6. Esperar a que los servicios estén healthy
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# 7. Verificar estado
echo "✅ Verificando estado..."
docker compose ps
echo ""

# 8. Health check
echo "🏥 Health checks..."
curl -s http://localhost:3000/health || echo "⚠️  Backend no responde"
echo ""
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:5000
echo ""

echo "🎉 Despliegue completado!"
echo "🌐 URL: https://naperu.cloud"
echo "📅 $(date)"
