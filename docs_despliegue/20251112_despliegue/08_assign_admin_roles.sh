#!/bin/bash

# Script de Asignación Automática de Roles Admin
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  ASIGNACIÓN AUTOMÁTICA DE ROLES ADMIN"
echo "================================================"
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "📋 Este script asignará automáticamente roles a usuarios existentes"
echo "   basándose en su 'user_type' actual."
echo ""

# Verificar conexión
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi

# Obtener estadísticas previas
USERS_WITH_ROLES_BEFORE=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT user_id) FROM user_branch_roles;" | xargs)
USERS_ADMIN=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'admin';" | xargs)
USERS_INSTRUCTOR=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'instructor';" | xargs)
USERS_STUDENT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'student';" | xargs)

echo "📊 Estadísticas actuales:"
echo "   - Usuarios con roles: $USERS_WITH_ROLES_BEFORE"
echo "   - Usuarios tipo 'admin': $USERS_ADMIN"
echo "   - Usuarios tipo 'instructor': $USERS_INSTRUCTOR"
echo "   - Usuarios tipo 'student': $USERS_STUDENT"
echo ""

# Explicar qué hará el script
echo "🎯 Este script hará lo siguiente:"
echo ""
echo "1. Usuarios con user_type='admin' → Rol 'Admin' en su sucursal"
echo "2. Usuarios con user_type='instructor' → Rol 'Instructor' en su sucursal"
echo "3. NO asignará roles a usuarios tipo 'student' (no tienen acceso al sistema)"
echo ""

# Confirmar
read -p "¿Continuar con la asignación automática? (s/N): " confirm
if [[ ! $confirm =~ ^[sS]$ ]]; then
    echo "❌ Asignación cancelada"
    exit 1
fi

echo ""
echo "🚀 Asignando roles..."
echo ""

# SQL para asignar roles
SQL_SCRIPT=$(cat <<'EOF'
-- Asignar rol 'Admin' a usuarios tipo 'admin'
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by, assigned_at)
SELECT 
    u.id as user_id,
    u.branch_id,
    r.id as role_id,
    1 as assigned_by, -- Usuario 1 (asumiendo es superadmin)
    NOW() as assigned_at
FROM users u
CROSS JOIN roles r
WHERE u.user_type = 'admin'
  AND u.branch_id IS NOT NULL
  AND r.slug = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_roles ubr
    WHERE ubr.user_id = u.id 
      AND ubr.branch_id = u.branch_id
  );

-- Asignar rol 'Instructor' a usuarios tipo 'instructor'
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by, assigned_at)
SELECT 
    u.id as user_id,
    u.branch_id,
    r.id as role_id,
    1 as assigned_by,
    NOW() as assigned_at
FROM users u
CROSS JOIN roles r
WHERE u.user_type = 'instructor'
  AND u.branch_id IS NOT NULL
  AND r.slug = 'instructor'
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_roles ubr
    WHERE ubr.user_id = u.id 
      AND ubr.branch_id = u.branch_id
  );
EOF
)

# Ejecutar asignación
if echo "$SQL_SCRIPT" | PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo "✅ Asignación ejecutada"
else
    echo "❌ Error al asignar roles"
    exit 1
fi

echo ""

# Verificar resultados
USERS_WITH_ROLES_AFTER=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT user_id) FROM user_branch_roles;" | xargs)
NEW_ASSIGNMENTS=$((USERS_WITH_ROLES_AFTER - USERS_WITH_ROLES_BEFORE))

echo "📊 Resultados:"
echo "   - Usuarios con roles ANTES: $USERS_WITH_ROLES_BEFORE"
echo "   - Usuarios con roles AHORA: $USERS_WITH_ROLES_AFTER"
echo "   - Nuevas asignaciones: $NEW_ASSIGNMENTS"
echo ""

# Mostrar desglose
echo "🔍 Desglose de roles asignados:"
echo ""

PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    r.name as \"Rol\",
    COUNT(*) as \"Usuarios\",
    COUNT(DISTINCT ubr.branch_id) as \"Sucursales\"
FROM user_branch_roles ubr
JOIN roles r ON ubr.role_id = r.id
GROUP BY r.name
ORDER BY r.name;
"

echo ""

# Verificar usuarios sin roles
USERS_WITHOUT_ROLES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM user_branch_roles) AND user_type != 'student';" | xargs)

if [ "$USERS_WITHOUT_ROLES" -gt 0 ]; then
    echo "⚠️  Todavía hay $USERS_WITHOUT_ROLES usuarios sin roles (excluyendo estudiantes)"
    echo ""
    echo "Usuarios que requieren asignación manual:"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        u.id as \"ID\",
        u.username as \"Usuario\",
        u.user_type as \"Tipo\",
        b.name as \"Sucursal\"
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.id NOT IN (SELECT DISTINCT user_id FROM user_branch_roles)
      AND u.user_type != 'student'
    ORDER BY u.id;
    "
    echo ""
    echo "💡 Para asignar roles manualmente, edita y ejecuta:"
    echo "   ./09_assign_custom_roles.sql"
fi

echo ""

# Mostrar ejemplos de usuarios con roles asignados
echo "✅ EJEMPLOS DE USUARIOS CON ROLES:"
echo ""

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
ORDER BY ubr.assigned_at DESC
LIMIT 10;
"

echo ""
echo "✅ ASIGNACIÓN COMPLETADA"
echo ""

if [ "$NEW_ASSIGNMENTS" -gt 0 ]; then
    echo "🎉 Se asignaron $NEW_ASSIGNMENTS roles exitosamente"
else
    echo "ℹ️  No se realizaron nuevas asignaciones (ya estaban asignados)"
fi

echo ""
echo "📝 Próximo paso:"
echo "   Iniciar servicios: ./10_start_backend.sh"
echo ""
