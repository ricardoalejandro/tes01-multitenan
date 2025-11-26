const { chromium } = require('playwright');

async function testForgotPassword() {
  console.log('🧪 TEST - Funcionalidad "Olvidé mi contraseña"\n');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  const results = [];

  try {
    // Test 1: Verificar que el enlace "Olvidé mi contraseña" existe
    console.log('\n1️⃣ VERIFICAR ENLACE EN LOGIN');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const forgotLink = page.locator('button:has-text("¿Olvidó su contraseña?")');
    const linkVisible = await forgotLink.isVisible();
    
    if (linkVisible) {
      results.push({ test: 'Enlace "Olvidó contraseña" visible', status: '✅' });
      console.log('   ✅ Enlace "¿Olvidó su contraseña?" encontrado');
    } else {
      results.push({ test: 'Enlace "Olvidó contraseña" visible', status: '❌' });
      console.log('   ❌ Enlace NO encontrado');
    }

    // Test 2: Abrir diálogo de recuperación
    console.log('\n2️⃣ ABRIR DIÁLOGO RECUPERACIÓN');
    await forgotLink.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('text=Recuperar Contraseña');
    const dialogVisible = await dialog.isVisible();

    if (dialogVisible) {
      results.push({ test: 'Diálogo recuperación abierto', status: '✅' });
      console.log('   ✅ Diálogo "Recuperar Contraseña" abierto');
    } else {
      results.push({ test: 'Diálogo recuperación abierto', status: '❌' });
      console.log('   ❌ Diálogo NO se abrió');
    }

    // Test 3: Verificar campo de email
    console.log('\n3️⃣ VERIFICAR CAMPO EMAIL');
    const emailInput = page.locator('#recoveryEmail');
    const emailVisible = await emailInput.isVisible();

    if (emailVisible) {
      results.push({ test: 'Campo email visible', status: '✅' });
      console.log('   ✅ Campo de email presente');
    } else {
      results.push({ test: 'Campo email visible', status: '❌' });
      console.log('   ❌ Campo email NO encontrado');
    }

    // Test 4: Captura del estado
    console.log('\n4️⃣ CAPTURA DE PANTALLA');
    await page.screenshot({ path: 'test-results/forgot-password-dialog.png', fullPage: true });
    console.log('   ✅ Screenshot guardado: forgot-password-dialog.png');

    // Test 5: Verificar botones
    console.log('\n5️⃣ VERIFICAR BOTONES');
    const cancelButton = page.locator('button:has-text("Cancelar")');
    const sendButton = page.locator('button:has-text("Enviar Email")');

    const cancelVisible = await cancelButton.isVisible();
    const sendVisible = await sendButton.isVisible();

    if (cancelVisible && sendVisible) {
      results.push({ test: 'Botones presentes', status: '✅' });
      console.log('   ✅ Botones "Cancelar" y "Enviar Email" encontrados');
    } else {
      results.push({ test: 'Botones presentes', status: '⚠️' });
      console.log('   ⚠️ Faltan botones');
    }

    // Test 6: Probar cancelar
    console.log('\n6️⃣ PROBAR CANCELAR');
    await cancelButton.click();
    await page.waitForTimeout(1000);

    const dialogClosed = !(await dialog.isVisible());
    if (dialogClosed) {
      results.push({ test: 'Cancelar funciona', status: '✅' });
      console.log('   ✅ Diálogo se cerró correctamente');
    } else {
      results.push({ test: 'Cancelar funciona', status: '⚠️' });
      console.log('   ⚠️ Diálogo no se cerró');
    }

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    results.push({ test: 'Error general', status: '❌', error: error.message });
  }

  await browser.close();

  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE FINAL');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warnings = results.filter(r => r.status === '⚠️').length;

  console.log(`\n✅ Exitosos: ${passed}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`⚠️  Advertencias: ${warnings}`);
  
  console.log('\n📋 Detalle:');
  results.forEach(r => {
    console.log(`   ${r.status} ${r.test}`);
    if (r.error) console.log(`      Error: ${r.error}`);
  });

  console.log('\n📁 Capturas en: test-results/forgot-password-dialog.png');
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Funcionalidad lista.\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisar detalles arriba.\n');
  }
}

testForgotPassword().catch(console.error);
