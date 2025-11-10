#!/bin/bash
# Script para actualizar la aplicación Probacionismo después de hacer git pull
# ⚠️ IMPORTANTE: Este script PRESERVA la base de datos y datos de Redis

set -e

echo "🚀 Actualizando Probacionismo..."
echo ""
echo "⚠️  NOTA: Los datos de la base de datos se PRESERVARÁN"
echo ""

# Ir al directorio del proyecto
cd /root/proyectos/probacionismo

# Mostrar qué cambió
echo "📝 Últimos cambios:"
git log -1 --oneline
echo ""

# Detener contenedores (SIN borrar volúmenes)
echo "📦 Deteniendo contenedores (preservando datos)..."
docker compose down

# Reconstruir imágenes con el código nuevo
echo "🔨 Reconstruyendo imágenes con código actualizado..."
docker compose build --no-cache

# Levantar contenedores
echo "▶️  Iniciando contenedores..."
docker compose up -d

# Esperar a que estén saludables
echo "⏳ Esperando que los servicios estén listos..."
sleep 15

# Verificar estado
echo ""
echo "✅ Estado de los contenedores:"
docker compose ps

echo ""
echo "✨ ¡Actualización completada!"
echo "🌐 Accede a tu aplicación en: http://72.61.37.46/"
echo ""
echo "💡 Tip: Si hiciste cambios en el frontend, recuerda limpiar"
echo "   el caché del navegador con Ctrl+Shift+R"
echo ""
echo "📊 Base de datos: ✅ Datos preservados"
