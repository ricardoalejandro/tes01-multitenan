#!/bin/bash

# Script de Verificación Post-Migración
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  VERIFICACIÓN POST-MIGRACIÓN"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

ERRORS=0
WARNINGS=0

echo "📋 Ejecutando verificaciones exhaustivas..."
echo ""

# Función para ejecutar query y verificar
check_query() {
    local description=$1
    local query=$2
    local expected=$3
    
    result=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" | xargs)
    
    if [ "$result" == "$expected" ]; then
        echo "   ✅ $description: OK ($result)"
        return 0
    else
        echo "   ❌ $description: FALLÓ (esperado: $expected, obtenido: $result)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Función para verificar tabla existe
check_table_exists() {
    local table_name=$1
    local query="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name';"
    
    check_query "Tabla '$table_name' existe" "$query" "1"
}

# Función para verificar columna existe
check_column_exists() {
    local table_name=$1
    local column_name=$2
    local query="SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '$table_name' AND column_name = '$column_name';"
    
    check_query "Columna '$table_name.$column_name' existe" "$query" "1"
}

# 1. VERIFICAR TABLAS
echo "1️⃣  VERIFICACIÓN DE TABLAS"
echo ""

check_table_exists "roles"
check_table_exists "role_permissions"
check_table_exists "user_branch_roles"
check_table_exists "philosophical_counseling"
check_table_exists "system_config"
check_table_exists "password_reset_tokens"

echo ""

# 2. VERIFICAR COLUMNAS EN USERS
echo "2️⃣  VERIFICACIÓN DE COLUMNAS EN 'users'"
echo ""

check_column_exists "users" "email"
check_column_exists "users" "email_verified"

echo ""

# 3. VERIFICAR ROLES BASE
echo "3️⃣  VERIFICACIÓN DE ROLES BASE"
echo ""

check_query "Total de roles" "SELECT COUNT(*) FROM roles;" "3"
check_query "Rol 'Super Admin' existe" "SELECT COUNT(*) FROM roles WHERE slug = 'super-admin';" "1"
check_query "Rol 'Admin' existe" "SELECT COUNT(*) FROM roles WHERE slug = 'admin';" "1"
check_query "Rol 'Instructor' existe" "SELECT COUNT(*) FROM roles WHERE slug = 'instructor';" "1"

echo ""

# 4. VERIFICAR PERMISOS
echo "4️⃣  VERIFICACIÓN DE PERMISOS"
echo ""

EXPECTED_PERMISSIONS=21
ACTUAL_PERMISSIONS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions;" | xargs)

if [ "$ACTUAL_PERMISSIONS" == "$EXPECTED_PERMISSIONS" ]; then
    echo "   ✅ Total de permisos: OK ($ACTUAL_PERMISSIONS)"
else
    echo "   ⚠️  Total de permisos: $ACTUAL_PERMISSIONS (esperado: $EXPECTED_PERMISSIONS)"
    WARNINGS=$((WARNINGS + 1))
fi

# Verificar permisos por rol
SUPERADMIN_PERMS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE slug = 'super-admin');" | xargs)
ADMIN_PERMS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE slug = 'admin');" | xargs)
INSTRUCTOR_PERMS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE slug = 'instructor');" | xargs)

echo "   - Super Admin: $SUPERADMIN_PERMS permisos"
echo "   - Admin: $ADMIN_PERMS permisos"
echo "   - Instructor: $INSTRUCTOR_PERMS permisos"

echo ""

# 5. VERIFICAR EMAILS TEMPORALES
echo "5️⃣  VERIFICACIÓN DE EMAILS"
echo ""

TOTAL_USERS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | xargs)
USERS_WITH_EMAIL=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email IS NOT NULL AND email != '';" | xargs)
USERS_WITH_TEMP_EMAIL=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%@temp.escolastica.local';" | xargs)

echo "   Total usuarios: $TOTAL_USERS"
echo "   Usuarios con email: $USERS_WITH_EMAIL"
echo "   Usuarios con email temporal: $USERS_WITH_TEMP_EMAIL"

