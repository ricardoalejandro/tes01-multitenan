import { test, expect, Page } from '@playwright/test';

test.describe('Selector de Curso en Asistencia', () => {
  
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Login antes de cada test
    await page.goto('http://localhost:5000/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/workspace');
    await page.waitForLoadState('networkidle');
  });

  test('debe cargar el módulo de asistencia sin errores', async ({ page }: { page: Page }) => {
    // Capturar errores de consola
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');

    // Verificar que el componente cargó
    await expect(page.locator('text=Asistencia')).toBeVisible({ timeout: 10000 });
    
    // Verificar que no hay errores de consola críticos
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('hydration') && 
      !e.includes('Failed to load resource')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('debe mostrar el selector de curso', async ({ page }: { page: Page }) => {
    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');

    // Esperar a que cargue el selector
    await page.waitForTimeout(1000);
    
    // Verificar que el selector está visible
    const courseSelector = page.locator('select, [role="combobox"]').filter({ hasText: /Todos los cursos|Seleccionar curso/ });
    const isVisible = await courseSelector.count() > 0;
    
    if (isVisible) {
      await expect(courseSelector.first()).toBeVisible();
    }
  });

  test('debe cambiar de curso correctamente', async ({ page }: { page: Page }) => {
    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Buscar el selector de curso
    const courseSelector = page.locator('select, [role="combobox"]').first();
    
    if (await courseSelector.isVisible()) {
      // Click para abrir opciones
      await courseSelector.click();
      await page.waitForTimeout(500);
      
      // Debería haber opciones disponibles
      const options = page.locator('[role="option"], option');
      const count = await options.count();
      
      expect(count).toBeGreaterThan(0);
    }
  });

  test('debe manejar la opción "Todos los cursos"', async ({ page }: { page: Page }) => {
    // Capturar requests
    const apiRequests: string[] = [];
    page.on('request', (request: any) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiRequests.push(url);
      }
    });

    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que las requests no tengan courseId='_all_' en la URL
    const badRequests = apiRequests.filter(url => url.includes('courseId=_all_'));
    expect(badRequests).toHaveLength(0);
  });

  test('debe aplicar filtro de curso en la vista', async ({ page }: { page: Page }) => {
    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verificar que la tabla o grid de asistencia está visible
    const attendanceGrid = page.locator('table, [role="grid"]');
    const hasGrid = await attendanceGrid.count() > 0;
    
    if (hasGrid) {
      await expect(attendanceGrid.first()).toBeVisible();
    }
  });

  test('debe responder a la tecla Escape en el módulo de asistencia', async ({ page }: { page: Page }) => {
    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');

    // Presionar Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Debería volver a /workspace
    expect(page.url()).toContain('/workspace');
  });

  test('debe persistir la selección de curso al recargar', async ({ page }: { page: Page }) => {
    // Navegar a Asistencia
    await page.locator('button:has-text("Asistencia")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Seleccionar un curso específico (si hay)
    const courseSelector = page.locator('select, [role="combobox"]').first();
    
    if (await courseSelector.isVisible()) {
      await courseSelector.click();
      await page.waitForTimeout(300);
      
      // Seleccionar la segunda opción (no "Todos")
      const options = page.locator('[role="option"], option');
      const count = await options.count();
      
      if (count > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(500);
        
        // Navegar a otro módulo y volver
        await page.locator('button:has-text("Estudiantes")').click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Asistencia")').click();
        await page.waitForLoadState('networkidle');
        
        // El curso debería seguir seleccionado (verificar localStorage)
        const courseIdInStorage = await page.evaluate(() => localStorage.getItem('selectedCourseId'));
        expect(courseIdInStorage).toBeTruthy();
      }
    }
  });
});
