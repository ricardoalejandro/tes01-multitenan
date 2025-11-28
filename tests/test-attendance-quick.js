#!/usr/bin/env node
/**
 * =============================================================================
 * TEST RÁPIDO - MÓDULO DE ASISTENCIAS
 * =============================================================================
 * 
 * Script para probar el flujo completo del módulo de asistencias
 * sin dependencias externas (solo fetch nativo de Node)
 * 
 * Ejecutar: node tests/test-attendance-quick.js
 * 
 * =============================================================================
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const CREDENTIALS = { username: 'admin', password: 'escolastica123' };

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Estadísticas
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    log.success(name);
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    log.error(`${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// =============================================================================
// TESTS
// =============================================================================

async function runTests() {
  let token = null;
  let branchId = null;
  let groupId = null;
  let sessionId = null;
  let attendanceId = null;

  log.title('INICIANDO PRUEBAS DEL MÓDULO DE ASISTENCIAS');
  log.info(`API URL: ${API_URL}`);
  log.info(`Usuario: ${CREDENTIALS.username}`);

  // -------------------------------------------------------------------------
  log.title('1. AUTENTICACIÓN');
  // -------------------------------------------------------------------------

  await test('Login con credenciales válidas', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDENTIALS),
    });
    
    assert(response.ok, `Login falló: ${response.status}`);
    const data = await response.json();
    assert(data.token, 'No se recibió token');
    token = data.token;
  });

  await test('Obtener información del usuario', async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    assert(response.ok, `Me falló: ${response.status}`);
    const data = await response.json();
    assert(data.branches && data.branches.length > 0, 'No hay sucursales');
    branchId = data.branches[0].id;
    log.info(`Branch ID: ${branchId}`);
  });

  // -------------------------------------------------------------------------
  log.title('2. ENDPOINTS DE ASISTENCIA');
  // -------------------------------------------------------------------------

  await test('GET /attendance/groups - Lista grupos', async () => {
    const response = await fetch(`${API_URL}/attendance/groups?branchId=${branchId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    assert(response.ok, `Error: ${response.status}`);
    const data = await response.json();
    assert(data.data !== undefined, 'Respuesta no tiene data');
    
    if (data.data.length > 0) {
      groupId = data.data[0].id;
      log.info(`Grupos encontrados: ${data.data.length}`);
      log.info(`Primer grupo: ${data.data[0].name} (ID: ${groupId})`);
      
      // Verificar estructura
      const group = data.data[0];
      assert(group.hasOwnProperty('totalSessions'), 'Falta totalSessions');
      assert(group.hasOwnProperty('dictadas'), 'Falta dictadas');
      assert(group.hasOwnProperty('pendientes'), 'Falta pendientes');
      assert(group.hasOwnProperty('enrolledStudents'), 'Falta enrolledStudents');
    } else {
      log.warn('No hay grupos con sesiones');
    }
  });

  await test('GET /attendance/pending - Sesiones pendientes', async () => {
    const response = await fetch(`${API_URL}/attendance/pending?branchId=${branchId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    assert(response.ok, `Error: ${response.status}`);
    const data = await response.json();
    assert(data.data !== undefined, 'Respuesta no tiene data');
    log.info(`Sesiones pendientes: ${data.data.length}`);
    
    if (data.data.length > 0) {
      const pending = data.data[0];
      assert(pending.hasOwnProperty('sessionId'), 'Falta sessionId');
      assert(pending.hasOwnProperty('groupName'), 'Falta groupName');
      assert(pending.hasOwnProperty('daysOverdue'), 'Falta daysOverdue');
    }
  });

  await test('GET /attendance/instructors - Lista instructores', async () => {
    const response = await fetch(`${API_URL}/attendance/instructors`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    assert(response.ok, `Error: ${response.status}`);
    const data = await response.json();
    assert(data.data !== undefined, 'Respuesta no tiene data');
    log.info(`Instructores encontrados: ${data.data.length}`);
    
    if (data.data.length > 0) {
      assert(data.data[0].hasOwnProperty('id'), 'Falta id');
      assert(data.data[0].hasOwnProperty('fullName'), 'Falta fullName');
    }
  });

  if (groupId) {
    await test('GET /attendance/groups/:groupId/sessions - Sesiones del grupo', async () => {
      const response = await fetch(`${API_URL}/attendance/groups/${groupId}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data !== undefined, 'Respuesta no tiene data');
      log.info(`Sesiones encontradas: ${data.data.length}`);
      
      if (data.data.length > 0) {
        sessionId = data.data[0].id;
        log.info(`Primera sesión: #${data.data[0].sessionNumber} (ID: ${sessionId})`);
        
        const session = data.data[0];
        assert(session.hasOwnProperty('sessionNumber'), 'Falta sessionNumber');
        assert(session.hasOwnProperty('sessionDate'), 'Falta sessionDate');
        assert(session.hasOwnProperty('status'), 'Falta status');
        assert(session.hasOwnProperty('topics'), 'Falta topics');
      }
    });

    await test('GET /attendance/calendar/:groupId - Calendario', async () => {
      const now = new Date();
      const response = await fetch(
        `${API_URL}/attendance/calendar/${groupId}?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      assert(response.ok, `Error: ${response.status}`);
      const result = await response.json();
      assert(result.data !== undefined, 'Respuesta no tiene data');
      assert(result.month !== undefined, 'Respuesta no tiene month');
      assert(result.year !== undefined, 'Respuesta no tiene year');
    });
  }

  if (sessionId) {
    await test('GET /attendance/sessions/:sessionId - Detalle de sesión', async () => {
      const response = await fetch(`${API_URL}/attendance/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.session !== undefined, 'Respuesta no tiene session');
      assert(data.topics !== undefined, 'Respuesta no tiene topics');
      assert(data.session.id === sessionId, 'ID de sesión no coincide');
    });

    await test('GET /attendance/sessions/:sessionId/students - Estudiantes', async () => {
      const response = await fetch(`${API_URL}/attendance/sessions/${sessionId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data !== undefined, 'Respuesta no tiene data');
      log.info(`Estudiantes en sesión: ${data.data.length}`);
      
      if (data.data.length > 0) {
        attendanceId = data.data[0].attendanceId;
        log.info(`Attendance ID: ${attendanceId}`);
        
        const student = data.data[0];
        assert(student.hasOwnProperty('studentId'), 'Falta studentId');
        assert(student.hasOwnProperty('fullName'), 'Falta fullName');
        assert(student.hasOwnProperty('attendanceId'), 'Falta attendanceId');
        assert(student.hasOwnProperty('attendanceStatus'), 'Falta attendanceStatus');
      }
    });
  }

  if (attendanceId) {
    await test('PUT /attendance/students/:attendanceId - Actualizar asistencia', async () => {
      const response = await fetch(`${API_URL}/attendance/students/${attendanceId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'asistio' }),
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data.status === 'asistio', 'Estado no se actualizó');
    });

    await test('POST /attendance/students/:attendanceId/observations - Agregar observación', async () => {
      const response = await fetch(`${API_URL}/attendance/students/${attendanceId}/observations`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Test automatizado ' + new Date().toISOString() }),
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data.id, 'No se creó la observación');
    });

    await test('GET /attendance/students/:attendanceId/observations - Obtener observaciones', async () => {
      const response = await fetch(`${API_URL}/attendance/students/${attendanceId}/observations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data !== undefined, 'Respuesta no tiene data');
      assert(data.data.length > 0, 'No hay observaciones');
    });
  }

  if (sessionId) {
    await test('PUT /attendance/sessions/:sessionId/execution - Guardar ejecución', async () => {
      const response = await fetch(`${API_URL}/attendance/sessions/${sessionId}/execution`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          actualDate: new Date().toISOString().split('T')[0],
          actualTopic: 'Tema de prueba',
          notes: 'Notas de prueba automatizada',
        }),
      });
      
      assert(response.ok, `Error: ${response.status}`);
      const data = await response.json();
      assert(data.data.id, 'No se guardó la ejecución');
    });
  }

  // -------------------------------------------------------------------------
  log.title('3. VALIDACIONES DE ERRORES');
  // -------------------------------------------------------------------------

  await test('GET /attendance/groups sin branchId debe fallar', async () => {
    const response = await fetch(`${API_URL}/attendance/groups`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    // Puede retornar array vacío o error - ambos son válidos
    const data = await response.json();
    assert(response.status === 400 || (data.data && data.data.length === 0), 
      'Debería fallar o retornar vacío sin branchId');
  });

  await test('GET /attendance/sessions con ID inválido debe retornar 404', async () => {
    const response = await fetch(`${API_URL}/attendance/sessions/00000000-0000-0000-0000-000000000000`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    assert(response.status === 404, `Esperaba 404, recibió ${response.status}`);
  });

  await test('PUT /attendance/students con status inválido debe fallar', async () => {
    if (!attendanceId) {
      log.warn('Saltando - no hay attendanceId');
      return;
    }
    
    const response = await fetch(`${API_URL}/attendance/students/${attendanceId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'estado_invalido' }),
    });
    
    assert(response.status === 400, `Esperaba 400, recibió ${response.status}`);
  });

  // -------------------------------------------------------------------------
  log.title('RESUMEN DE PRUEBAS');
  // -------------------------------------------------------------------------

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Pasaron: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Fallaron: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);

  if (failures.length > 0) {
    console.log(`${colors.red}Detalles de fallos:${colors.reset}`);
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     ${colors.yellow}${f.error}${colors.reset}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Ejecutar
runTests().catch(err => {
  log.error(`Error fatal: ${err.message}`);
  process.exit(1);
});
