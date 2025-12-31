#!/bin/bash

# Script para Iniciar Frontend
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  INICIAR FRONTEND - ESCOLASTICA"
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
    
    if [ ! -d "node_modules" ]; then
        echo "   ⚠️  node_modules no encontrado"
        echo "   Instalando dependencias..."
        npm install
        echo "   ✅ Dependencias instaladas"
    else
        echo "   ✅ Dependencias presentes"
    fi
    echo ""
}

# Función para verificar build de Next.js
check_build() {
    echo "🔍 Verificando build de Next.js..."
    
    if [ ! -d ".next" ]; then
        echo "   ⚠️  Build no encontrado"
        echo "   Construyendo aplicación..."
        npm run build
        echo "   ✅ Build completado"
    else
        echo "   ✅ Build existente"
        echo "   💡 Para rebuild: npm run build"
    fi
    echo ""
}

# Función para verificar variables de entorno
check_env_vars() {
    echo "🔍 Verificando variables de entorno..."
    
    if [ -f ".env.local" ] || [ -f ".env" ]; then
        echo "   ✅ Archivo de variables encontrado"
        
        # Verificar variable crítica
        if grep -q "NEXT_PUBLIC_API_URL" .env.local 2>/dev/null || grep -q "NEXT_PUBLIC_API_URL" .env 2>/dev/null; then
            echo "   ✅ NEXT_PUBLIC_API_URL configurado"
        else
            echo "   ⚠️  NEXT_PUBLIC_API_URL no encontrado"
            echo "   Añade: NEXT_PUBLIC_API_URL=http://localhost:3000"
        fi
    else
        echo "   ⚠️  No se encontró .env ni .env.local"
    fi
    echo ""
}

# Función para verificar que backend esté corriendo
check_backend() {
    echo "🔍 Verificando backend..."
    
    BACKEND_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"
    
    if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
        echo "   ✅ Backend accesible en $BACKEND_URL"
    else
        echo "   ⚠️  Backend no responde en $BACKEND_URL"
        echo "   Asegúrate de que el backend esté corriendo"
        echo ""
        read -p "¿Continuar de todas formas? (s/N): " confirm
        if [[ ! $confirm =~ ^[sS]$ ]]; then
            exit 1
        fi
    fi
    echo ""
}

# Función para iniciar con Docker
start_docker() {
    echo "🐳 Iniciando frontend con Docker Compose..."
    
    if docker-compose up -d frontend; then
        echo "   ✅ Frontend iniciado en Docker"
        
        # Esperar a que el servicio esté listo
        echo "   ⏳ Esperando a que el frontend esté listo..."
        sleep 5
        
        # Verificar logs
        echo ""
        echo "📋 Últimos logs del frontend:"
        docker-compose logs --tail=20 frontend
    else
        echo "   ❌ Error al iniciar frontend en Docker"
        exit 1
    fi
}

# Función para iniciar con PM2
start_pm2() {
    echo "📦 Iniciando frontend con PM2..."
    
    # Detener proceso anterior si existe
    pm2 delete escolastica-frontend 2>/dev/null || true
    
    # Iniciar frontend en modo producción
    if pm2 start npm --name escolastica-frontend -- start; then
        echo "   ✅ Frontend iniciado con PM2"
        pm2 save
        
        # Mostrar status
        echo ""
        pm2 list
        
        # Mostrar logs
        echo ""
        echo "📋 Logs del frontend:"
        pm2 logs escolastica-frontend --lines 20 --nostream
    else
        echo "   ❌ Error al iniciar frontend con PM2"
        exit 1
    fi
}

