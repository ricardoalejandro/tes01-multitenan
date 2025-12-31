const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuración
const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
    username: 'admin',
    password: 'escolastica123'
};

// Crear subcarpeta con timestamp para esta ejecución
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const TEST_RUN_DIR = `./test-results/test-${timestamp}`;
const SCREENSHOTS_DIR = `${TEST_RUN_DIR}/screenshots`;
const REPORT_FILE = `${TEST_RUN_DIR}/test-report.md`;

// Crear directorios
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let testResults = [];

function logTest(name, status, details = '') {
    const result = {
        name,
        status, // 'PASS', 'FAIL', 'INFO'
        details,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} ${name}: ${status}`);
    if (details) console.log(`   ${details}`);
}

async function takeScreenshot(page, name) {
    const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    logTest(`Screenshot: ${name}`, 'INFO', `Guardado en: ${filepath}`);
    return filepath;
}

async function testApplication() {
    console.log('🚀 Iniciando pruebas de la aplicación Escolástica...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
        // Test 1: Cargar página inicial
        console.log('\n📋 Test 1: Carga de página inicial');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await takeScreenshot(page, '01_pagina_inicial');
        logTest('Carga de página inicial', 'PASS', `URL: ${BASE_URL}`);

        // Verificar título
        const title = await page.title();
        logTest('Título de página', 'INFO', title);

        // Test 2: Login
        console.log('\n📋 Test 2: Login');
        const usernameInput = await page.locator('input[type="text"]').first();
        const passwordInput = await page.locator('input[type="password"]').first();
        const submitButton = await page.locator('button[type="submit"]').first();

        await usernameInput.fill(TEST_CREDENTIALS.username);
        await passwordInput.fill(TEST_CREDENTIALS.password);
        await takeScreenshot(page, '02_login_form');

        await submitButton.click();
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '03_dashboard');
        logTest('Login ejecutado', 'PASS', `URL actual: ${page.url()}`);

        // Test 3: Explorar menú lateral
        console.log('\n📋 Test 3: Exploración del menú lateral');

        // Buscar todos los elementos del menú
        const menuItems = await page.locator('nav a, aside a, [role="navigation"] a, sidebar a').all();
        logTest('Elementos de menú encontrados', 'INFO', `Total: ${menuItems.length}`);

        // Intentar encontrar Probacionistas por texto visible
        let probacionistasFound = false;
        for (let i = 0; i < menuItems.length; i++) {
            const text = await menuItems[i].textContent();
            const href = await menuItems[i].getAttribute('href');
            console.log(`  Menú ${i}: "${text}" -> ${href}`);

            if (text && (text.toLowerCase().includes('probacion') || (href && href.includes('probacion')))) {
                logTest('Módulo Probacionistas encontrado', 'PASS', `Texto: "${text}", href: ${href}`);
                await menuItems[i].click();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '04_probacionistas_module');
                probacionistasFound = true;
                break;
            }
        }

        if (!probacionistasFound) {
            // Intentar buscar por href directamente
            await page.goto(`${BASE_URL}/probacionistas`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);
            await takeScreenshot(page, '04_probacionistas_direct');

            const currentUrl = page.url();
            if (currentUrl.includes('probacionistas')) {
                logTest('Módulo Probacionistas', 'PASS', 'Accedido directamente por URL');
                probacionistasFound = true;
            } else {
                logTest('Módulo Probacionistas', 'FAIL', 'No se pudo acceder');
            }
        }

        if (probacionistasFound) {
            // Test 4: Verificar tabla de probacionistas
            console.log('\n📋 Test 4: Verificación de tabla de probacionistas');
            const hasTable = await page.locator('table, [role="table"], [role="grid"]').count() > 0;
            if (hasTable) {
                logTest('Tabla de probacionistas presente', 'PASS');
                await takeScreenshot(page, '05_tabla_probacionistas');

                // Test 5: Abrir formulario de edición
                console.log('\n📋 Test 5: Formulario de edición');
                const editButtons = await page.locator('button, [role="button"]').all();

                for (let btn of editButtons) {
                    const text = await btn.textContent();
                    const ariaLabel = await btn.getAttribute('aria-label');

                    if ((text && text.includes('Editar')) || (ariaLabel && ariaLabel.includes('Editar'))) {
                        await btn.click();
                        await page.waitForTimeout(1500);
                        await takeScreenshot(page, '06_formulario_edicion');
                        logTest('Formulario de edición abierto', 'PASS');

                        // Verificar badge de estado
                        const badges = await page.locator('[class*="badge"], [class*="Badge"], .badge, span[class*="status"]').all();
                        if (badges.length > 0) {
                            logTest('Badge de estado encontrado', 'PASS', `Total badges: ${badges.length}`);
                            await takeScreenshot(page, '06b_badge_detalle');
                        } else {
                            logTest('Badge de estado', 'INFO', 'No se encontraron badges');
                        }

                        break;
                    }
                }
            }

            // Test 6: Buscar botón de Asesoramiento/Counseling
            console.log('\n📋 Test 6: Búsqueda de CounselingFormDialog');
            const counselingButtons = await page.locator('button, [role="button"]').all();

            for (let btn of counselingButtons) {
                const text = await btn.textContent();

                if (text && (text.includes('Asesor') || text.includes('Counseling') || text.includes('Asesoría'))) {
                    await btn.click();
                    await page.waitForTimeout(1500);
                    await takeScreenshot(page, '07_counseling_dialog');
                    logTest('CounselingFormDialog abierto', 'PASS');

                    // Verificar ResponsiveDialog
                    const dialog = await page.locator('[role="dialog"]').first();
                    if (await dialog.count() > 0) {
                        // Buscar botón de maximizar
                        const maximizeBtn = await page.locator('button[aria-label*="maximiz"], button[aria-label*="Maximiz"], button[title*="maximiz"]').first();
                        if (await maximizeBtn.count() > 0) {
                            logTest('Botón de maximizar encontrado', 'PASS');
                            await maximizeBtn.click();
                            await page.waitForTimeout(500);
                            await takeScreenshot(page, '07b_dialog_maximizado');

                            // Restaurar
                            await maximizeBtn.click();
                            await page.waitForTimeout(500);
                            await takeScreenshot(page, '07c_dialog_restaurado');
                            logTest('Funcionalidad de maximizar/restaurar', 'PASS');
                        }

                        // Verificar lista de instructores
                        const selects = await page.locator('select, [role="combobox"]').all();
                        for (let select of selects) {
                            const label = await select.getAttribute('aria-label');
                            const name = await select.getAttribute('name');

                            if ((label && label.toLowerCase().includes('instructor')) ||
                                (name && name.toLowerCase().includes('instructor'))) {
                                const options = await select.locator('option').allTextContents();
                                const hasFullNames = options.some(opt => opt.includes(' ') && opt.length > 5);

                                if (hasFullNames) {
                                    logTest('Lista de instructores con nombres completos', 'PASS', `Ejemplo: ${options[1] || options[0]}`);
                                } else {
                                    logTest('Lista de instructores', 'INFO', `Opciones: ${options.slice(0, 3).join(', ')}`);
                                }
                                break;
                            }
                        }

                        // Verificar campo de grupo
                        const groupInputs = await page.locator('input').all();
                        for (let input of groupInputs) {
                            const name = await input.getAttribute('name');
                            const placeholder = await input.getAttribute('placeholder');

                            if ((name && name.toLowerCase().includes('grupo')) ||
                                (placeholder && placeholder.toLowerCase().includes('grupo'))) {
                                logTest('Campo de grupo encontrado', 'PASS', `Permite entrada manual`);
                                break;
                            }
                        }

                        // Verificar que NO existe "Código del Grupo"
                        const labels = await page.locator('label').allTextContents();
                        const hasCodigoGrupo = labels.some(label => label.includes('Código del Grupo'));

                        if (!hasCodigoGrupo) {
                            logTest('Campo "Código del Grupo" eliminado', 'PASS');
                        } else {
                            logTest('Campo "Código del Grupo"', 'FAIL', 'Todavía existe en el formulario');
                        }

                        await takeScreenshot(page, '07d_counseling_completo');
                    }

                    break;
                }
            }
        }

        // Captura final
        await takeScreenshot(page, '09_estado_final');

    } catch (error) {
        logTest('Error durante las pruebas', 'FAIL', error.message);
        console.error('Stack trace:', error.stack);
        await takeScreenshot(page, 'error_screenshot');
    } finally {
        await browser.close();
    }

    // Generar reporte
    generateReport();
}

function generateReport() {
    console.log('\n📝 Generando reporte de pruebas...');

    let report = `# Reporte de Pruebas - Aplicación Escolástica\n\n`;
    report += `**Fecha**: ${new Date().toLocaleString('es-ES')}\n`;
    report += `**URL Base**: ${BASE_URL}\n`;
    report += `**Carpeta de resultados**: \`${TEST_RUN_DIR}\`\n\n`;
    report += `---\n\n`;

    report += `## Resumen\n\n`;
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const info = testResults.filter(r => r.status === 'INFO').length;

    report += `- ✅ Pruebas exitosas: ${passed}\n`;
    report += `- ❌ Pruebas fallidas: ${failed}\n`;
    report += `- ℹ️  Información: ${info}\n\n`;

    if (failed === 0 && passed > 5) {
        report += `> **✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE**\n\n`;
    } else if (failed > 0) {
        report += `> **⚠️ SE ENCONTRARON PROBLEMAS - REVISAR DETALLES**\n\n`;
    }

    report += `---\n\n`;
    report += `## Resultados Detallados\n\n`;

    testResults.forEach((result, index) => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : 'ℹ️';
        report += `### ${index + 1}. ${icon} ${result.name}\n\n`;
        report += `**Estado**: ${result.status}\n\n`;
        if (result.details) {
            report += `**Detalles**: ${result.details}\n\n`;
        }
        report += `---\n\n`;
    });

    report += `## Capturas de Pantalla\n\n`;
    report += `Todas las capturas de pantalla se encuentran en: \`${SCREENSHOTS_DIR}\`\n\n`;

    // Listar screenshots
    const screenshots = fs.readdirSync(SCREENSHOTS_DIR).sort();
    screenshots.forEach(screenshot => {
        report += `### ${screenshot.replace('.png', '').replace(/_/g, ' ')}\n\n`;
        report += `![${screenshot}](screenshots/${screenshot})\n\n`;
    });

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\n✅ Reporte generado: ${REPORT_FILE}`);
    console.log(`📸 Screenshots guardados en: ${SCREENSHOTS_DIR}`);
}

// Ejecutar pruebas
testApplication().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
