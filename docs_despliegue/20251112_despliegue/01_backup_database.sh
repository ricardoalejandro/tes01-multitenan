#!/bin/bash

# Script de Backup de Base de Datos
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  BACKUP DE BASE DE DATOS - PRE DESPLIEGUE"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_pre_roles_$TIMESTAMP.dump"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "📋 Configuración:"
echo "   - Usuario: $DB_USER"
echo "   - Base de datos: $DB_NAME"
echo "   - Host: $DB_HOST:$DB_PORT"
echo "   - Archivo: $BACKUP_FILE"
echo ""

# Verificar conexión
echo "🔍 Verificando conexión a base de datos..."
if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error: No se puede conectar a la base de datos"
    echo "   Verifica las credenciales y que PostgreSQL esté corriendo"
    exit 1
fi

echo ""
echo "💾 Creando backup..."

# Crear backup
if PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"; then
    echo "✅ Backup creado exitosamente"
else
    echo "❌ Error al crear backup"
    exit 1
fi

# Verificar tamaño del backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "📊 Información del backup:"
echo "   - Archivo: $BACKUP_FILE"
echo "   - Tamaño: $BACKUP_SIZE"
echo ""

# Verificar integridad
echo "🔍 Verificando integridad del backup..."
if pg_restore -l "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "✅ Backup verificado correctamente"
else
    echo "⚠️  Advertencia: No se pudo verificar completamente el backup"
fi

echo ""
echo "✅ BACKUP COMPLETADO"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Guarda este backup en un lugar seguro"
echo "   2. Verifica que puedas acceder al archivo"
echo "   3. Considera copiar a almacenamiento externo"
echo ""
echo "💡 Para restaurar en caso de emergencia:"
echo "   pg_restore -U $DB_USER -d $DB_NAME -c $BACKUP_FILE"
echo ""
