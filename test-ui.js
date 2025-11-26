const { chromium } = require('playwright');
const fs = require('fs');

async function testUI() {
  console.log('🚀 Iniciando pruebas UI automáticas...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  
  // Capturar errores de consola
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'Console Error', text: msg.text() });
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push({ type: 'Page Error', text: error.message });
  });

  // Login automático primero
  console.log('🔐 Haciendo login automático...');
  await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#username', { timeout: 5000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'escolastica123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000); // Esperar navegación después del login
  console.log('✅ Login completado\n');

  const routes = [
    { name: 'Dashboard', url: 'http://localhost:5000/dashboard' },
    { name: 'Admin Panel', url: 'http://localhost:5000/admin' },
    { name: 'Usuarios', url: 'http://localhost:5000/admin/users' },
    { name: 'Roles', url: 'http://localhost:5000/admin/roles' },
    { name: 'SMTP', url: 'http://localhost:5000/admin/smtp' },
  ];

  for (const route of routes) {
    try {
      console.log(`📍 Probando: ${route.name}`);
      await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.screenshot({ path: `test-results/${route.name.replace(/\s/g, '-')}.png` });
      console.log(`   ✅ ${route.name} - OK\n`);
    } catch (error) {
      console.log(`   ❌ ${route.name} - ERROR`);
      errors.push({ type: 'Navigation Error', route: route.name, text: error.message });
      await page.screenshot({ path: `test-results/${route.name.replace(/\s/g, '-')}-ERROR.png` });
      console.log(`   📸 Screenshot guardado\n`);
    }
  }

  await browser.close();

  // Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    totalRoutes: routes.length,
    errors: errors,
    success: routes.length - errors.filter(e => e.type === 'Navigation Error').length
  };

  fs.writeFileSync('test-results/report.json', JSON.stringify(report, null, 2));

  console.log('\n📊 REPORTE FINAL:');
  console.log(`   ✅ Rutas exitosas: ${report.success}/${report.totalRoutes}`);
  console.log(`   ❌ Errores encontrados: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n🔍 ERRORES DETECTADOS:\n');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.type}] ${err.route || ''}`);
      console.log(`   ${err.text}\n`);
    });
  }

  console.log('\n📁 Screenshots guardados en: test-results/');
  console.log('📄 Reporte completo en: test-results/report.json\n');
}

// Crear directorio de resultados
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

testUI().catch(console.error);
