# 🧪 PLAN DE PRUEBAS EXHAUSTIVO - MÓDULO DE ASISTENCIAS

## 📋 Información General

| Campo | Valor |
|-------|-------|
| **Módulo** | Sistema de Asistencias |
| **Fecha** | 2025-11-27 |
| **Elaborado por** | QA Senior (Automatizado) |
| **Alcance** | Backend API + Frontend UI + Base de Datos |
| **Ambiente** | Docker (Backend: 3000, Frontend: 5000, PostgreSQL: 5432) |

---

## 🎯 Objetivos de Testing

1. **Validar integridad de datos** - Las tablas de asistencia están correctamente estructuradas
2. **Validar API REST completa** - Todos los 12 endpoints funcionan correctamente
3. **Validar reglas de negocio** - Estados de asistencia, sesiones dictadas, observaciones
4. **Validar integración Frontend-Backend** - Flujos E2E completos
5. **Validar UI/UX** - Componentes renderizan correctamente, interacciones funcionan
6. **Validar casos negativos** - Manejo de errores apropiado
7. **Validar casos de borde** - Datos vacíos, límites, caracteres especiales

---

## 📊 INVENTARIO DE ENDPOINTS A PROBAR

| # | Método | Endpoint | Descripción |
|---|--------|----------|-------------|
| 1 | GET | `/attendance/groups` | Listar grupos con estadísticas |
| 2 | GET | `/attendance/groups/:groupId/sessions` | Sesiones de un grupo |
| 3 | GET | `/attendance/pending` | Sesiones pendientes (alertas) |
| 4 | GET | `/attendance/sessions/:sessionId` | Detalle de sesión |
| 5 | GET | `/attendance/sessions/:sessionId/students` | Estudiantes con asistencia |
| 6 | PUT | `/attendance/students/:attendanceId` | Actualizar estado asistencia |
| 7 | POST | `/attendance/students/:attendanceId/observations` | Agregar observación |
| 8 | GET | `/attendance/students/:attendanceId/observations` | Historial observaciones |
| 9 | PUT | `/attendance/sessions/:sessionId/execution` | Registrar ejecución |
| 10 | PUT | `/attendance/sessions/:sessionId/complete` | Marcar como dictada |
| 11 | GET | `/attendance/calendar/:groupId` | Vista calendario |
| 12 | GET | `/attendance/instructors` | Lista de instructores |

---

## 🔍 CASOS DE PRUEBA

### SECCIÓN 1: AUTENTICACIÓN Y AUTORIZACIÓN

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| AUTH-01 | Login válido | POST | `/auth/login` | `{username: "admin", password: "escolastica123"}` | 200, token JWT | CRÍTICA |
| AUTH-02 | Acceso sin token | GET | `/attendance/groups` | Sin header Auth | 401 Unauthorized | CRÍTICA |
| AUTH-03 | Token inválido | GET | `/attendance/groups` | `Bearer invalid_token` | 401 Unauthorized | CRÍTICA |
| AUTH-04 | Token expirado | GET | `/attendance/groups` | Token expirado | 401 Unauthorized | ALTA |

---

### SECCIÓN 2: GRUPOS CON ESTADÍSTICAS

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| GRP-01 | Listar grupos válido | GET | `/attendance/groups?branchId={id}` | branchId válido | 200, array de grupos | CRÍTICA |
| GRP-02 | Estructura de grupo | GET | `/attendance/groups?branchId={id}` | - | Cada grupo tiene: id, name, totalSessions, dictadas, pendientes, enrolledStudents | CRÍTICA |
| GRP-03 | Sin branchId | GET | `/attendance/groups` | Sin parámetro | 400 Bad Request | ALTA |
| GRP-04 | branchId inválido (formato) | GET | `/attendance/groups?branchId=not-a-uuid` | UUID mal formado | 200 con array vacío o 400 | MEDIA |
| GRP-05 | branchId inexistente | GET | `/attendance/groups?branchId={uuid-random}` | UUID válido inexistente | 200, array vacío | MEDIA |
| GRP-06 | Conteo de sesiones correcto | GET | `/attendance/groups?branchId={id}` | - | totalSessions = dictadas + pendientes | ALTA |
| GRP-07 | Solo grupos activos | GET | `/attendance/groups?branchId={id}` | - | Solo status='active' | ALTA |

