#!/bin/bash

# Script para Listar Usuarios y Sucursales
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  LISTADO DE USUARIOS Y SUCURSALES"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "📋 Este script te ayudará a identificar usuarios y sucursales"
echo "   para asignar roles en el siguiente paso."
echo ""

# Verificar conexión
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi

# 1. LISTAR SUCURSALES
echo "🏢 SUCURSALES DISPONIBLES"
echo "================================================"
echo ""

PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    id as \"ID\",
    name as \"Nombre\",
    code as \"Código\",
    is_active as \"Activa\"
FROM branches
ORDER BY id;
" | tee /tmp/escolastica_branches.txt

echo ""

# 2. LISTAR USUARIOS
echo "👥 USUARIOS REGISTRADOS"
echo "================================================"
echo ""

PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    u.id as \"ID\",
    u.username as \"Usuario\",
    u.email as \"Email\",
    u.user_type as \"Tipo\",
    b.name as \"Sucursal\",
    u.is_active as \"Activo\"
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
ORDER BY u.id;
" | tee /tmp/escolastica_users.txt

echo ""

# 3. LISTAR ROLES DISPONIBLES
echo "🎭 ROLES DISPONIBLES"
echo "================================================"
echo ""

PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    id as \"ID\",
    name as \"Nombre\",
    slug as \"Slug\",
    description as \"Descripción\",
    is_system as \"Sistema\"
FROM roles
ORDER BY id;
" | tee /tmp/escolastica_roles.txt

echo ""

# 4. VERIFICAR ROLES YA ASIGNADOS
echo "🔗 ROLES YA ASIGNADOS (si existen)"
echo "================================================"
echo ""

ASSIGNED_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM user_branch_roles;" | xargs)

if [ "$ASSIGNED_COUNT" -eq 0 ]; then
    echo "   ℹ️  No hay roles asignados todavía"
else
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        u.username as \"Usuario\",
        b.name as \"Sucursal\",
        r.name as \"Rol\",
        ubr.assigned_at as \"Asignado\"
    FROM user_branch_roles ubr
    JOIN users u ON ubr.user_id = u.id
    JOIN branches b ON ubr.branch_id = b.id
    JOIN roles r ON ubr.role_id = r.id
    ORDER BY ubr.assigned_at DESC;
    "
fi

echo ""

# 5. ESTADÍSTICAS
echo "📊 ESTADÍSTICAS"
echo "================================================"
echo ""

TOTAL_USERS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | xargs)
TOTAL_BRANCHES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM branches;" | xargs)
TOTAL_ROLES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
USERS_WITH_ROLES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT user_id) FROM user_branch_roles;" | xargs)
USERS_WITHOUT_ROLES=$((TOTAL_USERS - USERS_WITH_ROLES))

echo "   Total de usuarios: $TOTAL_USERS"
echo "   Total de sucursales: $TOTAL_BRANCHES"
echo "   Total de roles: $TOTAL_ROLES"
echo "   Usuarios con roles: $USERS_WITH_ROLES"
echo "   Usuarios sin roles: $USERS_WITHOUT_ROLES"

echo ""

# 6. RECOMENDACIONES
echo "💡 RECOMENDACIONES"
echo "================================================"
echo ""

if [ "$USERS_WITHOUT_ROLES" -gt 0 ]; then
    echo "⚠️  Hay $USERS_WITHOUT_ROLES usuarios sin roles asignados"
    echo ""
    echo "Usuarios que requieren asignación de roles:"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        u.id,
        u.username,
        u.user_type,
        b.name as branch
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.id NOT IN (SELECT DISTINCT user_id FROM user_branch_roles)
    ORDER BY u.id;
    " | while read line; do
        if [ -n "$line" ]; then
            echo "   - $line"
        fi
    done
    
    echo ""
    echo "📝 Próximo paso: Asignar roles a estos usuarios"
    echo "   Ejecutar: ./08_assign_admin_roles.sh"
fi

echo ""

# 7. EXPORTAR DATOS
echo "💾 DATOS EXPORTADOS"
echo "================================================"
echo ""
echo "Los listados se han guardado en:"
echo "   - /tmp/escolastica_branches.txt"
echo "   - /tmp/escolastica_users.txt"
echo "   - /tmp/escolastica_roles.txt"
echo ""
echo "Puedes consultarlos con:"
echo "   cat /tmp/escolastica_users.txt"
echo ""

# 8. EJEMPLOS DE ASIGNACIÓN
echo "📖 EJEMPLOS DE ASIGNACIÓN DE ROLES"
echo "================================================"
echo ""
echo "Para asignar roles manualmente, usa estos comandos SQL:"
echo ""
echo "-- Asignar rol 'Admin' a usuario 1 en sucursal 1"
echo "INSERT INTO user_branch_roles (user_id, branch_id, role_id)"
echo "VALUES ("
echo "  1,"
echo "  1,"
echo "  (SELECT id FROM roles WHERE slug = 'admin')"
echo ");"
echo ""
echo "-- Asignar rol 'Instructor' a usuario 2 en sucursal 1"
echo "INSERT INTO user_branch_roles (user_id, branch_id, role_id)"
echo "VALUES ("
echo "  2,"
echo "  1,"
echo "  (SELECT id FROM roles WHERE slug = 'instructor')"
echo ");"
echo ""

echo "✅ LISTADO COMPLETADO"
echo ""
echo "📝 Próximo paso:"
echo "   ./08_assign_admin_roles.sh (asignación automática de roles admin)"
echo "   O editar: 09_assign_custom_roles.sql (asignación manual personalizada)"
echo ""
