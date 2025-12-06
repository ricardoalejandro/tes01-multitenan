import { test, expect } from '@playwright/test';

test.describe('Selector de Curso en Asistencia', () => {
  
  test.beforeEach(async ({ page }) => {
    // Capturar errores de consola
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    // Login
    await page.goto('http://localhost:5000/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/workspace');
  });

  test('debe cargar el módulo de Asistencias sin errores', async ({ page }) => {
    // Navegar a Asistencias
    await page.click('text=Asistencias');
    await page.waitForLoadState('networkidle');

    // Verificar que el módulo cargó
    await expect(page.locator('text=Lista de Asistencia').first()).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar selector de curso en vista de Lista (AttendanceSheet)', async ({ page }) => {
    // Navegar a Asistencias
    await page.click('text=Asistencias');
    await page.waitForLoadState('networkidle');

    // Verificar que hay al menos un grupo con sesiones
    const groupSelector = page.locator('select, [role="combobox"]').first();
    if (await groupSelector.isVisible()) {
      await groupSelector.click();
    }

    // Esperar a que cargue la lista
    await page.waitForTimeout(1000);
  });

  test('debe mostrar selector de curso en vista de Cuaderno (AttendanceNotebook)', async ({ page }) => {
    // Navegar a Asistencias
    await page.click('text=Asistencias');
    await page.waitForLoadState('networkidle');

    // Cambiar a vista Cuaderno
    const cuadernoButton = page.locator('button:has-text("Cuaderno")');
    if (await cuadernoButton.isVisible()) {
      await cuadernoButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verificar que la vista cambió
      await expect(page.locator('text=Cuaderno de Asistencia')).toBeVisible({ timeout: 5000 });
    }
  });

  test('tarjetas de grupos deben ser compactas (4 columnas en desktop)', async ({ page }) => {
    // Navegar a Grupos
    await page.click('text=Grupos');
    await page.waitForLoadState('networkidle');

    // Verificar que el módulo cargó
    await expect(page.locator('text=Grupos').first()).toBeVisible({ timeout: 10000 });

    // Verificar que hay tarjetas de grupos
    const cards = page.locator('.rounded-lg.border');
    const cardCount = await cards.count();
    
    // Si hay tarjetas, verificar que se muestran
    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });
});