---

### SECCIÓN 3: SESIONES DE GRUPO

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| SES-01 | Listar todas las sesiones | GET | `/attendance/groups/{groupId}/sessions` | groupId válido | 200, array de sesiones | CRÍTICA |
| SES-02 | Filtrar sesiones pendientes | GET | `/attendance/groups/{groupId}/sessions?status=pendiente` | - | Solo sesiones con status='pendiente' | ALTA |
| SES-03 | Filtrar sesiones dictadas | GET | `/attendance/groups/{groupId}/sessions?status=dictada` | - | Solo sesiones con status='dictada' | ALTA |
| SES-04 | Filtrar todas | GET | `/attendance/groups/{groupId}/sessions?status=all` | - | Todas las sesiones | ALTA |
| SES-05 | Estructura de sesión | GET | `/attendance/groups/{groupId}/sessions` | - | id, sessionNumber, sessionDate, status, topics[], hasExecution | CRÍTICA |
| SES-06 | Orden por número de sesión | GET | `/attendance/groups/{groupId}/sessions` | - | Ordenadas por sessionNumber ASC | MEDIA |
| SES-07 | Grupo inexistente | GET | `/attendance/groups/{uuid-random}/sessions` | UUID inexistente | 200, array vacío | MEDIA |
| SES-08 | Temas incluidos | GET | `/attendance/groups/{groupId}/sessions` | - | topics[].courseName, topics[].instructorName presentes | ALTA |

---

### SECCIÓN 4: SESIONES PENDIENTES (ALERTAS)

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| PND-01 | Obtener pendientes | GET | `/attendance/pending?branchId={id}` | branchId válido | 200, array con pendientes | ALTA |
| PND-02 | Estructura pendiente | GET | `/attendance/pending?branchId={id}` | - | sessionId, sessionNumber, sessionDate, groupId, groupName, daysOverdue, isToday | CRÍTICA |
| PND-03 | Cálculo daysOverdue | GET | `/attendance/pending?branchId={id}` | - | daysOverdue >= 0 y correcto según fecha | ALTA |
| PND-04 | Campo isToday | GET | `/attendance/pending?branchId={id}` | - | isToday=true si daysOverdue=0 | ALTA |
| PND-05 | Sin branchId | GET | `/attendance/pending` | Sin parámetro | 400 Bad Request | ALTA |
| PND-06 | Solo sesiones pasadas/hoy | GET | `/attendance/pending?branchId={id}` | - | sessionDate <= hoy | ALTA |
| PND-07 | Orden por fecha | GET | `/attendance/pending?branchId={id}` | - | Ordenado por sessionDate ASC | MEDIA |

---

### SECCIÓN 5: DETALLE DE SESIÓN

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| DET-01 | Obtener detalle válido | GET | `/attendance/sessions/{sessionId}` | sessionId existente | 200, objeto con session, topics, execution, assistants | CRÍTICA |
| DET-02 | Sesión inexistente | GET | `/attendance/sessions/{uuid-random}` | UUID inexistente | 404 Not Found | ALTA |
| DET-03 | Estructura session | GET | `/attendance/sessions/{sessionId}` | - | id, sessionNumber, sessionDate, status, groupId, groupName, startTime, endTime | ALTA |
| DET-04 | Topics array | GET | `/attendance/sessions/{sessionId}` | - | topics[] con courseId, topicTitle, instructorName | ALTA |
| DET-05 | Execution null si no existe | GET | `/attendance/sessions/{sessionId}` | Sesión sin ejecución | execution: null | MEDIA |
| DET-06 | Execution con datos | GET | `/attendance/sessions/{sessionId}` | Sesión con ejecución | execution.actualDate, execution.notes | ALTA |
| DET-07 | Assistants array | GET | `/attendance/sessions/{sessionId}` | - | assistants[].id, assistants[].fullName | MEDIA |

