const { chromium } = require('playwright');
const fs = require('fs');

async function quickTest() {
  console.log('📸 Test rápido de mejoras visuales...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Login
    console.log('1️⃣ Login...');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 10000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    console.log('   ✅ OK\n');

    // Test Roles
    console.log('2️⃣ Página Roles (con botón Volver)...');
    await page.goto('http://localhost:5000/admin/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/FINAL-roles-page.png', fullPage: true });
    console.log('   ✅ Capturado: FINAL-roles-page.png\n');

    // Diálogo roles
    console.log('3️⃣ Diálogo de Nuevo Rol (mejorado)...');
    await page.click('button:has-text("Nuevo")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/FINAL-dialog-role.png' });
    console.log('   ✅ Capturado: FINAL-dialog-role.png\n');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test SMTP
    console.log('4️⃣ Página SMTP (con botón Volver)...');
    await page.goto('http://localhost:5000/admin/smtp', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/FINAL-smtp-page.png', fullPage: true });
    console.log('   ✅ Capturado: FINAL-smtp-page.png\n');

    // Config Gmail
    console.log('5️⃣ Configuración rápida de Gmail...');
    await page.click('button:has-text("Configurar Gmail")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/FINAL-gmail-config.png', fullPage: true });
    
    const host = await page.locator('#host').inputValue();
    const port = await page.locator('#port').inputValue();
    
    console.log('   ✅ Capturado: FINAL-gmail-config.png');
    console.log(`   📋 Host: ${host}`);
    console.log(`   📋 Puerto: ${port}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();

  console.log('=' .repeat(60));
  console.log('✅ PRUEBAS COMPLETADAS');
  console.log('='.repeat(60));
  console.log('\n📁 Capturas en test-results/:');
  console.log('   • FINAL-roles-page.png');
  console.log('   • FINAL-dialog-role.png');
  console.log('   • FINAL-smtp-page.png');
  console.log('   • FINAL-gmail-config.png\n');
}

if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

quickTest().catch(console.error);
