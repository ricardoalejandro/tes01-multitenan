#!/bin/bash

# Script de Verificación de Base de Datos Pre-Migración
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  VERIFICACIÓN DE BASE DE DATOS"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "📋 Configuración:"
echo "   - Usuario: $DB_USER"
echo "   - Base de datos: $DB_NAME"
echo "   - Host: $DB_HOST:$DB_PORT"
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

# Verificar tablas existentes
echo "📊 Verificando estructura actual..."

# Contar tablas
TABLE_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "   Tablas existentes: $TABLE_COUNT"

# Listar tablas
echo ""
echo "📁 Tablas encontradas:"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | while read table; do
    if [ -n "$table" ]; then
        ROW_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;")
        echo "   - $table ($ROW_COUNT registros)"
    fi
done
echo ""

# Verificar que NO existan las nuevas tablas
echo "🔍 Verificando que tablas de roles NO existan (pre-migración)..."

NEW_TABLES=("roles" "role_permissions" "user_branch_roles" "philosophical_counseling" "system_config" "password_reset_tokens")
TABLES_FOUND=()

for table in "${NEW_TABLES[@]}"; do
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | grep -q 1; then
        echo "   ⚠️  Tabla '$table' YA EXISTE"
        TABLES_FOUND+=($table)
    else
        echo "   ✅ Tabla '$table' no existe (correcto)"
    fi
done
echo ""

if [ ${#TABLES_FOUND[@]} -gt 0 ]; then
    echo "⚠️  ADVERTENCIA: Las siguientes tablas ya existen:"
    for table in "${TABLES_FOUND[@]}"; do
        echo "   - $table"
    done
    echo ""
    echo "❓ ¿Deseas continuar de todas formas?"
    echo "   Esto podría indicar que la migración ya se ejecutó."
    echo ""
    read -p "Continuar? (s/N): " confirm
    if [[ ! $confirm =~ ^[sS]$ ]]; then
        echo "❌ Verificación cancelada"
        exit 1
    fi
fi

# Verificar usuarios
echo "👥 Verificando usuarios..."
USER_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;")
echo "   Total usuarios: $USER_COUNT"

# Verificar que usuarios tengan email
USERS_WITHOUT_EMAIL=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email IS NULL OR email = '';")
echo "   Usuarios sin email: $USERS_WITHOUT_EMAIL"

if [ "$USERS_WITHOUT_EMAIL" -gt 0 ]; then
    echo "   ⚠️  La migración asignará emails temporales a estos usuarios"
fi
echo ""

# Verificar branches
echo "🏢 Verificando sucursales..."
BRANCH_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM branches;")
echo "   Total sucursales: $BRANCH_COUNT"

if [ "$BRANCH_COUNT" -eq 0 ]; then
    echo "   ⚠️  No hay sucursales. Ejecuta seed antes de migrar."
    exit 1
fi
echo ""

# Verificar versión de PostgreSQL
echo "🗄️  Verificando versión de PostgreSQL..."
PG_VERSION=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();")
echo "   $PG_VERSION"
echo ""

# Resumen
echo "================================================"
echo "  RESUMEN DE VERIFICACIÓN"
echo "================================================"
echo ""
echo "✅ Conexión a base de datos: OK"
echo "✅ Tablas existentes: $TABLE_COUNT"
echo "✅ Usuarios registrados: $USER_COUNT"
echo "✅ Sucursales disponibles: $BRANCH_COUNT"

if [ ${#TABLES_FOUND[@]} -gt 0 ]; then
    echo "⚠️  Tablas de roles ya existen: ${#TABLES_FOUND[@]}"
else
    echo "✅ Tablas de roles no existen (listo para migrar)"
fi

echo ""
echo "✅ BASE DE DATOS LISTA PARA MIGRACIÓN"
echo ""
echo "📝 Próximo paso:"
echo "   Ejecutar: ./05_run_migration.sh"
echo ""
