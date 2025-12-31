#!/bin/bash

# Script Maestro de Despliegue Automático
# Fecha: 12 de Noviembre 2025
# Ejecuta todos los pasos del despliegue en orden

set -e  # Salir si hay error

echo "================================================"
echo "  DESPLIEGUE AUTOMÁTICO COMPLETO"
echo "  Sistema de Roles y Permisos - Escolastica"
echo "================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
CURRENT_DIR=$(pwd)
START_TIME=$(date +%s)
FAILED_STEPS=()
SKIPPED_STEPS=()

# Función para mostrar encabezado de paso
step_header() {
    local step_num=$1
    local step_name=$2
    local step_desc=$3
    
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}PASO $step_num: $step_name${NC}"
    echo -e "${BLUE}$step_desc${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Función para ejecutar script con manejo de errores
execute_step() {
    local step_num=$1
    local script_name=$2
    local step_desc=$3
    local required=$4  # "required" o "optional"
    
    step_header "$step_num" "$script_name" "$step_desc"
    
    if [ ! -f "$script_name" ]; then
        echo -e "${RED}❌ Script no encontrado: $script_name${NC}"
        if [ "$required" == "required" ]; then
            FAILED_STEPS+=("$step_num: $script_name (no encontrado)")
            return 1
        else
            SKIPPED_STEPS+=("$step_num: $script_name (no encontrado)")
            return 0
        fi
    fi
    
    echo "⏳ Ejecutando $script_name..."
    echo ""
    
    if ./"$script_name"; then
        echo ""
        echo -e "${GREEN}✅ $script_name completado exitosamente${NC}"
        return 0
    else
        EXIT_CODE=$?
        echo ""
        echo -e "${RED}❌ $script_name falló con código: $EXIT_CODE${NC}"
        
        if [ "$required" == "required" ]; then
            FAILED_STEPS+=("$step_num: $script_name")
            
            echo ""
            echo -e "${YELLOW}⚠️  Este paso es crítico. ¿Deseas continuar de todas formas?${NC}"
            read -p "Continuar (s/N): " continue_choice
            
            if [[ ! $continue_choice =~ ^[sS]$ ]]; then
                echo -e "${RED}Despliegue abortado por el usuario${NC}"
                exit 1
            fi
            
            SKIPPED_STEPS+=("$step_num: $script_name (continuó después de error)")
        else
            SKIPPED_STEPS+=("$step_num: $script_name (opcional, falló)")
        fi
        
        return 1
    fi
}

# Función para mostrar resumen final
show_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo "================================================"
    echo "  RESUMEN DE DESPLIEGUE"
    echo "================================================"
    echo ""
    echo "⏱️  Tiempo total: ${minutes}m ${seconds}s"
    echo ""
    
    if [ ${#FAILED_STEPS[@]} -eq 0 ] && [ ${#SKIPPED_STEPS[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!${NC}"
        echo ""
        echo "✅ Todos los pasos ejecutados correctamente"
    elif [ ${#FAILED_STEPS[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  DESPLIEGUE COMPLETADO CON ADVERTENCIAS${NC}"
        echo ""
        echo "Pasos omitidos: ${#SKIPPED_STEPS[@]}"
        for step in "${SKIPPED_STEPS[@]}"; do
            echo "  - $step"
        done
    else
        echo -e "${RED}❌ DESPLIEGUE COMPLETADO CON ERRORES${NC}"
        echo ""
        echo "Pasos fallidos: ${#FAILED_STEPS[@]}"
        for step in "${FAILED_STEPS[@]}"; do
            echo "  - $step"
        done
        
        if [ ${#SKIPPED_STEPS[@]} -gt 0 ]; then
            echo ""
            echo "Pasos omitidos: ${#SKIPPED_STEPS[@]}"
            for step in "${SKIPPED_STEPS[@]}"; do
                echo "  - $step"
            done
        fi
    fi
    
    echo ""
    echo "📝 Próximos pasos recomendados:"
    echo "   1. Accede a: http://localhost:5000"
    echo "   2. Login con credenciales de admin"
    echo "   3. Verifica el nuevo dashboard"
    echo "   4. Accede al panel de administración"
    echo "   5. Configura SMTP en /admin/smtp"
    echo ""
}

# ================================================
# INICIO DEL DESPLIEGUE
# ================================================

echo "📋 INFORMACIÓN DEL DESPLIEGUE"
echo ""
echo "Este script ejecutará automáticamente:"
echo "   1. Backup de base de datos"
echo "   2. Backup de archivos"
echo "   3. Detención de servicios"
echo "   4. Verificación de base de datos"
echo "   5. Ejecución de migración"
echo "   6. Verificación de migración"
echo "   7. Listado de usuarios y sucursales"
echo "   8. Asignación automática de roles"
echo "   9. Inicio de backend"
echo "   10. Inicio de frontend"
echo "   11. Health check completo"
echo ""
echo "⏱️  Tiempo estimado: 26-33 minutos"
echo ""
echo "⚠️  Algunos pasos requerirán confirmación manual"
echo ""
read -p "¿Deseas continuar? (s/N): " confirm

if [[ ! $confirm =~ ^[sS]$ ]]; then
    echo "Despliegue cancelado"
    exit 0
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "01_backup_database.sh" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde docs_despliegue/20251112_despliegue/${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 INICIANDO DESPLIEGUE AUTOMÁTICO...${NC}"
echo ""
sleep 2

# ================================================
# EJECUCIÓN DE PASOS
# ================================================

# PASO 1: Backup de Base de Datos
execute_step "1" "01_backup_database.sh" "Crear backup de PostgreSQL" "required"

# PASO 2: Backup de Archivos
execute_step "2" "02_backup_files.sh" "Respaldar código fuente" "required"

# PASO 3: Detener Servicios
execute_step "3" "03_stop_services.sh" "Detener servicios actuales" "required"

# PASO 4: Verificar Base de Datos
execute_step "4" "04_verify_database.sh" "Verificar estado pre-migración" "required"

# PASO 5: Ejecutar Migración
execute_step "5" "05_run_migration.sh" "Ejecutar migración de roles" "required"

# PASO 6: Verificar Migración
execute_step "6" "06_verify_migration.sh" "Verificar migración exitosa" "required"

# PASO 7: Listar Usuarios
execute_step "7" "07_list_users_branches.sh" "Listar usuarios y sucursales" "optional"

# PASO 8: Asignar Roles
execute_step "8" "08_assign_admin_roles.sh" "Asignar roles automáticamente" "required"

# PASO 9: Iniciar Backend
execute_step "9" "10_start_backend.sh" "Iniciar servicio backend" "required"

# PASO 10: Iniciar Frontend
execute_step "10" "11_start_frontend.sh" "Iniciar servicio frontend" "required"

# PASO 11: Health Check
execute_step "11" "12_health_check.sh" "Verificación completa del sistema" "optional"

# ================================================
# RESUMEN Y FINALIZACIÓN
# ================================================

show_summary

# Código de salida
if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    exit 0
else
    exit 1
fi
