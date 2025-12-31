const { chromium } = require('playwright');

async function captureLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/login-current-state.png', fullPage: true });
  console.log('✅ Screenshot guardado: login-current-state.png');
  
  // Ver el HTML del formulario
  const html = await page.locator('form').innerHTML();
  console.log('\n📄 HTML del formulario:\n');
  console.log(html.substring(0, 1000));
  
  await browser.close();
}

captureLogin().catch(console.error);