---

### SECCIÓN 6: ESTUDIANTES CON ASISTENCIA

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| STD-01 | Obtener estudiantes | GET | `/attendance/sessions/{sessionId}/students` | sessionId válido | 200, array de estudiantes | CRÍTICA |
| STD-02 | Estructura estudiante | GET | `/attendance/sessions/{sessionId}/students` | - | studentId, fullName, dni, attendanceId, attendanceStatus, observations[] | CRÍTICA |
| STD-03 | Sesión inexistente | GET | `/attendance/sessions/{uuid-random}/students` | UUID inexistente | 404 Not Found | ALTA |
| STD-04 | Orden alfabético | GET | `/attendance/sessions/{sessionId}/students` | - | Ordenados por apellido, nombre | MEDIA |
| STD-05 | Creación automática attendance | GET | `/attendance/sessions/{sessionId}/students` | Primera vez | Crea registros con status='pendiente' | CRÍTICA |
| STD-06 | Solo estudiantes activos | GET | `/attendance/sessions/{sessionId}/students` | - | Solo enrollments con status='active' | ALTA |

---

### SECCIÓN 7: ACTUALIZAR ASISTENCIA

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| UPD-01 | Actualizar a 'asistio' | PUT | `/attendance/students/{id}` | `{status: "asistio"}` | 200, success: true | CRÍTICA |
| UPD-02 | Actualizar a 'no_asistio' | PUT | `/attendance/students/{id}` | `{status: "no_asistio"}` | 200, success: true | CRÍTICA |
| UPD-03 | Actualizar a 'tarde' | PUT | `/attendance/students/{id}` | `{status: "tarde"}` | 200, success: true | ALTA |
| UPD-04 | Actualizar a 'justificado' | PUT | `/attendance/students/{id}` | `{status: "justificado"}` | 200, success: true | ALTA |
| UPD-05 | Actualizar a 'permiso' | PUT | `/attendance/students/{id}` | `{status: "permiso"}` | 200, success: true | ALTA |
| UPD-06 | Status inválido | PUT | `/attendance/students/{id}` | `{status: "invalido"}` | 400 Bad Request | ALTA |
| UPD-07 | Attendance inexistente | PUT | `/attendance/students/{uuid-random}` | Status válido | 404 Not Found | ALTA |
| UPD-08 | Sin body | PUT | `/attendance/students/{id}` | Body vacío | 400 Bad Request | MEDIA |
| UPD-09 | Sesión dictada (inmutable) | PUT | `/attendance/students/{id-dictada}` | Status válido | 403 Forbidden | CRÍTICA |

---

### SECCIÓN 8: OBSERVACIONES

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| OBS-01 | Agregar observación | POST | `/attendance/students/{id}/observations` | `{content: "Texto"}` | 200, observación creada | ALTA |
| OBS-02 | Contenido vacío | POST | `/attendance/students/{id}/observations` | `{content: ""}` | 400 Bad Request | ALTA |
| OBS-03 | Sin content | POST | `/attendance/students/{id}/observations` | `{}` | 400 Bad Request | ALTA |
| OBS-04 | Attendance inexistente | POST | `/attendance/students/{uuid}/observations` | Content válido | 404 Not Found | ALTA |
| OBS-05 | Historial observaciones | GET | `/attendance/students/{id}/observations` | - | 200, array ordenado por fecha DESC | ALTA |
| OBS-06 | Historial vacío | GET | `/attendance/students/{id}/observations` | Sin observaciones | 200, array vacío | MEDIA |
| OBS-07 | Con userId | POST | `/attendance/students/{id}/observations` | `{content: "X", userId: "{uuid}"}` | Incluye userName en response | MEDIA |
| OBS-08 | Caracteres especiales | POST | `/attendance/students/{id}/observations` | `{content: "Texto con 'comillas' y \"dobles\""}` | 200, se guarda correctamente | MEDIA |
| OBS-09 | Texto muy largo | POST | `/attendance/students/{id}/observations` | Texto > 1000 chars | 200 o límite apropiado | BAJA |

