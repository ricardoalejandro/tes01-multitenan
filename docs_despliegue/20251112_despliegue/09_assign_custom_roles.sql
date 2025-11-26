-- ================================================
-- Script de Asignación Manual de Roles Personalizados
-- Fecha: 12 de Noviembre 2025
-- ================================================

-- INSTRUCCIONES:
-- 1. Copia este archivo y edítalo según tus necesidades
-- 2. Ejecuta: psql -U escolastica_user -d escolastica -f 09_assign_custom_roles.sql
-- 3. O desde el script: ./run_custom_roles_assignment.sh

-- ================================================
-- 1. CONSULTAS PARA IDENTIFICAR IDS
-- ================================================

-- Ver usuarios disponibles
-- SELECT id, username, email, user_type, branch_id FROM users ORDER BY id;

-- Ver sucursales disponibles
-- SELECT id, name, code FROM branches ORDER BY id;

-- Ver roles disponibles
-- SELECT id, name, slug FROM roles ORDER BY id;

-- ================================================
-- 2. EJEMPLOS DE ASIGNACIÓN
-- ================================================

-- EJEMPLO 1: Asignar rol 'Admin' a usuario específico en su sucursal
-- Descomenta y ajusta los IDs según tu base de datos

/*
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by)
VALUES (
    1,  -- ID del usuario
    1,  -- ID de la sucursal
    (SELECT id FROM roles WHERE slug = 'admin'),  -- Rol Admin
    1   -- ID del usuario que asigna (superadmin)
);
*/

-- EJEMPLO 2: Asignar rol 'Instructor' a múltiples usuarios en la misma sucursal

/*
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by)
VALUES 
    (2, 1, (SELECT id FROM roles WHERE slug = 'instructor'), 1),
    (3, 1, (SELECT id FROM roles WHERE slug = 'instructor'), 1),
    (4, 1, (SELECT id FROM roles WHERE slug = 'instructor'), 1);
*/

-- EJEMPLO 3: Asignar mismo rol a un usuario en múltiples sucursales

/*
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by)
SELECT 
    5 as user_id,  -- ID del usuario
    b.id as branch_id,
    (SELECT id FROM roles WHERE slug = 'admin') as role_id,
    1 as assigned_by
FROM branches b
WHERE b.code IN ('CENTRAL', 'SUC001', 'SUC002');  -- Códigos de sucursales
*/

-- EJEMPLO 4: Asignar diferentes roles a un usuario en diferentes sucursales

/*
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by)
VALUES 
    (6, 1, (SELECT id FROM roles WHERE slug = 'admin'), 1),      -- Admin en sucursal 1
    (6, 2, (SELECT id FROM roles WHERE slug = 'instructor'), 1); -- Instructor en sucursal 2
*/

-- ================================================
-- 3. ASIGNACIONES PERSONALIZADAS
-- ================================================

-- PLANTILLA: Copia y edita esta sección según necesites

/*
INSERT INTO user_branch_roles (user_id, branch_id, role_id, assigned_by)
VALUES 
    (?, ?, (SELECT id FROM roles WHERE slug = '?'), 1);
*/

-- Reemplaza:
-- - Primer ?: ID del usuario (consulta: SELECT id, username FROM users;)
-- - Segundo ?: ID de la sucursal (consulta: SELECT id, name FROM branches;)
-- - Tercer ?: slug del rol ('admin', 'instructor', u otro personalizado)
-- - 1: ID del usuario que realiza la asignación

-- ================================================
-- 4. VALIDACIONES
-- ================================================

-- Verificar que no haya duplicados antes de insertar
/*
SELECT 
    u.username,
    b.name as branch,
    r.name as role
FROM user_branch_roles ubr
JOIN users u ON ubr.user_id = u.id
JOIN branches b ON ubr.branch_id = b.id
JOIN roles r ON ubr.role_id = r.id
WHERE u.id = ?  -- Reemplazar con ID del usuario
ORDER BY b.name;
*/

-- ================================================
-- 5. REMOVER ASIGNACIONES (si es necesario)
-- ================================================

-- Remover rol específico de un usuario en una sucursal
/*
DELETE FROM user_branch_roles
WHERE user_id = ?
  AND branch_id = ?
  AND role_id = (SELECT id FROM roles WHERE slug = '?');
*/

-- Remover todas las asignaciones de un usuario
/*
DELETE FROM user_branch_roles
WHERE user_id = ?;
*/

-- ================================================
-- 6. VERIFICACIÓN POST-ASIGNACIÓN
-- ================================================

-- Ver todas las asignaciones actuales
/*
SELECT 
    u.username as "Usuario",
    b.name as "Sucursal",
    r.name as "Rol",
    ubr.assigned_at as "Asignado"
FROM user_branch_roles ubr
JOIN users u ON ubr.user_id = u.id
JOIN branches b ON ubr.branch_id = b.id
JOIN roles r ON ubr.role_id = r.id
ORDER BY u.username, b.name;
*/

-- Contar asignaciones por rol
/*
SELECT 
    r.name as "Rol",
    COUNT(*) as "Total Asignaciones",
    COUNT(DISTINCT ubr.user_id) as "Usuarios Únicos",
    COUNT(DISTINCT ubr.branch_id) as "Sucursales"
FROM user_branch_roles ubr
JOIN roles r ON ubr.role_id = r.id
GROUP BY r.name
ORDER BY COUNT(*) DESC;
*/

-- Usuarios sin roles asignados
/*
SELECT 
    u.id,
    u.username,
    u.email,
    u.user_type,
    b.name as branch
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.id NOT IN (SELECT DISTINCT user_id FROM user_branch_roles)
  AND u.user_type != 'student'  -- Excluir estudiantes
ORDER BY u.id;
*/

-- ================================================
-- NOTAS IMPORTANTES
-- ================================================

/*
RECUERDA:
1. Siempre verifica los IDs antes de ejecutar las inserciones
2. Evita duplicados: un usuario no puede tener el mismo rol dos veces en la misma sucursal
3. Los estudiantes (user_type='student') NO necesitan roles en user_branch_roles
4. Solo usuarios tipo 'admin' e 'instructor' deben tener acceso al sistema
5. Un usuario puede tener diferentes roles en diferentes sucursales
6. Usa TRANSACTION si vas a hacer múltiples inserciones:

   BEGIN;
   INSERT INTO user_branch_roles ...;
   INSERT INTO user_branch_roles ...;
   -- Verifica que todo esté bien
   COMMIT;
   -- O si algo salió mal:
   ROLLBACK;
*/
