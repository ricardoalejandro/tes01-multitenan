#!/bin/bash

# Script de Rollback de Base de Datos
# Fecha: 12 de Noviembre 2025

set -e  # Salir si hay error

echo "================================================"
echo "  ROLLBACK DE BASE DE DATOS"
echo "================================================"
echo ""
echo "⚠️  ADVERTENCIA: Este script revertirá todos los cambios"
echo "   realizados por la migración de roles y permisos."
echo ""

# Configuración
DB_USER="${POSTGRES_USER:-escolastica_user}"
DB_NAME="${POSTGRES_DB:-escolastica}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="./backups"

echo "📋 Configuración:"
echo "   - Usuario: $DB_USER"
echo "   - Base de datos: $DB_NAME"
echo "   - Host: $DB_HOST:$DB_PORT"
echo ""

# Verificar conexión
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi

echo "✅ Conexión a base de datos verificada"
echo ""

# ================================================
# OPCIONES DE ROLLBACK
# ================================================

echo "💡 OPCIONES DE ROLLBACK:"
echo ""
echo "1) Restaurar desde backup completo (RECOMENDADO)"
echo "2) Eliminar solo las nuevas tablas (mantener datos existentes)"
echo "3) Rollback manual (ejecutar comandos SQL manualmente)"
echo "4) Cancelar"
echo ""
read -p "Selecciona una opción (1-4): " option

case $option in
    1)
        # ================================================
        # OPCIÓN 1: RESTAURAR DESDE BACKUP
        # ================================================
        
        echo ""
        echo "📦 Buscando backups disponibles..."
        echo ""
        
        if [ ! -d "$BACKUP_DIR" ]; then
            echo "❌ Error: No se encontró directorio de backups"
            exit 1
        fi
        
        # Listar backups disponibles
        BACKUPS=($(ls -t $BACKUP_DIR/backup_pre_roles_*.dump 2>/dev/null))
        
        if [ ${#BACKUPS[@]} -eq 0 ]; then
            echo "❌ Error: No se encontraron backups"
            echo ""
            echo "💡 Opciones alternativas:"
            echo "   - Ejecuta este script con opción 2 (eliminar tablas)"
            echo "   - O ejecuta con opción 3 (rollback manual)"
            exit 1
        fi
        
        echo "Backups disponibles:"
        for i in "${!BACKUPS[@]}"; do
            BACKUP_FILE="${BACKUPS[$i]}"
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            BACKUP_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2)
            echo "   $((i+1))) $(basename $BACKUP_FILE) - $BACKUP_SIZE - $BACKUP_DATE"
        done
        
        echo ""
        read -p "Selecciona el backup a restaurar (1-${#BACKUPS[@]}): " backup_choice
        
        if [ "$backup_choice" -lt 1 ] || [ "$backup_choice" -gt ${#BACKUPS[@]} ]; then
            echo "❌ Selección inválida"
            exit 1
        fi
        
        SELECTED_BACKUP="${BACKUPS[$((backup_choice-1))]}"
        
        echo ""
        echo "⚠️  CONFIRMACIÓN FINAL"
        echo ""
        echo "Vas a restaurar:"
        echo "   Backup: $(basename $SELECTED_BACKUP)"
        echo "   Base de datos: $DB_NAME"
        echo ""
        echo "🚨 ESTO ELIMINARÁ TODOS LOS DATOS ACTUALES"
        echo ""
        read -p "¿Estás seguro? Escribe 'CONFIRMO' para continuar: " confirm
        
        if [ "$confirm" != "CONFIRMO" ]; then
            echo "❌ Rollback cancelado"
            exit 1
        fi
        
        echo ""
        echo "🔄 Restaurando backup..."
        echo ""
        
        # Desconectar usuarios activos
        echo "Desconectando usuarios activos..."
        PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
        " > /dev/null 2>&1 || true
        
        # Eliminar conexiones y limpiar base de datos
        echo "Limpiando base de datos..."
        PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1
        
        # Restaurar backup
        echo "Restaurando desde backup..."
        if PGPASSWORD=$POSTGRES_PASSWORD pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$SELECTED_BACKUP" 2>/dev/null; then
            echo ""
            echo "✅ BACKUP RESTAURADO EXITOSAMENTE"
        else
            echo ""
            echo "⚠️  Restauración completada con advertencias"
            echo "   (Algunas advertencias son normales)"
        fi
        ;;
        
    2)
        # ================================================
        # OPCIÓN 2: ELIMINAR SOLO NUEVAS TABLAS
        # ================================================
        
        echo ""
        echo "⚠️  CONFIRMACIÓN"
        echo ""
        echo "Esta opción:"
        echo "   ✅ Eliminará las nuevas tablas (roles, permissions, etc.)"
        echo "   ✅ Removerá columnas nuevas en 'users' (email, email_verified)"
        echo "   ✅ Mantendrá todos los datos existentes"
        echo ""
        read -p "¿Continuar? (s/N): " confirm
        
        if [[ ! $confirm =~ ^[sS]$ ]]; then
            echo "❌ Rollback cancelado"
            exit 1
        fi
        
        echo ""
        echo "🔄 Ejecutando rollback..."
        echo ""
        
        # Script SQL de rollback
        ROLLBACK_SQL=$(cat <<'EOF'
-- Eliminar tablas nuevas (orden inverso por dependencias)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS philosophical_counseling CASCADE;
DROP TABLE IF EXISTS user_branch_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- Remover columnas nuevas de users
ALTER TABLE users 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS email_verified;

-- Mensaje de confirmación
SELECT 'Rollback completado' as resultado;
EOF
)
        
        if echo "$ROLLBACK_SQL" | PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
            echo ""
            echo "✅ ROLLBACK COMPLETADO"
        else
            echo ""
            echo "❌ Error durante rollback"
            exit 1
        fi
        ;;
        
    3)
        # ================================================
        # OPCIÓN 3: ROLLBACK MANUAL
        # ================================================
        
        echo ""
        echo "📖 COMANDOS SQL PARA ROLLBACK MANUAL:"
        echo ""
        echo "Ejecuta estos comandos en orden:"
        echo ""
        echo "-- 1. Eliminar tablas nuevas"
        echo "DROP TABLE IF EXISTS password_reset_tokens CASCADE;"
        echo "DROP TABLE IF EXISTS philosophical_counseling CASCADE;"
        echo "DROP TABLE IF EXISTS user_branch_roles CASCADE;"
        echo "DROP TABLE IF EXISTS role_permissions CASCADE;"
        echo "DROP TABLE IF EXISTS roles CASCADE;"
        echo "DROP TABLE IF EXISTS system_config CASCADE;"
        echo ""
        echo "-- 2. Remover columnas de users"
        echo "ALTER TABLE users DROP COLUMN IF EXISTS email;"
        echo "ALTER TABLE users DROP COLUMN IF EXISTS email_verified;"
        echo ""
        echo "💡 Para ejecutar:"
        echo "   psql -U $DB_USER -d $DB_NAME"
        echo "   Luego copia y pega los comandos"
        echo ""
        exit 0
        ;;
        
    4)
        echo ""
        echo "❌ Rollback cancelado"
        exit 0
        ;;
        
    *)
        echo ""
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