---

### SECCIÓN 9: EJECUCIÓN DE SESIÓN

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| EXE-01 | Crear ejecución | PUT | `/attendance/sessions/{id}/execution` | `{actualDate: "2025-01-15"}` | 200, execution creada | ALTA |
| EXE-02 | Actualizar ejecución | PUT | `/attendance/sessions/{id}/execution` | Datos actualizados | 200, execution actualizada | ALTA |
| EXE-03 | Con instructor | PUT | `/attendance/sessions/{id}/execution` | `{actualInstructorId: "{uuid}"}` | 200, instructor guardado | ALTA |
| EXE-04 | Con notas | PUT | `/attendance/sessions/{id}/execution` | `{notes: "Notas de clase"}` | 200, notas guardadas | MEDIA |
| EXE-05 | Sesión inexistente | PUT | `/attendance/sessions/{uuid}/execution` | Datos válidos | 404 Not Found | ALTA |
| EXE-06 | Sesión dictada | PUT | `/attendance/sessions/{id-dictada}/execution` | Datos válidos | 403 Forbidden | CRÍTICA |
| EXE-07 | Sin actualDate | PUT | `/attendance/sessions/{id}/execution` | Sin fecha | 400 Bad Request | ALTA |
| EXE-08 | Fecha inválida | PUT | `/attendance/sessions/{id}/execution` | `{actualDate: "no-es-fecha"}` | 400 Bad Request | MEDIA |

---

### SECCIÓN 10: COMPLETAR SESIÓN

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| CMP-01 | Completar sesión | PUT | `/attendance/sessions/{id}/complete` | `{}` | 200, status='dictada' | CRÍTICA |
| CMP-02 | Sesión ya dictada | PUT | `/attendance/sessions/{id-dictada}/complete` | `{}` | 400 Bad Request "ya dictada" | ALTA |
| CMP-03 | Sesión inexistente | PUT | `/attendance/sessions/{uuid}/complete` | `{}` | 404 Not Found | ALTA |
| CMP-04 | Crea ejecución si no existe | PUT | `/attendance/sessions/{id}/complete` | Sin ejecución previa | Crea ejecución por defecto | ALTA |
| CMP-05 | Inmutabilidad posterior | PUT | `/attendance/students/{id}` (de sesión dictada) | Status válido | 403 Forbidden | CRÍTICA |

---

### SECCIÓN 11: CALENDARIO

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| CAL-01 | Calendario mes actual | GET | `/attendance/calendar/{groupId}` | Sin params | 200, mes/año actuales | ALTA |
| CAL-02 | Calendario específico | GET | `/attendance/calendar/{groupId}?month=6&year=2025` | Mes/año específicos | 200, data del mes | ALTA |
| CAL-03 | Estructura response | GET | `/attendance/calendar/{groupId}` | - | {data: [], month: N, year: N} | ALTA |
| CAL-04 | Grupo inexistente | GET | `/attendance/calendar/{uuid-random}` | UUID inexistente | 200, data vacío | MEDIA |
| CAL-05 | Mes inválido | GET | `/attendance/calendar/{groupId}?month=13` | Mes > 12 | Manejo apropiado | BAJA |
| CAL-06 | Solo sesiones del mes | GET | `/attendance/calendar/{groupId}?month=6&year=2025` | - | Fechas dentro del rango | ALTA |

---

### SECCIÓN 12: INSTRUCTORES

