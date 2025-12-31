const { chromium } = require('playwright');
const fs = require('fs');

async function testVisual() {
  console.log('📸 Iniciando capturas visuales de formularios...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });
  
  const captures = [];

  try {
    // Login
    console.log('🔐 Login...');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 10000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    console.log('✅ Login exitoso\n');

    // Test 1: Vista de Roles con botón Volver
    console.log('📸 Captura 1: Página de Roles con botón Volver...');
    await page.goto('http://localhost:5000/admin/roles', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/visual-roles-page.png', fullPage: true });
    captures.push({ name: 'Página Roles', status: '✅' });
    console.log('   ✅ Capturado\n');

    // Test 2: Diálogo de Nuevo Rol (Normal)
    console.log('📸 Captura 2: Diálogo de Nuevo Rol (vista normal)...');
    const newButton = page.locator('button:has-text("Nuevo")').first();
    await newButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/visual-dialog-role-normal.png' });
    captures.push({ name: 'Diálogo Normal', status: '✅' });
    console.log('   ✅ Capturado\n');

    // Test 3: Diálogo Maximizado
    console.log('📸 Captura 3: Diálogo maximizado...');
    const maximizeBtn = page.locator('button').filter({ hasText: '' }).nth(1);
    await maximizeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/visual-dialog-role-maximized.png' });
    captures.push({ name: 'Diálogo Maximizado', status: '✅' });
    console.log('   ✅ Capturado\n');

    // Cerrar diálogo
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test 4: Página SMTP con botón Volver
    console.log('📸 Captura 4: Página SMTP con botón Volver...');
    await page.goto('http://localhost:5000/admin/smtp', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/visual-smtp-inicial.png', fullPage: true });
    captures.push({ name: 'Página SMTP Inicial', status: '✅' });
    console.log('   ✅ Capturado\n');

    // Test 5: Configuración rápida de Gmail activada
    console.log('📸 Captura 5: Config Gmail activada...');
    const gmailBtn = page.locator('button:has-text("Configurar Gmail")');
    await gmailBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/visual-smtp-gmail-config.png', fullPage: true });
    captures.push({ name: 'Config Gmail', status: '✅' });
    console.log('   ✅ Capturado\n');

    // Test 6: Verificar autocomplete
    const hostValue = await page.locator('#host').inputValue();
    const portValue = await page.locator('#port').inputValue();
    console.log(`\n📋 Valores autocompletados:`);
    console.log(`   Host: ${hostValue} ${hostValue === 'smtp.gmail.com' ? '✅' : '❌'}`);
    console.log(`   Puerto: ${portValue} ${portValue === '587' ? '✅' : '❌'}\n`);

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    captures.push({ name: 'Error', status: '❌', error: error.message });
  }

  await browser.close();

  // Reporte
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE CAPTURAS VISUALES');
  console.log('='.repeat(60) + '\n');
  
  captures.forEach(cap => {
    console.log(`${cap.status} ${cap.name}`);
    if (cap.error) console.log(`   Error: ${cap.error}`);
  });

  console.log('\n📁 Capturas guardadas en test-results/\n');
  console.log('🔍 Archivos generados:');
  console.log('   • visual-roles-page.png - Vista de roles con botón Volver');
  console.log('   • visual-dialog-role-normal.png - Diálogo tamaño normal');
  console.log('   • visual-dialog-role-maximized.png - Diálogo maximizado');
  console.log('   • visual-smtp-inicial.png - Página SMTP con botón Volver');
  console.log('   • visual-smtp-gmail-config.png - Config Gmail activada\n');

  fs.writeFileSync('test-results/visual-report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    captures: captures
  }, null, 2));
}

if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

testVisual().catch(console.error);
