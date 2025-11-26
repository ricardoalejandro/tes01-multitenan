const { chromium } = require('playwright');

async function testOAuth() {
  console.log('📸 Capturando nueva interfaz OAuth...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Login
    await page.goto('http://localhost:5000/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'escolastica123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // SMTP con OAuth
    await page.goto('http://localhost:5000/admin/smtp');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/OAUTH-smtp-page.png', fullPage: true });

    console.log('✅ Captura guardada: test-results/OAUTH-smtp-page.png');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
  console.log('\n✅ Test completado');
}

testOAuth().catch(console.error);
