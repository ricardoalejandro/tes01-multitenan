#!/bin/bash

# Script para Detener Servicios
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  DETENER SERVICIOS - PRE DESPLIEGUE"
echo "================================================"
echo ""

STOPPED_SERVICES=()
FAILED_SERVICES=()

# Función para detener servicio Docker Compose
stop_docker_compose() {
    echo "🐳 Verificando Docker Compose..."
    
    if [ -f "docker-compose.yml" ]; then
        if docker-compose ps | grep -q "Up"; then
            echo "   Deteniendo servicios Docker Compose..."
            if docker-compose down; then
                echo "   ✅ Docker Compose detenido"
                STOPPED_SERVICES+=("Docker Compose")
            else
                echo "   ❌ Error al detener Docker Compose"
                FAILED_SERVICES+=("Docker Compose")
            fi
        else
            echo "   ℹ️  Docker Compose no está corriendo"
        fi
    else
        echo "   ℹ️  No se encontró docker-compose.yml"
    fi
    echo ""
}

# Función para detener PM2
stop_pm2() {
    echo "📦 Verificando PM2..."
    
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "online"; then
            echo "   Deteniendo procesos PM2..."
            if pm2 stop all && pm2 save; then
                echo "   ✅ PM2 detenido"
                STOPPED_SERVICES+=("PM2")
            else
                echo "   ❌ Error al detener PM2"
                FAILED_SERVICES+=("PM2")
            fi
        else
            echo "   ℹ️  No hay procesos PM2 corriendo"
        fi
    else
        echo "   ℹ️  PM2 no está instalado"
    fi
    echo ""
}

# Función para detener procesos Node.js manualmente
stop_node_processes() {
    echo "🔍 Buscando procesos Node.js..."
    
    # Backend (puerto 3000)
    if lsof -ti:3000 &> /dev/null; then
        echo "   Backend encontrado en puerto 3000"
        PID=$(lsof -ti:3000)
        if kill $PID 2>/dev/null; then
            echo "   ✅ Backend detenido (PID: $PID)"
            STOPPED_SERVICES+=("Backend Node")
        else
            echo "   ❌ Error al detener Backend"
            FAILED_SERVICES+=("Backend Node")
        fi
    else
        echo "   ℹ️  Backend no está corriendo en puerto 3000"
    fi
    
    # Frontend (puerto 5000)
    if lsof -ti:5000 &> /dev/null; then
        echo "   Frontend encontrado en puerto 5000"
        PID=$(lsof -ti:5000)
        if kill $PID 2>/dev/null; then
            echo "   ✅ Frontend detenido (PID: $PID)"
            STOPPED_SERVICES+=("Frontend Node")
        else
            echo "   ❌ Error al detener Frontend"
            FAILED_SERVICES+=("Frontend Node")
        fi
    else
        echo "   ℹ️  Frontend no está corriendo en puerto 5000"
    fi
    echo ""
}

# Función para verificar puertos
verify_ports() {
    echo "🔍 Verificando puertos críticos..."
    
    PORTS=(3000 5000 5432 6379)
    PORTS_IN_USE=()
    
    for port in "${PORTS[@]}"; do
        if lsof -ti:$port &> /dev/null; then
            echo "   ⚠️  Puerto $port todavía en uso"
            PORTS_IN_USE+=($port)
        else
            echo "   ✅ Puerto $port libre"
        fi
    done
    echo ""
    
    if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
        echo "⚠️  ADVERTENCIA: Algunos puertos todavía están en uso"
        echo "   Puertos ocupados: ${PORTS_IN_USE[*]}"
        echo ""
        echo "💡 Puedes liberar manualmente con:"
        for port in "${PORTS_IN_USE[@]}"; do
            echo "   lsof -ti:$port | xargs kill -9"
        done
        echo ""
    fi
}

# Ejecutar detención de servicios
echo "🛑 Iniciando detención de servicios..."
echo ""

stop_docker_compose
stop_pm2
stop_node_processes
verify_ports

# Resumen
echo "================================================"
echo "  RESUMEN"
echo "================================================"
echo ""

if [ ${#STOPPED_SERVICES[@]} -gt 0 ]; then
    echo "✅ Servicios detenidos (${#STOPPED_SERVICES[@]}):"
    for service in "${STOPPED_SERVICES[@]}"; do
        echo "   - $service"
    done
    echo ""
fi

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo "❌ Servicios con error (${#FAILED_SERVICES[@]}):"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "   - $service"
    done
    echo ""
    echo "⚠️  Verifica manualmente estos servicios antes de continuar"
    exit 1
fi

if [ ${#STOPPED_SERVICES[@]} -eq 0 ]; then
    echo "ℹ️  No había servicios corriendo"
fi

echo ""
echo "✅ SERVICIOS DETENIDOS CORRECTAMENTE"
echo ""
echo "📝 Próximo paso:"
echo "   Ejecutar: ./04_verify_database.sh"
echo ""
