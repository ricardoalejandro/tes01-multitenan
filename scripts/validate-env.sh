#!/bin/bash

# Script para validar variables de entorno antes del despliegue
# Uso: ./scripts/validate-env.sh

set -e

echo "🔍 Validando Variables de Entorno para Despliegue..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Verificar que .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ ERROR: Archivo .env no encontrado en la raíz del proyecto${NC}"
    echo "   Ejecuta: cp .env.example .env"
    exit 1
fi

echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
echo ""

# Función para verificar variable
check_var() {
    local var_name=$1
    local var_value=$2
    local is_critical=$3
    local default_value=$4
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name no está definida${NC}"
        ((ERRORS++))
    elif [ "$var_value" = "$default_value" ] && [ "$is_critical" = "true" ]; then
        echo -e "${YELLOW}⚠️  $var_name usa el valor por defecto (CAMBIAR EN PRODUCCIÓN)${NC}"
        echo "   Valor actual: $var_value"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ $var_name configurada${NC}"
    fi
}

# Cargar variables del archivo .env
set -a
source .env
set +a

echo "📋 Verificando Variables Críticas..."
echo ""

# Variables de seguridad
check_var "JWT_SECRET" "${JWT_SECRET}" true "your-super-secret-jwt-key-change-in-production-2024"

# Variables de base de datos
check_var "POSTGRES_USER" "$POSTGRES_USER" true "postgres"
check_var "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD" true "postgres"
check_var "POSTGRES_DB" "$POSTGRES_DB" false ""

# Variables de aplicación
check_var "NODE_ENV" "$NODE_ENV" false ""
check_var "CORS_ORIGIN" "$CORS_ORIGIN" false ""
check_var "NEXT_PUBLIC_API_URL" "$NEXT_PUBLIC_API_URL" false ""

echo ""
echo "📊 Resumen de Validación:"
echo "------------------------"
echo -e "Errores críticos: ${RED}$ERRORS${NC}"
echo -e "Advertencias: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ HAY ERRORES CRÍTICOS. Corrige antes de desplegar.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  HAY ADVERTENCIAS. Revisa las variables antes de desplegar en producción.${NC}"
    echo ""
    echo "¿Continuar de todas formas? (esto es OK para desarrollo/staging)"
    exit 0
else
    echo -e "${GREEN}✅ TODAS LAS VARIABLES ESTÁN CORRECTAMENTE CONFIGURADAS${NC}"
    exit 0
fi