# Función para iniciar manualmente (desarrollo)
start_manual_dev() {
    echo "🔧 Iniciando frontend en modo desarrollo..."
    
    # Verificar que el puerto esté libre
    if lsof -ti:5000 &> /dev/null; then
        echo "   ⚠️  Puerto 5000 en uso. Liberando..."
        kill $(lsof -ti:5000) 2>/dev/null || true
        sleep 2
    fi
    
    # Iniciar en background
    echo "   Iniciando servidor de desarrollo..."
    PORT=5000 nohup npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo "   ✅ Frontend iniciado en modo desarrollo (PID: $FRONTEND_PID)"
    echo "   Logs en: logs/frontend.log"
    
    # Guardar PID
    echo $FRONTEND_PID > frontend.pid
    
    # Esperar y verificar
    sleep 3
    
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "   ✅ Proceso corriendo"
    else
        echo "   ❌ El proceso se detuvo. Revisa logs/frontend.log"
        exit 1
    fi
}

# Función para iniciar manualmente (producción)
start_manual_prod() {
    echo "🚀 Iniciando frontend en modo producción..."
    
    # Verificar que el puerto esté libre
    if lsof -ti:5000 &> /dev/null; then
        echo "   ⚠️  Puerto 5000 en uso. Liberando..."
        kill $(lsof -ti:5000) 2>/dev/null || true
        sleep 2
    fi
    
    # Asegurar que hay build
    if [ ! -d ".next" ]; then
        echo "   Construyendo aplicación..."
        npm run build
    fi
    
    # Iniciar en background
    echo "   Iniciando servidor de producción..."
    PORT=5000 nohup npm start > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo "   ✅ Frontend iniciado en modo producción (PID: $FRONTEND_PID)"
    echo "   Logs en: logs/frontend.log"
    
    # Guardar PID
    echo $FRONTEND_PID > frontend.pid
    
    # Esperar y verificar
    sleep 3
    
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "   ✅ Proceso corriendo"
    else
        echo "   ❌ El proceso se detuvo. Revisa logs/frontend.log"
        exit 1
    fi
}

# Función para verificar que el frontend responde
verify_frontend() {
    echo ""
    echo "🔍 Verificando que el frontend responda..."
    
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:5000}"
    MAX_RETRIES=15
    RETRY=0
    
    while [ $RETRY -lt $MAX_RETRIES ]; do
        if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
            echo "   ✅ Frontend respondiendo en $FRONTEND_URL"
            return 0
        fi
        
        RETRY=$((RETRY + 1))
        echo "   ⏳ Intento $RETRY/$MAX_RETRIES..."
        sleep 2
    done
    
    echo "   ⚠️  Frontend no responde después de $MAX_RETRIES intentos"
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
check_backend

# Preguntar modo si es manual
if [ "$DEPLOY_METHOD" == "manual" ]; then
    echo "💡 ¿En qué modo deseas iniciar el frontend?"
    echo "   1) Desarrollo (npm run dev)"
    echo "   2) Producción (npm start)"
    echo ""
    read -p "Selecciona (1/2) [1]: " mode
    mode=${mode:-1}
    
    if [ "$mode" == "2" ]; then
        check_build
        START_MANUAL_FN="start_manual_prod"
    else
        START_MANUAL_FN="start_manual_dev"
    fi
    echo ""
fi

# Iniciar según método
case $DEPLOY_METHOD in
    docker)
        start_docker
        ;;
    pm2)
        check_build
        start_pm2
        ;;
    manual)
        $START_MANUAL_FN
        ;;
esac

echo ""

# Verificar que responda
if verify_frontend; then
    echo ""
    echo "✅ FRONTEND INICIADO CORRECTAMENTE"
    echo ""
    echo "🌐 Accede a la aplicación:"
    echo "   🔗 http://localhost:5000"
    echo ""
    echo "📝 Próximo paso:"
    echo "   ./12_health_check.sh (verificación completa)"
else
    echo ""
    echo "⚠️  FRONTEND INICIADO PERO NO RESPONDE"
    echo ""
    echo "💡 Verifica los logs:"
    case $DEPLOY_METHOD in
        docker)
            echo "   docker-compose logs -f frontend"
            ;;
        pm2)
            echo "   pm2 logs escolastica-frontend"
            ;;
        manual)
            echo "   tail -f logs/frontend.log"
            ;;
    esac
fi

echo ""
