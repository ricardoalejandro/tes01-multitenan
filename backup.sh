#!/bin/bash
# Script para hacer backup de la base de datos de Probacionismo

# Directorio de backups
BACKUP_DIR="/root/backups/probacionismo"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql.gz"

# Crear directorio si no existe
mkdir -p ${BACKUP_DIR}

echo "🔄 Creando backup de la base de datos..."
echo "📁 Archivo: ${BACKUP_FILE}"

# Crear backup
docker exec multitenant_postgres pg_dump -U postgres multitenant_db | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente"
    echo "📊 Tamaño: $(du -h ${BACKUP_FILE} | cut -f1)"
    
    # Limpiar backups antiguos (mantener últimos 30 días)
    echo ""
    echo "🧹 Limpiando backups antiguos (>30 días)..."
    find ${BACKUP_DIR} -name "db_backup_*.sql.gz" -mtime +30 -delete
    
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh ${BACKUP_DIR}/ | tail -10
else
    echo "❌ Error al crear backup"
    exit 1
fi
