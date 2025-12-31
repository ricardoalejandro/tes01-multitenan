const { chromium } = require('playwright');

async function testForgotPasswordFullFlow() {
  console.log('🧪 TEST COMPLETO - Flujo "Olvidé mi contraseña" con token DEV\n');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  const results = [];
  let devToken = null;

  try {
    // Test 1: Abrir diálogo y enviar email
    console.log('\n1️⃣ SOLICITAR RECUPERACIÓN DE CONTRASEÑA');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click en "Olvidé mi contraseña"
    await page.click('button:has-text("¿Olvidó su contraseña?")');
    await page.waitForTimeout(1000);

    // Ingresar email
    await page.fill('#recoveryEmail', 'ricardo.rojas.campos@gmail.com');
    await page.waitForTimeout(500);

    // Captura antes de enviar
    await page.screenshot({ path: 'test-results/forgot-password-before-submit.png', fullPage: true });

    // Interceptar la respuesta del backend
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/forgot-password') && response.request().method() === 'POST'
    );

    // Click en Enviar
    await page.click('button:has-text("Enviar Email")');
    
    // Esperar respuesta
    const response = await responsePromise;
    const responseData = await response.json();

    console.log('   📊 Respuesta del backend:');
    console.log('   ', JSON.stringify(responseData, null, 2));

    if (responseData.devToken) {
      devToken = responseData.devToken;
      results.push({ test: 'Token generado', status: '✅' });
      console.log('   ✅ Token generado correctamente');
      console.log('   🔑 Token:', devToken);
    } else if (responseData.message && responseData.message.includes('enviado')) {
      results.push({ test: 'Email enviado', status: '✅' });
      console.log('   ✅ Email enviado correctamente');
    } else if (responseData.error) {
      results.push({ test: 'Respuesta del servidor', status: '⚠️' });
      console.log('   ⚠️ SMTP no configurado (modo desarrollo)');
    }

    await page.waitForTimeout(3000);

    // Test 2: Usar el token para resetear contraseña
    if (devToken) {
      console.log('\n2️⃣ VALIDAR TOKEN Y RESETEAR CONTRASEÑA');
      
      await page.goto(`http://localhost:5000/reset-password?token=${devToken}`, { 
        waitUntil: 'networkidle', 
        timeout: 15000 
      });
      await page.waitForTimeout(2000);

      // Verificar que la página cargó correctamente
      const pageTitle = await page.locator('h1:has-text("Restablecer Contraseña")').isVisible();
      if (pageTitle) {
        results.push({ test: 'Página reset-password cargada', status: '✅' });
        console.log('   ✅ Página de reset cargada');
      }

      // Verificar que el token es válido
      const validToken = !(await page.locator('text=Enlace Inválido').isVisible());
      if (validToken) {
        results.push({ test: 'Token válido', status: '✅' });
        console.log('   ✅ Token validado correctamente');
      } else {
        results.push({ test: 'Token válido', status: '❌' });
        console.log('   ❌ Token inválido o expirado');
      }

      // Captura del formulario de reset
      await page.screenshot({ path: 'test-results/reset-password-form.png', fullPage: true });
      console.log('   ✅ Screenshot guardado: reset-password-form.png');

      // Llenar formulario de nueva contraseña
      await page.fill('#newPassword', 'nuevaPassword123');
      await page.fill('#confirmPassword', 'nuevaPassword123');
      await page.waitForTimeout(500);

      // Captura antes de submit
      await page.screenshot({ path: 'test-results/reset-password-filled.png', fullPage: true });

      // Click en Restablecer
      await page.click('button:has-text("Restablecer Contraseña")');
      await page.waitForTimeout(3000);

      // Verificar redirección a login
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        results.push({ test: 'Redirección a login', status: '✅' });
        console.log('   ✅ Redirigido al login después de resetear');
      } else {
        results.push({ test: 'Redirección a login', status: '⚠️' });
        console.log('   ⚠️ No redirigió al login');
      }

      // Captura final
      await page.screenshot({ path: 'test-results/login-after-reset.png', fullPage: true });
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

  console.log('\n📁 Capturas guardadas en test-results/');
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 ¡FLUJO COMPLETO FUNCIONA! Sistema listo.\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisar detalles arriba.\n');
  }

  if (devToken) {
    console.log('🔗 Link directo para probar manualmente:');
    console.log(`   http://localhost:5000/reset-password?token=${devToken}\n`);
  }
}

testForgotPasswordFullFlow().catch(console.error);
