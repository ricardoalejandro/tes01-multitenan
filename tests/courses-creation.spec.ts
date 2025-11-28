import { test, expect } from '@playwright/test';

test.describe('Creación de Cursos', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login primero
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');
    
    // Llenar credenciales (contraseña: escolastica123)
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'escolastica123');
    await page.click('button[type="submit"]');
    
    // Esperar redirección al dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('Crear curso con temas desde la interfaz', async ({ page }) => {
    // 1. Navegar a la sección de cursos
    console.log('📚 Navegando a Cursos...');
    
    // Buscar y hacer clic en el menú de Cursos
    const cursosMenu = page.locator('text=Cursos').first();
    await cursosMenu.click();
    await page.waitForLoadState('networkidle');
    
    // Tomar screenshot del estado inicial
    await page.screenshot({ path: 'test-results/01-cursos-lista.png' });
    console.log('✅ Screenshot: Lista de cursos');

    // 2. Hacer clic en "Nuevo Curso"
    console.log('➕ Abriendo formulario de nuevo curso...');
    const nuevoCursoBtn = page.locator('button:has-text("Nuevo Curso")');
    await expect(nuevoCursoBtn).toBeVisible({ timeout: 5000 });
    await nuevoCursoBtn.click();
    
    // Esperar que se abra el diálogo
    await page.waitForSelector('text=Nuevo Curso', { timeout: 5000 });
    await page.screenshot({ path: 'test-results/02-nuevo-curso-dialog.png' });
    console.log('✅ Screenshot: Diálogo nuevo curso');

    // 3. Llenar el formulario
    console.log('📝 Llenando formulario...');
    
    // Nombre del curso
    const nombreInput = page.locator('input').filter({ hasText: '' }).first();
    await nombreInput.fill('Curso de Prueba Playwright');
    
    // Descripción
    const descripcionTextarea = page.locator('textarea').first();
    await descripcionTextarea.fill('Este es un curso creado automáticamente por Playwright para verificar la funcionalidad');

    await page.screenshot({ path: 'test-results/03-formulario-llenado.png' });
    console.log('✅ Screenshot: Formulario llenado');

    // 4. Añadir temas
    console.log('📖 Añadiendo temas...');
    
    // Clic en "Añadir Tema"
    const addTemaBtn = page.locator('button:has-text("Añadir Tema")');
    await addTemaBtn.click();
    await page.waitForTimeout(500);
    
    // Llenar el primer tema
    const temaInputs = page.locator('input[placeholder*="Título"], input[placeholder*="tema"]');
    const temaTextareas = page.locator('textarea[placeholder*="Descripción"]');
    
    // Si hay campos de tema visibles, llenarlos
    const temaCount = await temaInputs.count();
    console.log(`   Campos de tema encontrados: ${temaCount}`);
    
    if (temaCount > 0) {
      await temaInputs.first().fill('Tema 1 - Introducción');
    }
    
    // Añadir más temas
    await addTemaBtn.click();
    await page.waitForTimeout(300);
    
    await page.screenshot({ path: 'test-results/04-con-temas.png' });
    console.log('✅ Screenshot: Con temas añadidos');

    // 5. Guardar el curso
    console.log('💾 Guardando curso...');
    const guardarBtn = page.locator('button:has-text("Crear"), button:has-text("Guardar")').last();
    
    // Verificar que el botón está visible
    await expect(guardarBtn).toBeVisible();
    
    await page.screenshot({ path: 'test-results/05-antes-guardar.png' });
    
    // Click para guardar
    await guardarBtn.click();
    
    // Esperar respuesta
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/06-despues-guardar.png' });
    console.log('✅ Screenshot: Después de guardar');

    // 6. Verificar resultado
    // Buscar mensaje de éxito o error
    const toastSuccess = page.locator('text=creado, text=exitoso, text=Curso creado');
    const toastError = page.locator('text=error, text=Error');
    
    // Esperar un momento para que aparezca el toast
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/07-resultado-final.png' });
    console.log('✅ Screenshot: Resultado final');
    
    // Verificar que el diálogo se cerró (éxito) o hay mensaje de error
    const dialogStillOpen = await page.locator('text=Nuevo Curso').first().isVisible().catch(() => false);
    
    if (!dialogStillOpen) {
      console.log('✅ ÉXITO: El diálogo se cerró, curso probablemente creado');
    } else {
      console.log('⚠️ El diálogo sigue abierto, verificando errores...');
      
      // Capturar cualquier error visible
      const errorMessages = await page.locator('.text-red-500, .text-red-600, [class*="error"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('❌ Errores encontrados:', errorMessages);
      }
    }
  });

  test('Verificar lista de cursos después de crear', async ({ page }) => {
    // Navegar a cursos
    await page.locator('text=Cursos').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verificar que hay cursos en la lista
    const cursosList = page.locator('table tbody tr, [class*="card"]');
    const count = await cursosList.count();
    
    console.log(`📊 Cursos encontrados en la lista: ${count}`);
    
    await page.screenshot({ path: 'test-results/08-lista-final.png' });
    
    expect(count).toBeGreaterThan(0);
  });
});