if [ "$TOTAL_USERS" == "$USERS_WITH_EMAIL" ]; then
    echo "   ✅ Todos los usuarios tienen email"
else
    echo "   ❌ Algunos usuarios sin email"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 6. VERIFICAR ÍNDICES
echo "6️⃣  VERIFICACIÓN DE ÍNDICES"
echo ""

INDEXES=(
    "users:idx_users_email"
    "user_branch_roles:idx_user_branch_roles_user"
    "user_branch_roles:idx_user_branch_roles_branch"
    "password_reset_tokens:idx_password_reset_tokens_token"
)

for index_info in "${INDEXES[@]}"; do
    IFS=':' read -r table_name index_name <<< "$index_info"
    query="SELECT COUNT(*) FROM pg_indexes WHERE tablename = '$table_name' AND indexname = '$index_name';"
    check_query "Índice '$index_name'" "$query" "1"
done

echo ""

# 7. VERIFICAR CONSTRAINTS
echo "7️⃣  VERIFICACIÓN DE CONSTRAINTS (FK)"
echo ""

CONSTRAINTS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('role_permissions', 'user_branch_roles', 'password_reset_tokens');" | xargs)

if [ "$CONSTRAINTS" -ge 5 ]; then
    echo "   ✅ Foreign Keys creadas: $CONSTRAINTS"
else
    echo "   ⚠️  Foreign Keys encontradas: $CONSTRAINTS (esperado: >= 5)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 8. VERIFICAR TRIGGERS
echo "8️⃣  VERIFICACIÓN DE TRIGGERS"
echo ""

TRIGGERS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table IN ('roles', 'role_permissions', 'users', 'user_branch_roles', 'philosophical_counseling', 'system_config', 'password_reset_tokens');" | xargs)

echo "   Triggers encontrados: $TRIGGERS"
if [ "$TRIGGERS" -ge 14 ]; then
    echo "   ✅ Triggers (updated_at) presentes"
else
    echo "   ℹ️  Algunos triggers no encontrados (puede ser normal)"
fi

echo ""

# 9. VERIFICAR INTEGRIDAD REFERENCIAL
echo "9️⃣  VERIFICACIÓN DE INTEGRIDAD REFERENCIAL"
echo ""

# Verificar que role_permissions apunta a roles válidos
INVALID_ROLE_PERMS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions WHERE role_id NOT IN (SELECT id FROM roles);" | xargs)

if [ "$INVALID_ROLE_PERMS" == "0" ]; then
    echo "   ✅ Todas las referencias role_permissions → roles son válidas"
else
    echo "   ❌ Referencias inválidas en role_permissions: $INVALID_ROLE_PERMS"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 10. VERIFICAR DATOS DE EJEMPLO
echo "🔟 VERIFICACIÓN DE DATOS DE EJEMPLO"
echo ""

SUPER_ADMIN_ID=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM roles WHERE slug = 'super-admin';" | xargs)
echo "   Super Admin ID: $SUPER_ADMIN_ID"

MODULES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT DISTINCT module FROM role_permissions ORDER BY module;" | xargs)
echo "   Módulos con permisos: $MODULES"

echo ""

# RESUMEN FINAL
echo "================================================"
echo "  RESUMEN DE VERIFICACIÓN"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ VERIFICACIÓN EXITOSA"
    echo "   - Errores: 0"
    echo "   - Advertencias: $WARNINGS"
    echo ""
    echo "🎉 La migración se completó correctamente"
    echo ""
    echo "📝 Próximos pasos:"
    echo "   1. Ejecutar: ./07_list_users_branches.sh"
    echo "   2. Asignar roles: ./08_assign_admin_roles.sh"
    echo ""
    exit 0
else
    echo "❌ VERIFICACIÓN FALLÓ"
    echo "   - Errores: $ERRORS"
    echo "   - Advertencias: $WARNINGS"
    echo ""
    echo "⚠️  Revisa los errores anteriores antes de continuar"
    echo ""
    echo "💡 Opciones:"
    echo "   - Corregir manualmente los problemas"
    echo "   - Revertir migración: ./13_rollback_database.sh"
    echo ""
    exit 1
fi
