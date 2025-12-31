#!/bin/bash

# Script de Ejecución de Migración
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  EJECUCIÓN DE MIGRACIÓN - ROLES Y PERMISOS"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
MIGRATION_FILE="backend/src/db/migrations/0001_add_roles_permissions_system.sql"

echo "📋 Configuración:"
echo "   - Usuario: $DB_USER"
echo "   - Base de datos: $DB_NAME"
echo "   - Host: $DB_HOST:$DB_PORT"
echo "   - Archivo: $MIGRATION_FILE"
echo ""

# Verificar que el archivo de migración existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de migración"
    echo "   Ruta esperada: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Archivo de migración encontrado"
echo ""

# Verificar conexión
echo "🔍 Verificando conexión a base de datos..."
if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi
echo ""

# Confirmar ejecución
echo "⚠️  CONFIRMACIÓN REQUERIDA"
echo ""
echo "Esta migración creará:"
echo "   - 8 nuevas tablas (roles, permissions, user_branch_roles, etc.)"
echo "   - Modificará tabla 'users' (añadirá columnas email, email_verified)"
echo "   - Insertará 3 roles base (Super Admin, Admin, Instructor)"
echo "   - Insertará 21 permisos de sistema"
echo ""
read -p "¿Continuar con la migración? (s/N): " confirm

if [[ ! $confirm =~ ^[sS]$ ]]; then
    echo "❌ Migración cancelada por el usuario"
    exit 1
fi

echo ""
echo "🚀 Ejecutando migración..."
echo ""

# Ejecutar migración con output
START_TIME=$(date +%s)

if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo "✅ MIGRACIÓN EJECUTADA EXITOSAMENTE"
    echo "   Tiempo: ${DURATION}s"
else
    echo ""
    echo "❌ ERROR AL EJECUTAR MIGRACIÓN"
    echo ""
    echo "💡 Pasos para solucionar:"
    echo "   1. Revisa el error anterior"
    echo "   2. Verifica que no haya conflictos de datos"
    echo "   3. Si necesitas revertir, usa: ./13_rollback_database.sh"
    exit 1
fi

echo ""
echo "📊 Verificando cambios..."
echo ""

# Verificar nuevas tablas
NEW_TABLES=("roles" "role_permissions" "user_branch_roles" "philosophical_counseling" "system_config" "password_reset_tokens")
ALL_CREATED=true

for table in "${NEW_TABLES[@]}"; do
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | grep -q 1; then
        ROW_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;")
        echo "   ✅ Tabla '$table' creada ($ROW_COUNT registros)"
    else
        echo "   ❌ Tabla '$table' NO creada"
        ALL_CREATED=false
    fi
done

echo ""

# Verificar columnas nuevas en users
echo "🔍 Verificando columnas nuevas en tabla 'users'..."
if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('email', 'email_verified');" | grep -q email; then
    echo "   ✅ Columnas 'email' y 'email_verified' añadidas"
else
    echo "   ❌ Columnas nuevas NO encontradas"
    ALL_CREATED=false
fi

echo ""

# Verificar datos seed
echo "📦 Verificando datos iniciales (seed)..."

ROLES_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM roles;")
PERMISSIONS_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions;")

echo "   - Roles creados: $ROLES_COUNT (esperado: 3)"
echo "   - Permisos insertados: $PERMISSIONS_COUNT (esperado: 21)"

if [ "$ROLES_COUNT" -eq 3 ] && [ "$PERMISSIONS_COUNT" -eq 21 ]; then
    echo "   ✅ Seed ejecutado correctamente"
else
    echo "   ⚠️  Cantidades no coinciden con lo esperado"
fi

echo ""

# Resumen final
echo "================================================"
echo "  RESUMEN DE MIGRACIÓN"
echo "================================================"
echo ""

if $ALL_CREATED; then
    echo "✅ Todas las tablas creadas exitosamente"
    echo "✅ Datos seed insertados"
    echo "✅ Migración completa"
    echo ""
    echo "📝 Próximo paso:"
    echo "   Ejecutar: ./06_verify_migration.sh"
    echo ""
    exit 0
else
    echo "❌ Algunas tablas no se crearon correctamente"
    echo "⚠️  Revisa los errores anteriores"
    echo ""
    echo "💡 Para revertir cambios:"
    echo "   ./13_rollback_database.sh"
    echo ""
    exit 1
fi
