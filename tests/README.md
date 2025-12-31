# Pruebas Automatizadas

Este directorio contiene pruebas E2E (End-to-End) usando Playwright y scripts de API.

## 📁 Estructura

```
tests/
├── README.md                              # Este archivo
├── attendance-course-selector.spec.js     # Tests del selector de curso en Asistencia
├── attendance-e2e.spec.js                 # Tests E2E del módulo de Asistencia
├── attendance-module.spec.js              # Tests del módulo de Asistencia
├── courses-creation.spec.js               # Tests de creación de cursos
├── users-roles-module.spec.js             # Tests del módulo Usuarios y Roles
├── test-attendance-full.js                # Script de API para asistencias (completo)
├── test-attendance-quick.js               # Script de API para asistencias (rápido)
└── test-users-roles-api.sh                # Script bash de API para usuarios/roles
```

## 🎭 Pruebas Playwright (E2E)

### Instalación

**Nota**: Playwright **NO** está instalado en el proyecto para evitar errores TypeScript. Los archivos `.spec.js` están escritos para ser ejecutados cuando se instale.

Para instalar Playwright:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npx playwright test

# Ejecutar un archivo específico
npx playwright test tests/users-roles-module.spec.js

# Ejecutar con navegador visible (útil para debugging)
npx playwright test --headed

# Ejecutar en modo debug paso a paso
npx playwright test --debug

# Ejecutar un test específico por nombre
npx playwright test -g "debe navegar al módulo de usuarios"
```

### Ver Reportes

```bash
# Ver reporte HTML de pruebas
npx playwright show-report

# Generar código grabando acciones en el navegador
npx playwright codegen http://localhost:5000
```

### Configuración

Los tests asumen:
- Frontend: `http://localhost:5000`
- Credenciales de login:
  - Usuario: `admin`
  - Contraseña: `escolastica123`

## 🔧 Scripts de API

### Usuarios y Roles (Bash)

```bash
# Ejecutar tests de API de usuarios y roles
./tests/test-users-roles-api.sh
```

**Funcionalidad**:
- Login con credenciales admin
- Listar roles y usuarios
- Crear rol con permisos
- Verificar permisos guardados
- Eliminar rol de prueba
- Restablecer contraseña de usuario

### Asistencias (Node.js)

```bash
# Tests completos de asistencia (incluye creación de datos)
node tests/test-attendance-full.js

# Tests rápidos de asistencia (requiere datos existentes)
node tests/test-attendance-quick.js
```

## 📝 Archivos de Planificación

- `PLAN_PRUEBAS_ASISTENCIAS.md`: Plan detallado de pruebas del módulo de asistencia

## 🧪 Cobertura de Tests

### Módulo de Usuarios y Roles
- ✅ Navegación al módulo
- ✅ Apertura de diálogos (Nuevo Usuario, Nuevo Rol)
- ✅ Selector de tipo de usuario
- ✅ Matriz de permisos con checkboxes "Ver" y "Editar"
- ✅ Edición de usuarios existentes
- ✅ Restablecer contraseña (admin)
- ✅ Maximizar diálogos
- ✅ Tecla Escape para volver

### Módulo de Asistencia
- ✅ Carga del módulo sin errores de consola
- ✅ Selector de curso visible
- ✅ Cambio de curso
- ✅ Validación de que no se envía `courseId='_all_'` al API
- ✅ Persistencia de selección de curso en localStorage
- ✅ Tecla Escape para volver a workspace

## 🐛 Debugging

### Captura de errores de consola

Los tests capturan automáticamente errores de consola del navegador:

```javascript
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
```

### Screenshots en fallos

Playwright toma screenshots automáticamente cuando un test falla. Se guardan en:
```
test-results/
├── [test-name]-[browser]-[retry]/
│   ├── test-failed-1.png
│   └── trace.zip
```

### Ver trace de ejecución

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## ⚙️ Configuración de CI/CD

Para integrar con CI/CD (GitHub Actions, GitLab CI, etc.):

```yaml
- name: Install Playwright
  run: |
    npm install -D @playwright/test
    npx playwright install --with-deps chromium

- name: Run Playwright tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 📚 Recursos

- [Documentación oficial de Playwright](https://playwright.dev/)
- [Selectores en Playwright](https://playwright.dev/docs/selectors)
- [Best practices](https://playwright.dev/docs/best-practices)
- [Debugging tests](https://playwright.dev/docs/debug)

## 🚨 Nota Importante

Los archivos `.spec.js` están en JavaScript (no TypeScript) para evitar errores de compilación en el proyecto Next.js principal. Si instalas Playwright y necesitas usar TypeScript, puedes:

1. Renombrar archivos de `.spec.js` a `.spec.ts`
2. Crear un `playwright.config.ts` con tsconfig específico para tests
3. Mantener `/tests` excluido del `tsconfig.json` del proyecto

## ✅ Estado Actual

- ❌ Playwright **NO instalado** (por diseño, para evitar dependencias innecesarias)
- ✅ Scripts de API funcionales y probados
- ✅ Tests escritos y listos para ejecutar cuando se instale Playwright
- ✅ Cobertura completa de flujos críticos