| ID | Caso | Método | Endpoint | Datos | Resultado Esperado | Severidad |
|----|------|--------|----------|-------|-------------------|-----------|
| INS-01 | Listar instructores | GET | `/attendance/instructors` | - | 200, array de instructores | ALTA |
| INS-02 | Estructura instructor | GET | `/attendance/instructors` | - | id, fullName | ALTA |
| INS-03 | Solo activos | GET | `/attendance/instructors` | - | Solo status='Activo' | ALTA |
| INS-04 | Orden alfabético | GET | `/attendance/instructors` | - | Ordenados por nombre | MEDIA |

---

## 🖥️ PRUEBAS DE FRONTEND (UI)

### SECCIÓN 13: RENDERIZADO DE COMPONENTES

| ID | Componente | Verificación | Resultado Esperado | Severidad |
|----|------------|--------------|-------------------|-----------|
| UI-01 | AttendanceModule | Carga inicial | Spinner mientras carga, luego lista de grupos | CRÍTICA |
| UI-02 | Lista de grupos | Card por grupo | Muestra nombre, sesiones, progreso | ALTA |
| UI-03 | Seleccionar grupo | Click en grupo | Muestra sesiones del grupo | CRÍTICA |
| UI-04 | Lista de sesiones | Sesiones | Número, fecha, status badge, temas | ALTA |
| UI-05 | Sesión pendiente | Badge | Badge amarillo "Pendiente" | MEDIA |
| UI-06 | Sesión dictada | Badge | Badge verde "Dictada" | MEDIA |
| UI-07 | AttendanceSheet | Abrir hoja | Muestra estudiantes, botones de estado | CRÍTICA |
| UI-08 | Botones de estado | 5 botones | Asistió, No Asistió, Tarde, Justificado, Permiso | ALTA |
| UI-09 | Observaciones | Historial | Lista de observaciones con fecha | ALTA |
| UI-10 | Toast notifications | Acciones | Confirmación en toast al guardar | ALTA |

### SECCIÓN 14: INTERACCIONES

| ID | Interacción | Acción | Resultado Esperado | Severidad |
|----|-------------|--------|-------------------|-----------|
| INT-01 | Cambiar estado asistencia | Click en botón | Estado cambia, badge actualizado | CRÍTICA |
| INT-02 | Agregar observación | Escribir + guardar | Aparece en historial | ALTA |
| INT-03 | Completar sesión | Click "Finalizar" | Sesión marcada como dictada | CRÍTICA |
| INT-04 | Volver a grupos | Click "Atrás" | Vuelve a lista de grupos | MEDIA |
| INT-05 | Cambiar vista | Tabs (Lista/Calendario/Pendientes) | Vista cambia correctamente | ALTA |
| INT-06 | Error de red | Desconectar API | Toast de error, UI no se rompe | ALTA |

---

## 🔄 PRUEBAS E2E (FLUJOS COMPLETOS)

### SECCIÓN 15: FLUJOS END-TO-END

| ID | Flujo | Pasos | Resultado Esperado | Severidad |
|----|-------|-------|-------------------|-----------|
| E2E-01 | Registro asistencia completo | 1. Login 2. Ir a Asistencias 3. Seleccionar grupo 4. Seleccionar sesión 5. Marcar asistencia a cada estudiante 6. Agregar observación 7. Completar sesión | Sesión dictada, datos persistidos | CRÍTICA |
| E2E-02 | Verificar persistencia | 1. Completar E2E-01 2. Recargar página 3. Verificar datos | Estados y observaciones persisten | CRÍTICA |
| E2E-03 | Inmutabilidad sesión dictada | 1. Completar sesión 2. Intentar modificar asistencia | No permite modificar (403) | ALTA |
| E2E-04 | Multi-usuario | 1. Usuario A marca asistencia 2. Usuario B ve cambios | Datos sincronizados | MEDIA |

---

## 🚨 CASOS NEGATIVOS Y DE BORDE

