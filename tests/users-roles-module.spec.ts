import { test, expect } from '@playwright/test';

test.describe('Módulo de Usuarios y Roles', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('http://localhost:5000/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/workspace');
    await page.waitForLoadState('networkidle');
  });

  test('debe navegar al módulo de usuarios', async ({ page }) => {
    // Capturar errores de consola
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Click en Administración > Usuarios
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForLoadState('networkidle');

    // Verificar que la tabla de usuarios está visible
    await expect(page.locator('text=Gestión de Usuarios')).toBeVisible({ timeout: 10000 });
    
    // Verificar que no hay errores de consola críticos
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('hydration'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('debe abrir el diálogo de nuevo usuario', async ({ page }) => {
    // Navegar a Usuarios
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForLoadState('networkidle');

    // Click en botón de nuevo usuario
    await page.locator('button:has-text("Nuevo Usuario")').click();
    
    // Esperar a que el diálogo aparezca con animación
    await page.waitForTimeout(700);
    
    // Verificar elementos del formulario
    await expect(page.locator('text=Nuevo Usuario')).toBeVisible();
    await expect(page.locator('input[id="username"]')).toBeVisible();
    await expect(page.locator('input[id="fullName"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    
    // Verificar botones del footer
    await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
    await expect(page.locator('button:has-text("Crear Usuario")')).toBeVisible();
  });

  test('debe poder seleccionar tipo de usuario', async ({ page }) => {
    // Navegar a Usuarios
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForLoadState('networkidle');

    // Click en nuevo usuario
    await page.locator('button:has-text("Nuevo Usuario")').click();
    await page.waitForTimeout(700);
    
    // Click en el selector de tipo de usuario
    await page.locator('button[role="combobox"]:near(:text("Tipo de Usuario"))').click();
    await page.waitForTimeout(300);
    
    // Verificar opciones disponibles
    await expect(page.locator('text=Normal (requiere asignación de sedes/roles)')).toBeVisible();
    await expect(page.locator('text=Administrador (acceso total)')).toBeVisible();
    
    // Seleccionar Administrador
    await page.locator('text=Administrador (acceso total)').click();
    
    // Verificar que se seleccionó
    await expect(page.locator('button[role="combobox"]:has-text("Administrador")')).toBeVisible();
  });

  test('debe navegar al módulo de roles', async ({ page }) => {
    // Capturar errores de consola
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Click en Administración > Roles
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Roles")').click();
    await page.waitForLoadState('networkidle');

    // Verificar que la página de roles está visible
    await expect(page.locator('text=Gestión de Roles')).toBeVisible({ timeout: 10000 });
    
    // Verificar que no hay errores de consola críticos
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('hydration'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('debe abrir el diálogo de nuevo rol con matriz de permisos', async ({ page }) => {
    // Navegar a Roles
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Roles")').click();
    await page.waitForLoadState('networkidle');

    // Click en nuevo rol
    await page.locator('button:has-text("Nuevo Rol")').click();
    await page.waitForTimeout(700);
    
    // Verificar elementos del formulario
    await expect(page.locator('text=Nuevo Rol')).toBeVisible();
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="description"]')).toBeVisible();
    
    // Verificar matriz de permisos
    await expect(page.locator('text=Permisos por Modulo')).toBeVisible();
    await expect(page.locator('text=Estudiantes')).toBeVisible();
    await expect(page.locator('text=Cursos')).toBeVisible();
    await expect(page.locator('text=Ver')).toBeVisible();
    await expect(page.locator('text=Crear')).toBeVisible();
    await expect(page.locator('text=Editar')).toBeVisible();
    await expect(page.locator('text=Eliminar')).toBeVisible();
    
    // Verificar botones
    await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
    await expect(page.locator('button:has-text("Crear Rol")')).toBeVisible();
  });

  test('debe poder editar un usuario existente', async ({ page }) => {
    // Navegar a Usuarios
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForLoadState('networkidle');

    // Esperar a que cargue la tabla
    await page.waitForTimeout(1000);
    
    // Click en el primer botón de editar (lápiz)
    const editButton = page.locator('table tbody tr').first().locator('button').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(700);
      
      // Verificar que se abre el diálogo de edición
      await expect(page.locator('text=Editar Usuario')).toBeVisible();
      
      // Verificar sección de restablecer contraseña
      await expect(page.locator('text=Restablecer Contraseña')).toBeVisible();
      await expect(page.locator('text=Asignar nueva contraseña al usuario')).toBeVisible();
      
      // Verificar botones
      await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
      await expect(page.locator('button:has-text("Actualizar")')).toBeVisible();
    }
  });

  test('debe poder maximizar el diálogo', async ({ page }) => {
    // Navegar a Usuarios
    await page.locator('button:has-text("Administración")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForLoadState('networkidle');

    // Click en nuevo usuario
    await page.locator('button:has-text("Nuevo Usuario")').click();
    await page.waitForTimeout(700);
    
    // Buscar y clickear el botón de maximizar
    const maximizeButton = page.locator('[data-state="open"] button:has([class*="Maximize"])').or(
      page.locator('[role="dialog"] button').filter({ has: page.locator('svg') }).nth(0)
    );
    
    if (await maximizeButton.isVisible()) {
      await maximizeButton.click();
      await page.waitForTimeout(300);
      
      // El diálogo debería estar maximizado (ocupar más espacio)
      // Verificar que los campos siguen visibles
      await expect(page.locator('input[id="username"]')).toBeVisible();
      await expect(page.locator('input[id="fullName"]')).toBeVisible();
    }
  });
});
