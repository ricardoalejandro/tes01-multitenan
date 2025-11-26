#!/bin/bash

# Script de Health Check Completo
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  HEALTH CHECK COMPLETO - ESCOLASTICA"
echo "================================================"
echo ""

ERRORS=0
WARNINGS=0

# Colores para output (opcional)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para test exitoso
test_pass() {
    echo "   ✅ $1"
}

# Función para test fallido
test_fail() {
    echo "   ❌ $1"
    ERRORS=$((ERRORS + 1))
}

# Función para advertencia
test_warn() {
    echo "   ⚠️  $1"
    WARNINGS=$((WARNINGS + 1))
}

# ================================================
# 1. VERIFICAR SERVICIOS DE INFRAESTRUCTURA
# ================================================

echo "1️⃣  SERVICIOS DE INFRAESTRUCTURA"
echo "================================================"
echo ""

# PostgreSQL
echo "🗄️  PostgreSQL:"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"

if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    test_pass "PostgreSQL accesible ($DB_HOST:$DB_PORT)"
    
    # Verificar migración
    ROLES_TABLE=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'roles';" | xargs)
    if [ "$ROLES_TABLE" == "1" ]; then
        test_pass "Tabla 'roles' existe (migración aplicada)"
    else
        test_fail "Tabla 'roles' no existe (migración no aplicada)"
    fi
else
    test_fail "PostgreSQL no accesible"
fi

echo ""

# Redis (opcional)
echo "💾 Redis:"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
    test_pass "Redis accesible ($REDIS_HOST:$REDIS_PORT)"
else
    test_warn "Redis no accesible (opcional)"
fi

echo ""

# ================================================
# 2. VERIFICAR BACKEND
# ================================================

echo "2️⃣  BACKEND API"
echo "================================================"
echo ""

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

# Health endpoint
echo "🏥 Health Check:"
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
    test_pass "Endpoint /health responde"
    echo "      $HEALTH_RESPONSE"
else
    test_fail "Endpoint /health no responde"
fi

echo ""

# Auth endpoint
echo "🔐 Auth Endpoints:"
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/login" | grep -q "405\|400"; then
    test_pass "Endpoint /api/auth/login accesible"
else
    test_fail "Endpoint /api/auth/login no accesible"
fi

echo ""

# Nuevos endpoints de roles
echo "👥 Nuevos Endpoints (Roles y Permisos):"

# Test /api/users (debe requerir auth, esperamos 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/users")
if [ "$STATUS" == "401" ]; then
    test_pass "Endpoint /api/users protegido (401)"
else
    test_warn "Endpoint /api/users retorna $STATUS (esperado: 401)"
fi

# Test /api/roles (debe requerir auth)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/roles")
if [ "$STATUS" == "401" ]; then
    test_pass "Endpoint /api/roles protegido (401)"
else
    test_warn "Endpoint /api/roles retorna $STATUS (esperado: 401)"
fi

# Test /api/system/smtp (debe requerir auth)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/system/smtp")
if [ "$STATUS" == "401" ]; then
    test_pass "Endpoint /api/system/smtp protegido (401)"
else
    test_warn "Endpoint /api/system/smtp retorna $STATUS (esperado: 401)"
fi

echo ""

# ================================================
# 3. VERIFICAR FRONTEND
# ================================================

echo "3️⃣  FRONTEND"
echo "================================================"
echo ""

FRONTEND_URL="${FRONTEND_URL:-http://localhost:5000}"

# Página principal
echo "🏠 Página Principal:"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    test_pass "Frontend accesible ($FRONTEND_URL)"
    
    # Verificar que carga
    PAGE_CONTENT=$(curl -s "$FRONTEND_URL")
    if echo "$PAGE_CONTENT" | grep -q "escolastica\|Escolastica"; then
        test_pass "Contenido de Escolastica detectado"
    else
        test_warn "No se detectó contenido esperado"
    fi
else
    test_fail "Frontend no accesible"
fi

echo ""

# Login page
echo "🔑 Página de Login:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login")
if [ "$STATUS" == "200" ]; then
    test_pass "Página /login accesible"
else
    test_fail "Página /login no accesible (status: $STATUS)"
fi

echo ""

# Dashboard
echo "📊 Dashboard:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/dashboard")
if [ "$STATUS" == "200" ] || [ "$STATUS" == "307" ]; then
    test_pass "Página /dashboard accesible (status: $STATUS)"
else
    test_warn "Página /dashboard retorna status: $STATUS"
fi

echo ""

# Admin pages
echo "⚙️  Páginas de Administración:"

for page in "admin" "admin/branches" "admin/users" "admin/roles" "admin/smtp"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/$page")
    if [ "$STATUS" == "200" ] || [ "$STATUS" == "307" ]; then
        test_pass "/$page accesible (status: $STATUS)"
    else
        test_warn "/$page retorna status: $STATUS"
    fi
done

echo ""

# ================================================
# 4. TEST DE INTEGRACIÓN (LOGIN REAL)
# ================================================

echo "4️⃣  TEST DE INTEGRACIÓN"
echo "================================================"
echo ""

echo "🔐 Test de Login:"
echo "   Intentando login con credenciales de prueba..."

# Obtener primer usuario admin
ADMIN_USER=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT username FROM users WHERE user_type = 'admin' LIMIT 1;" | xargs)

