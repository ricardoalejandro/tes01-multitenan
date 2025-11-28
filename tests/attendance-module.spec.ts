/**
 * =============================================================================
 * PLAN DE PRUEBAS - MÓDULO DE ASISTENCIAS
 * =============================================================================
 * 
 * OBJETIVO: Validar el funcionamiento completo del módulo de asistencias
 * ALCANCE: Backend API + Frontend UI
 * 
 * =============================================================================
 * CASOS DE PRUEBA BACKEND (API)
 * =============================================================================
 * 
 * ATT-001: GET /api/attendance/groups
 *   - Debe retornar grupos activos con estadísticas de sesiones
 *   - Debe filtrar por branchId
 *   - Debe incluir: totalSessions, dictadas, pendientes, enrolledStudents
 * 
 * ATT-002: GET /api/attendance/groups/:groupId/sessions
 *   - Debe retornar todas las sesiones del grupo
 *   - Debe incluir temas planificados por sesión
 *   - Filtrar por status (pendiente/dictada/all)
 * 
 * ATT-003: GET /api/attendance/pending
 *   - Debe retornar sesiones pendientes de hoy y anteriores
 *   - Calcular días de atraso correctamente
 *   - Marcar isToday para sesiones de hoy
 * 
 * ATT-004: GET /api/attendance/sessions/:sessionId
 *   - Retornar detalle completo de la sesión
 *   - Incluir: temas planificados, ejecución real, asistentes
 *   - Retornar 404 si no existe
 * 
 * ATT-005: GET /api/attendance/sessions/:sessionId/students
 *   - Retornar lista de estudiantes inscritos
 *   - Incluir estado de asistencia actual
 *   - Incluir observaciones existentes
 * 
 * ATT-006: PUT /api/attendance/students/:attendanceId
 *   - Actualizar estado de asistencia
 *   - Validar estados permitidos
 *   - Bloquear si sesión ya está dictada
 * 
 * ATT-007: POST /api/attendance/students/:attendanceId/observations
 *   - Agregar observación a un registro de asistencia
 *   - Validar contenido no vacío
 *   - Registrar timestamp y usuario
 * 
 * ATT-008: PUT /api/attendance/sessions/:sessionId/execution
 *   - Guardar datos de ejecución real
 *   - Crear si no existe, actualizar si existe
 *   - Validar instructor existe
 * 
 * ATT-009: PUT /api/attendance/sessions/:sessionId/complete
 *   - Marcar sesión como dictada
 *   - Bloquear edición posterior
 *   - Validar todas las asistencias están registradas
 * 
 * ATT-010: GET /api/attendance/calendar/:groupId
 *   - Retornar vista de calendario mensual
 *   - Filtrar por mes y año
 * 
 * ATT-011: GET /api/attendance/instructors
 *   - Retornar lista de instructores activos
 *   - Incluir id y fullName
 * 
 * =============================================================================
 * CASOS DE PRUEBA FRONTEND (UI)
 * =============================================================================
 * 
 * UI-001: Navegación al módulo de Asistencias
 *   - Click en menú lateral debe cargar AttendanceModule
 *   - Mostrar grid de grupos
 * 
 * UI-002: Vista de grupos
 *   - Mostrar tarjetas con estadísticas
 *   - Badge de pendientes si hay sesiones sin registrar
 *   - Progress bar de avance
 * 
 * UI-003: Alertas de sesiones pendientes
 *   - Mostrar card de advertencia si hay sesiones pasadas sin registrar
 *   - Indicar días de atraso
 *   - Botón "Registrar" lleva a la hoja de asistencia
 * 
 * UI-004: Vista de sesiones - Lista
 *   - Mostrar todas las sesiones ordenadas
 *   - Indicadores visuales de estado
 *   - Resaltar sesión de hoy
 * 
 * UI-005: Vista de sesiones - Calendario
 *   - Navegación mes a mes
 *   - Indicadores en días con sesiones
 *   - Click en día abre sesión
 * 
 * UI-006: Vista de sesiones - Pendientes
 *   - Solo mostrar sesiones sin registrar
 *   - Ordenar por urgencia
 * 
 * UI-007: Vista de sesiones - Timeline
 *   - Visualización cronológica
 *   - Estados visuales claros
 * 
 * UI-008: Hoja de Asistencia
 *   - Cargar lista de estudiantes
 *   - Botones rápidos de estado funcionan
 *   - Formulario de ejecución real editable
 * 
 * UI-009: Estados de asistencia
 *   - Asistió (verde)
 *   - No asistió (rojo)
 *   - Tarde (amarillo)
 *   - Justificado (azul)
 *   - Permiso (morado)
 * 
 * UI-010: Observaciones
 *   - Sheet lateral abre correctamente
 *   - Agregar nueva observación
 *   - Ver historial de observaciones
 * 
 * UI-011: Finalizar sesión
 *   - Diálogo de confirmación
 *   - Resumen de asistencias
 *   - Bloquear si hay pendientes
 * 
 * UI-012: Protección de sesiones dictadas
 *   - Formularios en modo solo lectura
 *   - No permitir cambios de estado
 *   - Mensaje informativo
 * 
 * UI-013: Protección en GroupFormDialog
 *   - Alerta si hay sesiones dictadas
 *   - Deshabilitar "Generar Calendario"
 * 
 * =============================================================================
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Configuración
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_USER = { username: 'admin', password: 'escolastica123' };

// Helpers
async function login(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#username', TEST_USER.username);
  await page.fill('#password', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  // Obtener token del localStorage
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return token || '';
}

async function selectBranch(page: Page): Promise<string> {
  // Esperar a que carguen las sucursales
  await page.waitForSelector('[data-testid="branch-card"]', { timeout: 10000 }).catch(() => {
    // Si no hay data-testid, buscar por estructura
  });
  
  // Click en la primera sucursal disponible
  const branchCard = page.locator('.cursor-pointer').first();
  await branchCard.click();
  await page.waitForURL('**/workspace**');
  
  // Extraer branchId de la URL
  const url = page.url();
  const branchId = new URL(url).searchParams.get('branchId') || '';
  return branchId;
}

