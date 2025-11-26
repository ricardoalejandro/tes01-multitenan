#!/bin/bash

# Script de Backup de Archivos Críticos
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  BACKUP DE ARCHIVOS - PRE DESPLIEGUE"
echo "================================================"
echo ""

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_files_pre_roles_$TIMESTAMP.tar.gz"

# Directorios a respaldar
DIRS_TO_BACKUP=(
    "backend/src"
    "backend/package.json"
    "backend/drizzle.config.ts"
    "src"
    "package.json"
    ".env"
    "backend/.env"
)

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "📋 Configuración:"
echo "   - Archivo destino: $BACKUP_FILE"
echo ""

echo "📦 Directorios a respaldar:"
for dir in "${DIRS_TO_BACKUP[@]}"; do
    if [ -e "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ⚠️  $dir (no existe)"
    fi
done
echo ""

# Verificar espacio disponible
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "💽 Espacio disponible: $AVAILABLE_SPACE"
echo ""

echo "💾 Creando backup de archivos..."

# Crear array de archivos que existen
EXISTING_FILES=()
for dir in "${DIRS_TO_BACKUP[@]}"; do
    if [ -e "$dir" ]; then
        EXISTING_FILES+=("$dir")
    fi
done

# Crear backup
if tar -czf "$BACKUP_FILE" "${EXISTING_FILES[@]}" 2>/dev/null; then
    echo "✅ Backup creado exitosamente"
else
    echo "❌ Error al crear backup"
    exit 1
fi

# Verificar tamaño del backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_COUNT=$(tar -tzf "$BACKUP_FILE" | wc -l)

echo ""
echo "📊 Información del backup:"
echo "   - Archivo: $BACKUP_FILE"
echo "   - Tamaño: $BACKUP_SIZE"
echo "   - Archivos: $FILE_COUNT"
echo ""

# Listar contenido principal
echo "📁 Contenido principal:"
tar -tzf "$BACKUP_FILE" | head -n 20
if [ $FILE_COUNT -gt 20 ]; then
    echo "   ... y $((FILE_COUNT - 20)) archivos más"
fi
echo ""

echo "✅ BACKUP DE ARCHIVOS COMPLETADO"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Guarda este backup en un lugar seguro"
echo "   2. Considera copiar a almacenamiento externo"
echo ""
echo "💡 Para restaurar en caso de emergencia:"
echo "   tar -xzf $BACKUP_FILE"
echo ""
