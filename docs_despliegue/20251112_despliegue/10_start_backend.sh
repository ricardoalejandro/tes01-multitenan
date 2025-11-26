#!/bin/bash

# Script para Iniciar Backend
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  INICIAR BACKEND - ESCOLASTICA"
echo "================================================"
echo ""

# Detectar método de despliegue
if [ -f "docker-compose.yml" ]; then
    DEPLOY_METHOD="docker"
elif command -v pm2 &> /dev/null; then
    DEPLOY_METHOD="pm2"
else
    DEPLOY_METHOD="manual"
fi

echo "📋 Método de despliegue detectado: $DEPLOY_METHOD"
echo ""

# Función para verificar dependencias npm
check_dependencies() {
    echo "🔍 Verificando dependencias..."
    
    if [ ! -d "backend/node_modules" ]; then
        echo "   ⚠️  node_modules no encontrado"
        echo "   Instalando dependencias..."
        cd backend
        npm install
        cd ..
        echo "   ✅ Dependencias instaladas"
    else
        echo "   ✅ Dependencias presentes"
    fi
    echo ""
}

# Función para verificar variables de entorno
check_env_vars() {
    echo "🔍 Verificando variables de entorno..."
    
    if [ -f "backend/.env" ]; then
        echo "   ✅ Archivo .env encontrado"
        
        # Verificar variables críticas
        source backend/.env 2>/dev/null || true
        
        MISSING_VARS=()
        [ -z "$DATABASE_URL" ] && MISSING_VARS+=("DATABASE_URL")
        [ -z "$JWT_SECRET" ] && MISSING_VARS+=("JWT_SECRET")
        [ -z "$PORT" ] && MISSING_VARS+=("PORT")
        
        if [ ${#MISSING_VARS[@]} -gt 0 ]; then
            echo "   ⚠️  Variables faltantes: ${MISSING_VARS[*]}"
        else
            echo "   ✅ Variables críticas presentes"
        fi
    else
        echo "   ⚠️  Archivo .env no encontrado en backend/"
        echo "   Crea backend/.env con las variables necesarias"
    fi
    echo ""
}

# Función para verificar conexión a PostgreSQL
check_postgres() {
    echo "🔍 Verificando conexión a PostgreSQL..."
    
    DB_HOST="${POSTGRES_HOST:-localhost}"
    DB_PORT="${POSTGRES_PORT:-5432}"
    DB_USER="${POSTGRES_USER:-escolastica_user}"
    DB_NAME="${POSTGRES_DB:-escolastica}"
    
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL accesible"
    else
        echo "   ⚠️  No se puede conectar a PostgreSQL"
        echo "   Verifica que PostgreSQL esté corriendo"
    fi
    echo ""
}

# Función para verificar Redis
check_redis() {
    echo "🔍 Verificando conexión a Redis..."
    
    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        echo "   ✅ Redis accesible"
    else
        echo "   ⚠️  Redis no responde (puede ser normal si no se usa caché)"
    fi
    echo ""
}

# Función para iniciar con Docker
start_docker() {
    echo "🐳 Iniciando backend con Docker Compose..."
    
    if docker-compose up -d backend; then
        echo "   ✅ Backend iniciado en Docker"
        
        # Esperar a que el servicio esté listo
        echo "   ⏳ Esperando a que el backend esté listo..."
        sleep 5
        
        # Verificar logs
        echo ""
        echo "📋 Últimos logs del backend:"
        docker-compose logs --tail=20 backend
    else
        echo "   ❌ Error al iniciar backend en Docker"
        exit 1
    fi
}

# Función para iniciar con PM2
start_pm2() {
    echo "📦 Iniciando backend con PM2..."
    
    cd backend
    
    # Detener proceso anterior si existe
    pm2 delete escolastica-backend 2>/dev/null || true
    
    # Iniciar backend
    if pm2 start src/index.ts --name escolastica-backend --interpreter ./node_modules/.bin/tsx; then
        echo "   ✅ Backend iniciado con PM2"
        pm2 save
        
        # Mostrar status
        echo ""
        pm2 list
        
        # Mostrar logs
        echo ""
        echo "📋 Logs del backend:"
        pm2 logs escolastica-backend --lines 20 --nostream
    else
        echo "   ❌ Error al iniciar backend con PM2"
        exit 1
    fi
    
    cd ..
}

# Función para iniciar manualmente
start_manual() {
    echo "🔧 Iniciando backend manualmente..."
    
    # Verificar que el puerto esté libre
    if lsof -ti:3000 &> /dev/null; then
        echo "   ⚠️  Puerto 3000 en uso. Liberando..."
        kill $(lsof -ti:3000) 2>/dev/null || true
        sleep 2
    fi
    
    cd backend
    
    # Iniciar en background
    echo "   Iniciando servidor..."
    nohup npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    
    echo "   ✅ Backend iniciado (PID: $BACKEND_PID)"
    echo "   Logs en: logs/backend.log"
    
    # Guardar PID
    echo $BACKEND_PID > ../backend.pid
    
    # Esperar y verificar
    sleep 3
    
    if ps -p $BACKEND_PID > /dev/null; then
        echo "   ✅ Proceso corriendo"
    else
        echo "   ❌ El proceso se detuvo. Revisa logs/backend.log"
        exit 1
    fi
    
    cd ..
}

# Función para verificar que el backend responde
verify_backend() {
    echo ""
    echo "🔍 Verificando que el backend responda..."
    
    BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
    MAX_RETRIES=10
    RETRY=0
    
    while [ $RETRY -lt $MAX_RETRIES ]; do
        if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
            echo "   ✅ Backend respondiendo en $BACKEND_URL"
            
            # Mostrar respuesta
            HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
            echo "   Respuesta: $HEALTH_RESPONSE"
            return 0
        fi
        
        RETRY=$((RETRY + 1))
        echo "   ⏳ Intento $RETRY/$MAX_RETRIES..."
        sleep 2
    done
    
    echo "   ⚠️  Backend no responde después de $MAX_RETRIES intentos"
    echo "   Revisa los logs para más información"
    return 1
}

# ================================================
# EJECUCIÓN PRINCIPAL
# ================================================

# Crear directorio de logs si no existe
mkdir -p logs

# Verificaciones previas
check_dependencies
check_env_vars
check_postgres
check_redis

# Iniciar según método
case $DEPLOY_METHOD in
    docker)
        start_docker
        ;;
    pm2)
        start_pm2
        ;;
    manual)
        start_manual
        ;;
esac

echo ""

# Verificar que responda
if verify_backend; then
    echo ""
    echo "✅ BACKEND INICIADO CORRECTAMENTE"
    echo ""
    echo "🌐 Endpoints disponibles:"
    echo "   - Health: http://localhost:3000/health"
    echo "   - API: http://localhost:3000/api"
    echo "   - Auth: http://localhost:3000/api/auth/login"
    echo ""
    echo "📝 Próximo paso:"
    echo "   ./11_start_frontend.sh"
else
    echo ""
    echo "⚠️  BACKEND INICIADO PERO NO RESPONDE"
    echo ""
    echo "💡 Verifica los logs:"
    case $DEPLOY_METHOD in
        docker)
            echo "   docker-compose logs -f backend"
            ;;
        pm2)
            echo "   pm2 logs escolastica-backend"
            ;;
        manual)
            echo "   tail -f logs/backend.log"
            ;;
    esac
fi

echo ""
