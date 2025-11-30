#!/bin/bash
# Script para hacer backup de la base de datos de Probacionismo
set -e

# Cargar variables de entorno
source /root/proyectos/Probacionismo/.env 2>/dev/null || true

# Variables
BACKUP_DIR="/root/backupsBD/probacionismo"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"
DB_USER="${POSTGRES_USER:-multitenant_prod}"
DB_NAME="${POSTGRES_DB:-multitenant_production}"

# Crear directorio si no existe
mkdir -p ${BACKUP_DIR}

echo "🔄 Creando backup de la base de datos..."
echo "📁 Archivo: ${BACKUP_FILE}"
echo "👤 Usuario: ${DB_USER}"
echo "📊 Base de datos: ${DB_NAME}"

# Crear backup
docker exec multitenant_postgres pg_dump -U ${DB_USER} ${DB_NAME} | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente"
    echo "📊 Tamaño: $(du -h ${BACKUP_FILE} | cut -f1)"
    
    # Limpiar backups antiguos (mantener últimos 30 días)
    echo ""
    echo "🧹 Limpiando backups antiguos (>30 días)..."
    find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh ${BACKUP_DIR}/ | tail -10
else
    echo "❌ Error al crear backup"
    exit 1
fi