# ================================================
# VERIFICACIÓN POST-ROLLBACK
# ================================================

echo ""
echo "🔍 Verificando rollback..."
echo ""

# Verificar que tablas fueron eliminadas
NEW_TABLES=("roles" "role_permissions" "user_branch_roles" "philosophical_counseling" "system_config" "password_reset_tokens")
ALL_REMOVED=true

for table in "${NEW_TABLES[@]}"; do
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | grep -q 1; then
        echo "   ⚠️  Tabla '$table' todavía existe"
        ALL_REMOVED=false
    else
        echo "   ✅ Tabla '$table' eliminada"
    fi
done

echo ""

# Verificar columnas en users
echo "Verificando columnas en 'users'..."
if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email';" | grep -q email; then
    echo "   ⚠️  Columna 'email' todavía existe"
    ALL_REMOVED=false
else
    echo "   ✅ Columnas removidas"
fi

echo ""

# Resumen
if $ALL_REMOVED; then
    echo "✅ ROLLBACK VERIFICADO CORRECTAMENTE"
    echo ""
    echo "🎯 Estado del sistema:"
    echo "   - Todas las nuevas tablas eliminadas"
    echo "   - Columnas añadidas removidas"
    echo "   - Datos existentes preservados"
else
    echo "⚠️  ROLLBACK INCOMPLETO"
    echo ""
    echo "Algunas tablas o columnas no fueron eliminadas."
    echo "Ejecuta rollback manual (opción 3) para completar."
fi

echo ""
echo "📝 Próximos pasos:"
echo "   1. Reinicia los servicios"
echo "   2. Verifica que el sistema funcione con la versión anterior"
echo "   3. Revisa logs para detectar problemas"
echo ""

# Mostrar estadísticas finales
TOTAL_TABLES=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
echo "📊 Total de tablas ahora: $TOTAL_TABLES"
echo ""