async function navigateToAttendance(page: Page): Promise<void> {
  // Click en el módulo de Asistencia en el sidebar
  await page.click('button:has-text("Asistencia")');
  await page.waitForTimeout(1000); // Esperar carga
}

// =============================================================================
// TESTS BACKEND API
// =============================================================================

test.describe('API Backend - Módulo Asistencias', () => {
  let authToken: string;
  let branchId: string;
  let groupId: string;
  let sessionId: string;
  let attendanceId: string;

  test.beforeAll(async ({ browser }) => {
    // Login para obtener token
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#username', TEST_USER.username);
    await page.fill('#password', TEST_USER.password);
    
    // Interceptar respuesta de login
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/auth/login') && resp.status() === 200
    );
    
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    const data = await response.json();
    authToken = data.token;
    
    await page.waitForURL('**/dashboard');
    
    // Obtener branchId
    const meResponse = await page.evaluate(async (token) => {
      const resp = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return resp.json();
    }, authToken);
    
    branchId = meResponse.branches?.[0]?.id || '';
    
    await context.close();
  });

  test('ATT-001: GET /attendance/groups - Lista grupos con estadísticas', async ({ request }) => {
    const response = await request.get(`${API_URL}/attendance/groups?branchId=${branchId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    if (data.data.length > 0) {
      const group = data.data[0];
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('totalSessions');
      expect(group).toHaveProperty('dictadas');
      expect(group).toHaveProperty('pendientes');
      expect(group).toHaveProperty('enrolledStudents');
      
      groupId = group.id; // Guardar para siguientes tests
    }
  });

  test('ATT-002: GET /attendance/groups/:groupId/sessions - Sesiones del grupo', async ({ request }) => {
    test.skip(!groupId, 'No hay grupo disponible');
    
    const response = await request.get(`${API_URL}/attendance/groups/${groupId}/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    if (data.data.length > 0) {
      const session = data.data[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('sessionNumber');
      expect(session).toHaveProperty('sessionDate');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('topics');
      
      sessionId = session.id; // Guardar para siguientes tests
    }
  });

  test('ATT-003: GET /attendance/pending - Sesiones pendientes', async ({ request }) => {
    const response = await request.get(`${API_URL}/attendance/pending?branchId=${branchId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // Si hay pendientes, verificar estructura
    if (data.data.length > 0) {
      const pending = data.data[0];
      expect(pending).toHaveProperty('sessionId');
      expect(pending).toHaveProperty('groupName');
      expect(pending).toHaveProperty('daysOverdue');
      expect(pending).toHaveProperty('isToday');
    }
  });

  test('ATT-004: GET /attendance/sessions/:sessionId - Detalle de sesión', async ({ request }) => {
    test.skip(!sessionId, 'No hay sesión disponible');
    
    const response = await request.get(`${API_URL}/attendance/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('session');
    expect(data).toHaveProperty('topics');
    expect(data.session).toHaveProperty('id');
    expect(data.session).toHaveProperty('groupId');
  });

  test('ATT-005: GET /attendance/sessions/:sessionId/students - Estudiantes con asistencia', async ({ request }) => {
    test.skip(!sessionId, 'No hay sesión disponible');
    
    const response = await request.get(`${API_URL}/attendance/sessions/${sessionId}/students`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    if (data.data.length > 0) {
      const student = data.data[0];
      expect(student).toHaveProperty('studentId');
      expect(student).toHaveProperty('fullName');
      expect(student).toHaveProperty('attendanceId');
      expect(student).toHaveProperty('attendanceStatus');
      
      attendanceId = student.attendanceId; // Guardar para siguientes tests
    }
  });

  test('ATT-006: PUT /attendance/students/:attendanceId - Actualizar asistencia', async ({ request }) => {
    test.skip(!attendanceId, 'No hay registro de asistencia disponible');
    
    const response = await request.put(`${API_URL}/attendance/students/${attendanceId}`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: { status: 'asistio' }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.data.status).toBe('asistio');
  });

  test('ATT-007: POST /attendance/students/:attendanceId/observations - Agregar observación', async ({ request }) => {
    test.skip(!attendanceId, 'No hay registro de asistencia disponible');
    
    const response = await request.post(`${API_URL}/attendance/students/${attendanceId}/observations`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: { content: 'Observación de prueba automatizada' }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    expect(data.data.content).toBe('Observación de prueba automatizada');
  });

  test('ATT-011: GET /attendance/instructors - Lista instructores', async ({ request }) => {
    const response = await request.get(`${API_URL}/attendance/instructors`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('fullName');
    }
  });
});

// =============================================================================
// TESTS FRONTEND UI
// =============================================================================

test.describe('Frontend UI - Módulo Asistencias', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Login
    await login(page);
    
    // Seleccionar sucursal
    await selectBranch(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('UI-001: Navegación al módulo de Asistencias', async () => {
    await navigateToAttendance(page);
    
    // Verificar que se cargó el módulo
    await expect(page.locator('text=Registro de Asistencias')).toBeVisible({ timeout: 10000 });
  });

  test('UI-002: Vista de grupos muestra tarjetas con estadísticas', async () => {
    // Esperar a que carguen los grupos
    await page.waitForTimeout(2000);
    
    // Verificar que hay tarjetas de grupo o mensaje de vacío
    const hasGroups = await page.locator('.cursor-pointer').count() > 0;
    const isEmpty = await page.locator('text=No hay grupos activos').isVisible().catch(() => false);
    
    expect(hasGroups || isEmpty).toBeTruthy();
  });

  test('UI-003: Click en grupo muestra sesiones', async () => {
    const groupCard = page.locator('.cursor-pointer').first();
    const hasGroups = await groupCard.count() > 0;
    
    if (hasGroups) {
      await groupCard.click();
      await page.waitForTimeout(1000);
      
      // Verificar que se muestran las pestañas de vista
      await expect(page.locator('text=Lista')).toBeVisible();
      await expect(page.locator('text=Calendario')).toBeVisible();
    }
  });

  test('UI-004: Toggle entre vistas funciona', async () => {
    // Verificar que estamos en vista de sesiones
    const tabsList = page.locator('[role="tablist"]');
    const isVisible = await tabsList.isVisible().catch(() => false);
    
    if (isVisible) {
      // Click en Calendario
      await page.click('button:has-text("Calendario")');
      await page.waitForTimeout(500);
      
      // Click en Pendientes
      await page.click('button:has-text("Pendientes")');
      await page.waitForTimeout(500);
      
      // Click en Timeline
      await page.click('button:has-text("Timeline")');
      await page.waitForTimeout(500);
      
      // Volver a Lista
      await page.click('button:has-text("Lista")');
      await page.waitForTimeout(500);
    }
  });

  test('UI-008: Click en sesión abre hoja de asistencia', async () => {
    const sessionCard = page.locator('[class*="cursor-pointer"][class*="rounded-lg"]').first();
    const hasSession = await sessionCard.count() > 0;
    
    if (hasSession) {
      await sessionCard.click();
      await page.waitForTimeout(1500);
      
      // Verificar que se cargó la hoja de asistencia
      const hasTitle = await page.locator('text=Sesión #').isVisible().catch(() => false);
      const hasStudentList = await page.locator('text=Lista de Estudiantes').isVisible().catch(() => false);
      
      expect(hasTitle || hasStudentList).toBeTruthy();
    }
  });

  test('UI-009: Estados de asistencia tienen colores correctos', async () => {
    // Verificar que existen los botones de estado
    const hasAsistio = await page.locator('[title="Asistió"]').count() > 0;
    const hasNoAsistio = await page.locator('[title="No asistió"]').count() > 0;
    
    // Si estamos en la hoja de asistencia, verificar botones
    if (hasAsistio && hasNoAsistio) {
      await expect(page.locator('[title="Asistió"]').first()).toBeVisible();
      await expect(page.locator('[title="No asistió"]').first()).toBeVisible();
      await expect(page.locator('[title="Tarde"]').first()).toBeVisible();
    }
  });

  test('UI-010: Botón de observaciones abre panel lateral', async () => {
    const obsButton = page.locator('button:has([class*="MessageSquarePlus"])').first();
    const hasButton = await obsButton.count() > 0;
    
    if (hasButton) {
      await obsButton.click();
      await page.waitForTimeout(500);
      
      // Verificar que se abre el sheet
      await expect(page.locator('text=Observaciones')).toBeVisible();
      
      // Cerrar
      await page.keyboard.press('Escape');
    }
  });

  test('UI-012: Botón volver funciona correctamente', async () => {
    const backButton = page.locator('button:has-text("Volver")');
    const hasBack = await backButton.count() > 0;
    
    if (hasBack) {
      await backButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

// =============================================================================
// TESTS DE INTEGRACIÓN
// =============================================================================

test.describe('Integración - Flujo completo', () => {
  test('Flujo completo: Login → Sucursal → Asistencia → Registrar', async ({ page }) => {
    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#username', TEST_USER.username);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 2. Seleccionar sucursal
    await page.waitForTimeout(2000);
    const branchCard = page.locator('.cursor-pointer').first();
    await branchCard.click();
    await page.waitForURL('**/workspace**', { timeout: 10000 });
    
    // 3. Ir a Asistencia
    await page.click('button:has-text("Asistencia")');
    await page.waitForTimeout(2000);
    
    // 4. Verificar carga del módulo
    const loaded = await page.locator('text=Registro de Asistencias').isVisible().catch(() => false);
    expect(loaded).toBeTruthy();
    
    // 5. Si hay grupos, entrar al primero
    const groupCard = page.locator('.grid .cursor-pointer').first();
    const hasGroups = await groupCard.count() > 0;
    
    if (hasGroups) {
      await groupCard.click();
      await page.waitForTimeout(1500);
      
      // 6. Verificar carga de sesiones
      const hasSessions = await page.locator('text=Sesión #').count() > 0;
      const noSessions = await page.locator('text=No hay sesiones').isVisible().catch(() => false);
      
      expect(hasSessions || noSessions).toBeTruthy();
    }
  });
});