### SECCIÓN 16: CASOS NEGATIVOS

| ID | Escenario | Acción | Resultado Esperado | Severidad |
|----|-----------|--------|-------------------|-----------|
| NEG-01 | Grupo sin sesiones | Seleccionar grupo vacío | Mensaje "Sin sesiones" | MEDIA |
| NEG-02 | Grupo sin estudiantes | Seleccionar sesión sin inscripciones | Mensaje "Sin estudiantes" | MEDIA |
| NEG-03 | API caída | Cualquier acción | Toast error, UI estable | ALTA |
| NEG-04 | Timeout de red | Request lento | Loading spinner, eventual error | MEDIA |
| NEG-05 | Sesión futura | Ver sesión con fecha futura | Visible pero no aparece en pendientes | MEDIA |

### SECCIÓN 17: CASOS DE BORDE

| ID | Escenario | Datos | Resultado Esperado | Severidad |
|----|-----------|-------|-------------------|-----------|
| EDGE-01 | Nombre estudiante muy largo | 100+ caracteres | Se muestra truncado o con scroll | BAJA |
| EDGE-02 | Observación con emojis | 🎉✅❌ | Se guarda y muestra correctamente | BAJA |
| EDGE-03 | Muchos estudiantes | 50+ estudiantes | Paginación o scroll funciona | MEDIA |
| EDGE-04 | Muchas sesiones | 100+ sesiones | Paginación o scroll funciona | MEDIA |
| EDGE-05 | Caracteres especiales en observación | `<script>alert('XSS')</script>` | Escapado correctamente (no ejecuta) | ALTA |
| EDGE-06 | SQL injection intento | `'; DROP TABLE students; --` | Escapado por ORM | CRÍTICA |

---

## ✅ CRITERIOS DE ACEPTACIÓN

Para considerar el módulo APROBADO:

1. ✅ **100% de casos CRÍTICOS pasan**
2. ✅ **95% de casos ALTOS pasan**
3. ✅ **90% de casos MEDIOS pasan**
4. ✅ **Sin errores de TypeScript** (`npx tsc --noEmit` limpio)
5. ✅ **Frontend carga sin errores de consola**
6. ✅ **Flujo E2E completo funciona de inicio a fin**

---

## 📊 MATRIZ DE TRAZABILIDAD

| Requisito | Casos de Prueba |
|-----------|-----------------|
| Listar grupos con estadísticas | GRP-01 a GRP-07 |
| Ver sesiones de un grupo | SES-01 a SES-08 |
| Ver sesiones pendientes | PND-01 a PND-07 |
| Registrar asistencia | STD-01 a STD-06, UPD-01 a UPD-09 |
| Agregar observaciones | OBS-01 a OBS-09 |
| Registrar ejecución | EXE-01 a EXE-08 |
| Completar sesión | CMP-01 a CMP-05 |
| Inmutabilidad sesión dictada | UPD-09, CMP-02, CMP-05, E2E-03 |
| Vista calendario | CAL-01 a CAL-06 |
| UI responsiva | UI-01 a UI-10, INT-01 a INT-06 |

---

## 🔢 RESUMEN DE CASOS

| Severidad | Cantidad | % del Total |
|-----------|----------|-------------|
| CRÍTICA | 23 | 26% |
| ALTA | 45 | 51% |
| MEDIA | 17 | 19% |
| BAJA | 4 | 4% |
| **TOTAL** | **89** | 100% |

---

## 📝 NOTAS ADICIONALES

1. **Datos de prueba**: Usar usuario `admin` / `escolastica123`
2. **Branch de prueba**: Usar la primera sucursal disponible en `/auth/me`
3. **Limpieza**: Los tests de escritura deben ser idempotentes o revertibles
4. **Paralización**: Tests de lectura pueden correr en paralelo
5. **Dependencias**: Tests de actualización dependen de tests de lectura previos

---

**Elaborado bajo estándares de QA Senior - ISO 29119**
