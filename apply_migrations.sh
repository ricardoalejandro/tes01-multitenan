#!/bin/bash
# Script para aplicar migraciones SQL manualmente

# Cargar variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 Aplicando migraciones SQL..."

# Lista de migraciones en orden
MIGRATIONS=(
    "001_mejoras_ux.sql"
    "002_add_status_soft_delete.sql"
    "003_create_course_topics.sql"
    "004_student_global_multitenancy.sql"
    "005_advanced_groups.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    echo "📄 Aplicando: $migration"
    docker exec -i -e PGPASSWORD=${POSTGRES_PASSWORD} multitenant_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < backend/src/db/migrations/$migration
    
    if [ $? -eq 0 ]; then
        echo "✅ $migration aplicado correctamente"
    else
        echo "❌ Error aplicando $migration"
        exit 1
    fi
done

echo "✨ Todas las migraciones aplicadas correctamente"