if [ -n "$ADMIN_USER" ]; then
    echo "   Usuario de prueba: $ADMIN_USER"
    
    # Intentar login (sin password real, solo verificar endpoint)
    LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$ADMIN_USER\",\"password\":\"test\"}" \
        -w "\n%{http_code}" | tail -1)
    
    if [ "$LOGIN_RESPONSE" == "401" ] || [ "$LOGIN_RESPONSE" == "400" ]; then
        test_pass "Endpoint de login funcional (rechaza credenciales incorrectas)"
    elif [ "$LOGIN_RESPONSE" == "200" ]; then
        test_warn "Login exitoso con password de prueba (riesgo de seguridad)"
    else
        test_warn "Login retorna status inesperado: $LOGIN_RESPONSE"
    fi
else
    test_warn "No se encontró usuario admin para prueba"
fi

echo ""

# ================================================
# 5. VERIFICAR DATOS EN BASE DE DATOS
# ================================================

echo "5️⃣  DATOS EN BASE DE DATOS"
echo "================================================"
echo ""

# Roles
ROLES_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
if [ "$ROLES_COUNT" -ge 3 ]; then
    test_pass "Roles configurados: $ROLES_COUNT (esperado: >= 3)"
else
    test_fail "Roles insuficientes: $ROLES_COUNT"
fi

# Permisos
PERMS_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM role_permissions;" | xargs)
if [ "$PERMS_COUNT" -ge 21 ]; then
    test_pass "Permisos configurados: $PERMS_COUNT (esperado: >= 21)"
else
    test_warn "Permisos: $PERMS_COUNT (esperado: >= 21)"
fi

# Usuarios con roles
USERS_WITH_ROLES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT user_id) FROM user_branch_roles;" | xargs)
TOTAL_USERS=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type != 'student';" | xargs)

if [ "$USERS_WITH_ROLES" -gt 0 ]; then
    test_pass "Usuarios con roles asignados: $USERS_WITH_ROLES de $TOTAL_USERS"
else
    test_warn "No hay usuarios con roles asignados"
fi

# Emails configurados
USERS_WITHOUT_EMAIL=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email IS NULL OR email = '';" | xargs)
if [ "$USERS_WITHOUT_EMAIL" -eq 0 ]; then
    test_pass "Todos los usuarios tienen email"
else
    test_warn "$USERS_WITHOUT_EMAIL usuarios sin email"
fi

echo ""

# ================================================
# 6. VERIFICAR PROCESOS
# ================================================

echo "6️⃣  PROCESOS EN EJECUCIÓN"
echo "================================================"
echo ""

# Backend
if lsof -ti:3000 &> /dev/null; then
    BACKEND_PID=$(lsof -ti:3000)
    test_pass "Backend corriendo en puerto 3000 (PID: $BACKEND_PID)"
else
    test_fail "No hay proceso en puerto 3000 (backend)"
fi

# Frontend
if lsof -ti:5000 &> /dev/null; then
    FRONTEND_PID=$(lsof -ti:5000)
    test_pass "Frontend corriendo en puerto 5000 (PID: $FRONTEND_PID)"
else
    test_fail "No hay proceso en puerto 5000 (frontend)"
fi

echo ""

# ================================================
# RESUMEN FINAL
# ================================================

echo "================================================"
echo "  RESUMEN DEL HEALTH CHECK"
echo "================================================"
echo ""

TOTAL_TESTS=$((ERRORS + WARNINGS))

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 ¡TODOS LOS TESTS PASARON!"
    echo ""
    echo "✅ Sistema completamente operacional"
    echo "✅ Despliegue exitoso"
elif [ $ERRORS -eq 0 ]; then
    echo "✅ SISTEMA OPERACIONAL CON ADVERTENCIAS"
    echo ""
    echo "   Advertencias: $WARNINGS"
    echo ""
    echo "💡 Revisa las advertencias pero el sistema debería funcionar"
else
    echo "❌ HEALTH CHECK FALLÓ"
    echo ""
    echo "   Errores: $ERRORS"
    echo "   Advertencias: $WARNINGS"
    echo ""
    echo "⚠️  El sistema tiene problemas críticos"
fi

echo ""
echo "📊 Estadísticas:"
echo "   - Roles: $ROLES_COUNT"
echo "   - Permisos: $PERMS_COUNT"
echo "   - Usuarios con roles: $USERS_WITH_ROLES de $TOTAL_USERS"
echo "   - Backend: $BACKEND_URL"
echo "   - Frontend: $FRONTEND_URL"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "🚀 PRÓXIMOS PASOS:"
    echo ""
    echo "1. Accede a: $FRONTEND_URL"
    echo "2. Login con credenciales de admin"
    echo "3. Verifica el nuevo dashboard"
    echo "4. Accede al panel de administración"
    echo "5. Configura SMTP en /admin/smtp"
    echo "6. Prueba reseteo de contraseña"
    echo ""
    exit 0
else
    echo "🔧 ACCIONES RECOMENDADAS:"
    echo ""
    echo "1. Revisa los logs de backend y frontend"
    echo "2. Verifica las configuraciones de .env"
    echo "3. Asegúrate de que la migración se ejecutó correctamente"
    echo "4. Revisa la asignación de roles"
    echo ""
    echo "💡 Para rollback:"
    echo "   ./13_rollback_database.sh"
    echo ""
    exit 1
fi
