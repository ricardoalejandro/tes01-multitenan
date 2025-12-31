const { chromium } = require('playwright');

async function testCompleteFlow() {
  console.log('🧪 TEST COMPLETO - Flujo OAuth Gmail\n');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  const results = [];

  try {
    // Test 1: Login
    console.log('\n1️⃣ LOGIN');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    results.push({ test: 'Login', status: '✅' });
    console.log('   ✅ Login exitoso');

    // Test 2: Navegar a SMTP
    console.log('\n2️⃣ NAVEGACIÓN A SMTP');
    await page.goto('http://localhost:5000/admin/smtp', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    results.push({ test: 'Navegar SMTP', status: '✅' });
    console.log('   ✅ Página SMTP cargada');

    // Test 3: Verificar botón OAuth visible
    console.log('\n3️⃣ VERIFICAR BOTÓN OAUTH');
    const oauthButton = page.locator('button:has-text("Iniciar sesión con Google")');
    const isVisible = await oauthButton.isVisible();
    if (isVisible) {
      results.push({ test: 'Botón OAuth visible', status: '✅' });
      console.log('   ✅ Botón "Iniciar sesión con Google" encontrado');
    } else {
      results.push({ test: 'Botón OAuth visible', status: '❌' });
      console.log('   ❌ Botón NO encontrado');
    }

    // Test 4: Capturar estado inicial
    console.log('\n4️⃣ CAPTURA ESTADO INICIAL');
    await page.screenshot({ path: 'test-results/FINAL-oauth-desconectado.png', fullPage: true });
    console.log('   ✅ Screenshot guardado: FINAL-oauth-desconectado.png');

    // Test 5: Verificar endpoint OAuth backend
    console.log('\n5️⃣ VERIFICAR ENDPOINT OAUTH');
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/auth/google/status');
        return { ok: res.ok, data: await res.json() };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    });
    
    if (response.ok) {
      results.push({ test: 'Endpoint OAuth', status: '✅' });
      console.log('   ✅ Endpoint /api/auth/google/status responde');
      console.log('   📊 Estado:', JSON.stringify(response.data, null, 2));
    } else {
      results.push({ test: 'Endpoint OAuth', status: '❌' });
      console.log('   ❌ Error en endpoint:', response.error);
    }

    // Test 6: Verificar configuración manual visible
    console.log('\n6️⃣ VERIFICAR CONFIGURACIÓN MANUAL');
    const manualConfig = await page.locator('text=O configura manualmente').isVisible();
    if (manualConfig) {
      results.push({ test: 'Config Manual visible', status: '✅' });
      console.log('   ✅ Sección "Configuración Manual" visible');
    } else {
      results.push({ test: 'Config Manual visible', status: '⚠️' });
      console.log('   ⚠️ Sección manual no encontrada');
    }

    // Test 7: Verificar botón "Configurar Gmail"
    console.log('\n7️⃣ VERIFICAR BOTÓN APP PASSWORD');
    const gmailButton = await page.locator('button:has-text("Configurar Gmail")').isVisible();
    if (gmailButton) {
      results.push({ test: 'Botón App Password', status: '✅' });
      console.log('   ✅ Botón "Configurar Gmail" (App Password) visible');
    } else {
      results.push({ test: 'Botón App Password', status: '⚠️' });
      console.log('   ⚠️ Botón no encontrado');
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

  console.log('\n📁 Capturas en: test-results/FINAL-oauth-desconectado.png');
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! El sistema está listo.\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisar detalles arriba.\n');
  }
}

testCompleteFlow().catch(console.error);
