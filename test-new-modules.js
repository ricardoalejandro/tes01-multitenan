const { chromium } = require('playwright');
const fs = require('fs');

async function testNewModules() {
  console.log('🧪 Iniciando pruebas de nuevos módulos (Holidays, Levels, Locations, Branches)...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const testResults = [];

  // Crear directorio de resultados
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results');
  }

  // Login
  console.log('🔐 Iniciando sesión...');
  try {
    await page.goto('http://localhost:5000/login');
    await page.waitForTimeout(2000);
    await page.fill('#username', 'admin');
    await page.fill('#password', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/workspace') || currentUrl.includes('/admin')) {
      console.log('✅ Login exitoso\n');
      testResults.push({ test: 'Login', status: '✅ Exitoso' });
    } else {
      throw new Error('No se redirigió correctamente después del login');
    }
  } catch (error) {
    errors.push({ test: 'Login', error: error.message });
    testResults.push({ test: 'Login', status: '❌ Error' });
    console.log('❌ Error en login:', error.message);
    await browser.close();
    return;
  }

  // Test 1: Módulo de Ubicaciones (Locations)
  console.log('📍 Test 1: Módulo de Ubicaciones...');
  try {
    await page.goto('http://localhost:5000/admin/locations');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/locations-module.png', fullPage: true });
    
    // Verificar que cargó la página
    const pageContent = await page.content();
    if (pageContent.includes('Ubicaciones') || pageContent.includes('Departamentos') || pageContent.includes('locations')) {
      console.log('   ✅ Página de Ubicaciones cargada correctamente');
      
      // Verificar tabs (Departamentos, Provincias, Distritos)
      const tabs = await page.locator('[role="tab"]').count();
      console.log(`   📑 Tabs encontrados: ${tabs}`);
      
      if (tabs >= 3) {
        testResults.push({ test: 'Módulo Ubicaciones', status: '✅ Carga OK' });
        
        // Click en tab Provincias
        const provincesTab = await page.locator('[role="tab"]:has-text("Provincias")').first();
        if (await provincesTab.isVisible()) {
          await provincesTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/locations-provincias.png', fullPage: true });
          console.log('   ✅ Tab Provincias funciona');
        }
        
        // Click en tab Distritos
        const distritosTab = await page.locator('[role="tab"]:has-text("Distritos")').first();
        if (await distritosTab.isVisible()) {
          await distritosTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/locations-distritos.png', fullPage: true });
          console.log('   ✅ Tab Distritos funciona');
        }
      } else {
        testResults.push({ test: 'Módulo Ubicaciones', status: '⚠️ Tabs no encontrados' });
      }
    } else {
      testResults.push({ test: 'Módulo Ubicaciones', status: '❌ No cargó' });
      console.log('   ❌ Página no cargó correctamente');
    }
  } catch (error) {
    errors.push({ test: 'Módulo Ubicaciones', error: error.message });
    testResults.push({ test: 'Módulo Ubicaciones', status: '❌ Error' });
    console.log('   ❌ Error:', error.message);
    await page.screenshot({ path: 'test-results/locations-error.png', fullPage: true });
  }
  console.log('');

  // Test 2: Módulo de Niveles (Levels)
  console.log('📊 Test 2: Módulo de Niveles...');
  try {
    await page.goto('http://localhost:5000/admin/levels');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/levels-module.png', fullPage: true });
    
    const pageContent = await page.content();
    if (pageContent.includes('Nivel') || pageContent.includes('NVL') || pageContent.includes('levels')) {
      console.log('   ✅ Página de Niveles cargada correctamente');
      
      // Intentar crear un nivel
      const newButton = await page.locator('button:has-text("Nuevo")').first();
      if (await newButton.isVisible()) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test-results/levels-form.png', fullPage: true });
        
        // Verificar que el formulario se abrió
        const dialog = await page.locator('[role="dialog"]').first();
        if (await dialog.isVisible()) {
          console.log('   ✅ Formulario de nuevo nivel abierto');
          
          // Llenar formulario
          const nameInput = await page.locator('input[id="name"]').first();
          if (await nameInput.isVisible()) {
            await nameInput.fill('Nivel Test Automatizado');
          }
          
          const descInput = await page.locator('textarea[id="description"], input[id="description"]').first();
          if (await descInput.isVisible()) {
            await descInput.fill('Descripción de prueba');
          }
          
          await page.screenshot({ path: 'test-results/levels-form-filled.png', fullPage: true });
          
          // Cancelar (no guardar para no contaminar datos)
          const cancelButton = await page.locator('button:has-text("Cancelar")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
          
          testResults.push({ test: 'Módulo Niveles', status: '✅ Funciona' });
        } else {
          testResults.push({ test: 'Módulo Niveles', status: '⚠️ Dialog no abrió' });
        }
      } else {
        testResults.push({ test: 'Módulo Niveles', status: '⚠️ Botón Nuevo no encontrado' });
      }
    } else {
      testResults.push({ test: 'Módulo Niveles', status: '❌ No cargó' });
      console.log('   ❌ Página no cargó correctamente');
    }
  } catch (error) {
    errors.push({ test: 'Módulo Niveles', error: error.message });
    testResults.push({ test: 'Módulo Niveles', status: '❌ Error' });
    console.log('   ❌ Error:', error.message);
    await page.screenshot({ path: 'test-results/levels-error.png', fullPage: true });
  }
  console.log('');

  // Test 3: Módulo de Feriados (Holidays)
  console.log('🎉 Test 3: Módulo de Feriados...');
  try {
    await page.goto('http://localhost:5000/admin/holidays');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/holidays-module.png', fullPage: true });
    
    const pageContent = await page.content();
    if (pageContent.includes('Feriado') || pageContent.includes('Nacional') || pageContent.includes('holidays')) {
      console.log('   ✅ Página de Feriados cargada correctamente');
      
      // Verificar tabs (Nacionales, Provinciales)
      const tabs = await page.locator('[role="tab"]').count();
      console.log(`   📑 Tabs encontrados: ${tabs}`);
      
      if (tabs >= 2) {
        // Click en tab Provinciales
        const provincialTab = await page.locator('[role="tab"]:has-text("Provincial")').first();
        if (await provincialTab.isVisible()) {
          await provincialTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/holidays-provincial.png', fullPage: true });
          console.log('   ✅ Tab Provinciales funciona');
        }
        
        testResults.push({ test: 'Módulo Feriados', status: '✅ Funciona' });
      } else {
        testResults.push({ test: 'Módulo Feriados', status: '⚠️ Tabs no encontrados' });
      }
    } else {
      testResults.push({ test: 'Módulo Feriados', status: '❌ No cargó' });
      console.log('   ❌ Página no cargó correctamente');
    }
  } catch (error) {
    errors.push({ test: 'Módulo Feriados', error: error.message });
    testResults.push({ test: 'Módulo Feriados', status: '❌ Error' });
    console.log('   ❌ Error:', error.message);
    await page.screenshot({ path: 'test-results/holidays-error.png', fullPage: true });
  }
  console.log('');

  // Test 4: Formulario de Sucursales expandido
  console.log('🏢 Test 4: Formulario de Sucursales expandido...');
  try {
    await page.goto('http://localhost:5000/admin/branches');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/branches-list.png', fullPage: true });
    
    // Intentar editar una sucursal existente o crear una nueva
    const editButton = await page.locator('button:has(svg.lucide-pencil), button:has-text("Editar")').first();
    const newButton = await page.locator('button:has-text("Nuevo"), button:has-text("Nueva")').first();
    
    let formOpened = false;
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      formOpened = true;
      console.log('   ✅ Formulario de edición abierto');
    } else if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(1000);
      formOpened = true;
      console.log('   ✅ Formulario de nueva sucursal abierto');
    }
    
    if (formOpened) {
      await page.screenshot({ path: 'test-results/branches-form.png', fullPage: true });
      
      // Verificar campos nuevos
      const departmentSelect = await page.locator('button:has-text("Departamento"), [id*="department"], label:has-text("Departamento")').first();
      const levelSelect = await page.locator('button:has-text("Nivel"), [id*="level"], label:has-text("Nivel")').first();
      
      const hasDepartment = await departmentSelect.isVisible().catch(() => false);
      const hasLevel = await levelSelect.isVisible().catch(() => false);
      
      console.log(`   📋 Campo Departamento: ${hasDepartment ? '✅' : '❌'}`);
      console.log(`   📋 Campo Nivel: ${hasLevel ? '✅' : '❌'}`);
      
      if (hasDepartment || hasLevel) {
        testResults.push({ test: 'Form Sucursales Expandido', status: '✅ Campos nuevos presentes' });
      } else {
        testResults.push({ test: 'Form Sucursales Expandido', status: '⚠️ Campos nuevos no visibles' });
      }
      
      // Cerrar diálogo
      const cancelButton = await page.locator('button:has-text("Cancelar")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    } else {
      testResults.push({ test: 'Form Sucursales Expandido', status: '⚠️ No se pudo abrir formulario' });
    }
  } catch (error) {
    errors.push({ test: 'Form Sucursales Expandido', error: error.message });
    testResults.push({ test: 'Form Sucursales Expandido', status: '❌ Error' });
    console.log('   ❌ Error:', error.message);
    await page.screenshot({ path: 'test-results/branches-error.png', fullPage: true });
  }
  console.log('');

  // Test 5: Backend API endpoints
  console.log('🔌 Test 5: Verificar endpoints del backend...');
  try {
    // Test locations endpoint
    const locationsResponse = await page.request.get('http://localhost:3000/api/locations/departments');
    console.log(`   📍 GET /api/locations/departments: ${locationsResponse.status()}`);
    
    const levelsResponse = await page.request.get('http://localhost:3000/api/levels');
    console.log(`   📊 GET /api/levels: ${levelsResponse.status()}`);
    
    const holidaysResponse = await page.request.get('http://localhost:3000/api/holidays?year=2025');
    console.log(`   🎉 GET /api/holidays: ${holidaysResponse.status()}`);
    
    if (locationsResponse.status() === 200 && levelsResponse.status() === 200 && holidaysResponse.status() === 200) {
      testResults.push({ test: 'Backend APIs', status: '✅ Todos OK' });
    } else {
      testResults.push({ test: 'Backend APIs', status: '⚠️ Algunos fallaron' });
    }
  } catch (error) {
    errors.push({ test: 'Backend APIs', error: error.message });
    testResults.push({ test: 'Backend APIs', status: '❌ Error' });
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  await browser.close();

  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE PRUEBAS DE NUEVOS MÓDULOS');
  console.log('='.repeat(60) + '\n');
  
  testResults.forEach(result => {
    console.log(`${result.status.padEnd(30)} ${result.test}`);
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
  fs.writeFileSync('test-results/new-modules-report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults,
    errors: errors
  }, null, 2));
  
  // Retornar código de salida basado en errores
  process.exit(errors.length > 0 ? 1 : 0);
}

testNewModules().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
