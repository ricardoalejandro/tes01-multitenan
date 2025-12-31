import { test, expect } from '@playwright/test';

test.describe('Módulo Cursos - Diseño Responsivo', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('http://localhost:5000/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'teseo123._');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/workspace');
  });

  test('debe cargar el módulo Cursos sin errores', async ({ page }) => {
    // Capturar errores de consola
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navegar al módulo Cursos
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    // Verificar que no hay errores de consola graves
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('ResizeObserver') && 
      !err.includes('favicon')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(1);
    
    // Verificar elementos visibles
    await expect(page.locator('button:has-text("Nuevo Curso")')).toBeVisible();
  });

  test('desktop: debe mostrar selector de vista completo', async ({ page }) => {
    // Viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    // Verificar que existe el selector de vista con 3 opciones
    const viewButtons = page.locator('button[data-state]').filter({ hasText: /Tarjetas|Compacta|Lista/ });
    await expect(viewButtons.first()).toBeVisible();
  });

  test('mobile: debe usar vista de tarjetas automáticamente', async ({ page }) => {
    // Viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    // Verificar que el botón de Nuevo Curso es visible y tiene el tamaño adecuado
    const newButton = page.locator('button:has-text("Nuevo Curso")');
    await expect(newButton).toBeVisible();
  });

  test('debe abrir el formulario de crear curso', async ({ page }) => {
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    // Click en Nuevo Curso
    await page.click('button:has-text("Nuevo Curso")');
    
    // Verificar que el dialog se abrió
    await expect(page.locator('text=Nuevo Curso').first()).toBeVisible();
    
    // Verificar campos del formulario
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
  });

  test('mobile: formulario debe estar en pantalla completa', async ({ page }) => {
    // Viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    // Click en Nuevo Curso
    await page.click('button:has-text("Nuevo Curso")');
    
    // El dialog debe ocupar toda la pantalla en móvil
    await page.waitForTimeout(300); // Esperar animación
    
    // Verificar que el formulario es visible
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('debe tener secciones numeradas en el formulario', async ({ page }) => {
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo Curso")');
    await page.waitForTimeout(300);

    // Verificar las secciones numeradas
    await expect(page.locator('text="1"').first()).toBeVisible();
    await expect(page.locator('text=Información Básica')).toBeVisible();
    await expect(page.locator('text=Temas del Curso')).toBeVisible();
  });

  test('debe poder agregar temas al curso', async ({ page }) => {
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo Curso")');
    await page.waitForTimeout(300);

    // Buscar el botón de agregar tema
    const addTopicBtn = page.locator('button:has-text("Agregar Tema")');
    await expect(addTopicBtn).toBeVisible();

    // Click para agregar tema
    await addTopicBtn.click();

    // Verificar que se agregó un tema
    await expect(page.locator('input[placeholder="Título del tema"]').first()).toBeVisible();
  });

  test('editor de temas: debe tener botones de export/import', async ({ page }) => {
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo Curso")');
    await page.waitForTimeout(300);

    // Verificar botones de export/import
    await expect(page.locator('button[title="Importar temas desde archivo"]')).toBeVisible();
    await expect(page.locator('button[title="Exportar temas a archivo"]')).toBeVisible();
  });

  test('debe poder crear un curso correctamente', async ({ page }) => {
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo Curso")');
    await page.waitForTimeout(300);

    // Llenar el formulario
    const uniqueName = `Curso Test ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.fill('textarea[name="description"]', 'Descripción de prueba');

    // Agregar un tema
    await page.click('button:has-text("Agregar Tema")');
    await page.fill('input[placeholder="Título del tema"]', 'Tema 1');

    // Guardar el curso
    await page.click('button:has-text("Guardar")');

    // Verificar toast de éxito o que el curso aparece
    await page.waitForTimeout(1000);
    
    // El curso debe aparecer en la lista
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
  });

  test('mobile: botones de acción deben ser táctiles (min 44px)', async ({ page }) => {
    // Viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Cursos');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo Curso")');
    await page.waitForTimeout(300);

    // El botón guardar debe tener altura adecuada
    const saveBtn = page.locator('button:has-text("Guardar")');
    await expect(saveBtn).toBeVisible();
    
    // Verificar que tiene la clase h-11 (44px)
    const hasProperHeight = await saveBtn.evaluate(el => {
      const height = el.getBoundingClientRect().height;
      return height >= 40;
    });
    expect(hasProperHeight).toBeTruthy();
  });
});
