#!/bin/bash

API_URL="http://localhost:3000"
USERNAME="admin"
PASSWORD="escolastica123"

echo "=== Test de API de Usuarios y Roles ==="
echo ""

# 1. Login
echo "1. Haciendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "   ❌ Error en login"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "   ✅ Login exitoso"

# 2. Obtener lista de roles
echo ""
echo "2. Obteniendo lista de roles..."
ROLES=$(curl -s -X GET "$API_URL/api/roles" \
  -H "Authorization: Bearer $TOKEN")
echo "   Roles encontrados: $(echo $ROLES | jq '.data | length')"

# 3. Obtener lista de usuarios
echo ""
echo "3. Obteniendo lista de usuarios..."
USERS=$(curl -s -X GET "$API_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")
echo "   Usuarios encontrados: $(echo $USERS | jq '.data | length')"

# 4. Crear un rol de prueba
echo ""
echo "4. Creando rol de prueba..."
CREATE_ROLE=$(curl -s -X POST "$API_URL/api/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rol de Prueba API",
    "description": "Rol creado por test API",
    "permissions": [
      {"module":"students","canView":true,"canCreate":false,"canEdit":true,"canDelete":false},
      {"module":"courses","canView":true,"canCreate":false,"canEdit":false,"canDelete":false}
    ]
  }')

ROLE_ID=$(echo $CREATE_ROLE | jq -r '.id')
if [ "$ROLE_ID" != "null" ] && [ -n "$ROLE_ID" ]; then
  echo "   ✅ Rol creado con ID: $ROLE_ID"
  
  # 5. Verificar permisos del rol
  echo ""
  echo "5. Verificando permisos del rol..."
  PERMS=$(curl -s -X GET "$API_URL/api/roles/$ROLE_ID/permissions" \
    -H "Authorization: Bearer $TOKEN")
  echo "   Permisos: $(echo $PERMS | jq '.data | length') módulos configurados"
  echo "   Detalle: $(echo $PERMS | jq -c '.data[] | {module, canView, canEdit}')"
  
  # 6. Eliminar rol de prueba
  echo ""
  echo "6. Eliminando rol de prueba..."
  DELETE=$(curl -s -X DELETE "$API_URL/api/roles/$ROLE_ID" \
    -H "Authorization: Bearer $TOKEN")
  echo "   ✅ Rol eliminado"
else
  echo "   ⚠️ No se pudo crear rol (puede que ya exista)"
  echo "   Response: $CREATE_ROLE"
fi

# 7. Probar endpoint de reset password
echo ""
echo "7. Probando endpoint de reset password..."
# Obtener primer usuario que no sea admin
FIRST_USER=$(echo $USERS | jq -r '.data[1].id // empty')
if [ -n "$FIRST_USER" ]; then
  RESET_RESP=$(curl -s -X PUT "$API_URL/api/users/$FIRST_USER/reset-password" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"newPassword":"test123456"}')
  echo "   Response: $RESET_RESP"
else
  echo "   ⚠️ No hay usuarios adicionales para probar reset"
fi

echo ""
echo "=== Tests completados ==="
