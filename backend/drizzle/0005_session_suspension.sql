-- Migration: Add session suspension functionality
-- Fecha: 2025-12-07
-- Descripción: Agrega campo suspension_reason para almacenar la razón de suspensión de sesiones

-- Agregar campo suspension_reason a group_sessions
ALTER TABLE group_sessions 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Comentario de documentación
COMMENT ON COLUMN group_sessions.suspension_reason IS 'Razón por la que se suspendió la sesión (feriado, lluvia, apagón, etc.)';
COMMENT ON COLUMN group_sessions.status IS 'Estado de la sesión: pendiente (programada), dictada (completada), suspendida (no se dictó)';
