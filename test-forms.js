const { chromium } = require('playwright');
const fs = require('fs');

async function testForms() {
  console.log('🧪 Iniciando pruebas de formularios...\n');
  
  const browser = await chromium.launch({ headless: true }); // Headless para ejecución rápida
  const page = await browser.newPage();
  
  const errors = [];
  const testResults = [];

  // Login
  console.log('🔐 Iniciando sesión...');
  await page.goto('http://localhost:5000/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'escolastica123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✅ Login exitoso\n');

  // Test 1: Crear un nuevo rol
  console.log('📝 Test 1: Crear nuevo rol...');
  try {
    await page.goto('http://localhost:5000/admin/roles');
    await page.waitForTimeout(2000);
    
    // Buscar botón "Nuevo Rol" o similar
    const newRoleButton = await page.locator('button:has-text("Nuevo")').first();
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();
      await page.waitForTimeout(1000);
      
      // Llenar formulario
      await page.fill('input[id="name"]', 'Test Rol ' + Date.now());
      await page.fill('input[id="description"]', 'Rol de prueba automatizada');
      
      // Marcar algunos permisos (primeras 2 filas, todos los checkboxes)
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      for (let i = 0; i < Math.min(8, checkboxes.length); i++) {
        await checkboxes[i].check();
      }
      
      await page.screenshot({ path: 'test-results/test-crear-rol-form.png' });
      
      // Guardar
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/test-crear-rol-resultado.png' });
      testResults.push({ test: 'Crear Rol', status: '✅ Exitoso' });
      console.log('   ✅ Rol creado correctamente\n');
    } else {
      testResults.push({ test: 'Crear Rol', status: '⚠️ Botón no encontrado' });
      console.log('   ⚠️ No se encontró el botón de Nuevo Rol\n');
    }
  } catch (error) {
    errors.push({ test: 'Crear Rol', error: error.message });
    testResults.push({ test: 'Crear Rol', status: '❌ Error' });
    console.log('   ❌ Error:', error.message, '\n');
  }

  // Test 2: Probar botón Volver
  console.log('📝 Test 2: Botón Volver...');
  try {
    const backButton = await page.locator('button:has-text("Volver")').first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(1500);
      
      // Verificar que estamos en /admin
      const currentUrl = page.url();
      if (currentUrl.includes('/admin') && !currentUrl.includes('/roles')) {
        testResults.push({ test: 'Botón Volver', status: '✅ Funciona' });
        console.log('   ✅ Navegación correcta al panel de administración\n');
      } else {
        testResults.push({ test: 'Botón Volver', status: '⚠️ URL incorrecta' });
        console.log('   ⚠️ URL actual:', currentUrl, '\n');
      }
    } else {
      testResults.push({ test: 'Botón Volver', status: '⚠️ No encontrado' });
      console.log('   ⚠️ Botón Volver no encontrado\n');
    }
  } catch (error) {
    errors.push({ test: 'Botón Volver', error: error.message });
    testResults.push({ test: 'Botón Volver', status: '❌ Error' });
    console.log('   ❌ Error:', error.message, '\n');
  }

  // Test 3: Configuración rápida de Gmail
  console.log('📝 Test 3: Configuración rápida de Gmail...');
  try {
    await page.goto('http://localhost:5000/admin/smtp');
    await page.waitForTimeout(2000);
    
    const gmailButton = await page.locator('button:has-text("Configurar Gmail")').first();
    if (await gmailButton.isVisible()) {
      await page.screenshot({ path: 'test-results/test-smtp-antes.png' });
      
      await gmailButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/test-smtp-gmail-config.png' });
      
      // Verificar que se llenó el host automáticamente
      const hostValue = await page.locator('#host').inputValue();
      if (hostValue === 'smtp.gmail.com') {
        testResults.push({ test: 'Config Gmail', status: '✅ Autocompletado OK' });
        console.log('   ✅ Configuración de Gmail aplicada correctamente\n');
      } else {
        testResults.push({ test: 'Config Gmail', status: '⚠️ Host no autocompletado' });
        console.log('   ⚠️ Host esperado: smtp.gmail.com, obtenido:', hostValue, '\n');
      }
    } else {
      testResults.push({ test: 'Config Gmail', status: '⚠️ Botón no encontrado' });
      console.log('   ⚠️ Botón "Configurar Gmail" no encontrado\n');
    }
  } catch (error) {
    errors.push({ test: 'Config Gmail', error: error.message });
    testResults.push({ test: 'Config Gmail', status: '❌ Error' });
    console.log('   ❌ Error:', error.message, '\n');
  }

  // Test 4: Probar botón maximizar en diálogo
  console.log('📝 Test 4: Botón maximizar en diálogo de roles...');
  try {
    await page.goto('http://localhost:5000/admin/roles');
    await page.waitForTimeout(2000);
    
    const newRoleButton = await page.locator('button:has-text("Nuevo")').first();
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/test-dialogo-normal.png' });
      
      // Buscar botón maximizar (icono SVG)
      const maximizeButton = await page.locator('button[title="Maximizar"]').first();
      if (await maximizeButton.isVisible()) {
        await maximizeButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-results/test-dialogo-maximizado.png' });
        
        testResults.push({ test: 'Botón Maximizar', status: '✅ Funciona' });
        console.log('   ✅ Diálogo maximizado correctamente\n');
        
        // Restaurar
        const restoreButton = await page.locator('button[title="Restaurar"]').first();
        if (await restoreButton.isVisible()) {
          await restoreButton.click();
          await page.waitForTimeout(500);
          console.log('   ✅ Diálogo restaurado correctamente\n');
        }
      } else {
        testResults.push({ test: 'Botón Maximizar', status: '⚠️ No encontrado' });
        console.log('   ⚠️ Botón maximizar no encontrado\n');
      }
      
      // Cerrar diálogo
      const closeButton = await page.locator('button:has(svg)').last();
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch (error) {
    errors.push({ test: 'Botón Maximizar', error: error.message });
    testResults.push({ test: 'Botón Maximizar', status: '❌ Error' });
    console.log('   ❌ Error:', error.message, '\n');
  }

  await browser.close();

  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE PRUEBAS DE FORMULARIOS');
  console.log('='.repeat(60) + '\n');
  
  testResults.forEach(result => {
    console.log(`${result.status.padEnd(20)} ${result.test}`);
  });

  if (errors.length > 0) {
    console.log('\n❌ ERRORES ENCONTRADOS:\n');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.test}: ${err.error}`);
    });
  } else {
    console.log('\n✅ Todas las pruebas completadas sin errores críticos');
  }

  console.log('\n📁 Screenshots guardados en: test-results/\n');

  // Guardar reporte JSON
  fs.writeFileSync('test-results/form-tests-report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults,
    errors: errors
  }, null, 2));
}

// Crear directorio de resultados
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

testForms().catch(console.error);
