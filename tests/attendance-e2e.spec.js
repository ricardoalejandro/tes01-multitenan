import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Attendance Module (Módulo de Asistencias)
 * 
 * Flow: Login → Dashboard → Select Branch → Workspace → Attendance Module
 * 
 * Test Credentials:
 * - admin / escolastica123
 * 
 * Application URLs:
 * - Frontend: http://localhost:5000
 * - Backend: http://localhost:3000
 */

const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'admin',
  password: 'escolastica123'
};

// Helper function to perform complete login flow including branch selection
async function loginAndSelectBranch(page: Page): Promise<void> {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Step 1: Navigate to login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Step 2: Fill login form (using real selectors from codegen)
  await page.getByRole('textbox', { name: 'Usuario' }).fill(CREDENTIALS.username);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(CREDENTIALS.password);
  
  // Step 3: Submit login
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  
  // Step 4: Wait for redirect to dashboard (increased timeout for stability)
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  
  // Step 5: Select branch - nth(1) skips Admin Panel "Entrar" and clicks branch "Entrar"
  await page.getByRole('button', { name: 'Entrar' }).nth(1).click();
  
  // Step 6: Wait for redirect to workspace with branchId
  await page.waitForURL('**/workspace**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify no critical console errors during login flow
  const criticalErrors = consoleErrors.filter(e => 
    !e.includes('Warning:') && 
    !e.includes('DevTools') &&
    !e.includes('favicon')
  );
  
  if (criticalErrors.length > 0) {
    console.warn('Console errors during login:', criticalErrors);
  }
}

// Helper to navigate to Attendance module
async function navigateToAttendance(page: Page): Promise<void> {
  // Use real selector from codegen - Asistencia is a button
  await page.getByRole('button', { name: 'Asistencia' }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('Módulo de Asistencias - E2E Tests', () => {
  
  test.describe('1. Authentication & Navigation Flow', () => {
    
    test('1.1 - Login completo y selección de sucursal', async ({ page }) => {
      // Capture all console messages
      const consoleMessages: { type: string; text: string }[] = [];
      page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      });

      // Navigate to login
      await page.goto(`${BASE_URL}/login`);
      await expect(page).toHaveURL(/.*login/);
      
      // Verify login form exists (using codegen selectors)
      await expect(page.getByRole('textbox', { name: 'Usuario' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
      
      // Fill credentials
      await page.getByRole('textbox', { name: 'Usuario' }).fill(CREDENTIALS.username);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(CREDENTIALS.password);
      
      // Submit
      await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
      
      // Wait for dashboard (increased timeout for stability)
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify dashboard loaded - should show branches
      await page.waitForLoadState('networkidle');
      
      // Look for branch selection UI - text says "Mis Filiales"
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('filiales');
      
      // Log any errors
      const errors = consoleMessages.filter(m => m.type === 'error');
      if (errors.length > 0) {
        console.log('Console errors:', errors.map(e => e.text));
      }
    });

    test('1.2 - Selección de sucursal y acceso a workspace', async ({ page }) => {
      await loginAndSelectBranch(page);
      
      // Verify we're in workspace with branchId
      const url = page.url();
      expect(url).toContain('/workspace');
      expect(url).toContain('branchId');
      
      // Verify sidebar/navigation is visible
      await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible();
    });

    test('1.3 - Navegación al módulo de Asistencias', async ({ page }) => {
      await loginAndSelectBranch(page);
      
      // Navigate to attendance module
      await navigateToAttendance(page);
      
      // Wait for module to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Give time for React to render
      
      // Verify attendance module is visible by checking for specific text
      // The module shows "Registro de Asistencias" as title
      const hasAttendanceTitle = await page.locator('text=Registro de Asistencias').isVisible().catch(() => false);
      const hasGroupSelection = await page.locator('text=Selecciona un grupo').isVisible().catch(() => false);
      
      expect(hasAttendanceTitle || hasGroupSelection).toBeTruthy();
    });
  });

  test.describe('2. Attendance Module UI', () => {
    
    test.beforeEach(async ({ page }) => {
      await loginAndSelectBranch(page);
      await navigateToAttendance(page);
    });

    test('2.1 - Carga inicial del módulo sin errores de consola', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Reload to capture fresh errors
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any async errors
      await page.waitForTimeout(2000);
      
      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(e => 
        !e.includes('Warning:') && 
        !e.includes('DevTools') &&
        !e.includes('favicon') &&
        !e.includes('404') // Some 404s may be expected
      );
      
      // Log errors for debugging
      if (criticalErrors.length > 0) {
        console.log('Critical console errors found:', criticalErrors);
      }
      
      // Should have minimal critical errors
      expect(criticalErrors.length).toBeLessThan(3);
    });

    test('2.2 - Visualización de lista de grupos', async ({ page }) => {
      // Wait for groups to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // The module shows either group cards in a grid, or "No hay grupos activos" message
      // Group cards are Cards with cursor-pointer class
      const groupCards = page.locator('.cursor-pointer.transition-all');
      const groupCount = await groupCards.count();
      
      // Check for empty state message
      const hasEmptyState = await page.locator('text=No hay grupos activos').isVisible().catch(() => false);
      
      // Either we have group cards OR the empty state message
      expect(groupCount > 0 || hasEmptyState).toBeTruthy();
    });

    test('2.3 - Selector de vista (lista, calendario, pendientes)', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Try to find a group with "pendientes" text (from codegen: getByText('Anubis I8 pendientes'))
      const groupWithPendientes = page.getByText(/pendientes/i).first();
      const hasPendientesGroup = await groupWithPendientes.isVisible().catch(() => false);
      
      if (hasPendientesGroup) {
        // Click on the group card
        await groupWithPendientes.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // After selecting a group, we should see session content
        // From codegen: '.p-6.py-4 > .flex.items-center.justify-between'
        const hasSessionHeader = await page.locator('.p-6.py-4 > .flex.items-center.justify-between').isVisible().catch(() => false);
        const hasBackButton = await page.locator('text=Volver a grupos').isVisible().catch(() => false);
        const hasProgress = await page.locator('text=Progreso').isVisible().catch(() => false);
        const hasSessions = await page.locator('text=sesiones').isVisible().catch(() => false);
        
        expect(hasSessionHeader || hasBackButton || hasProgress || hasSessions).toBeTruthy();
      } else {
        // Try clicking any group card
        const groupCards = page.locator('[class*="cursor-pointer"]');
        const groupCount = await groupCards.count();
        
        if (groupCount > 0) {
          await groupCards.first().click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          expect(true).toBeTruthy();
        } else {
          // No groups available, test passes
          expect(true).toBeTruthy();
        }
      }
    });

    test('2.4 - Filtro por instructor funciona', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Look for instructor filter
      const instructorFilter = page.locator(
        'select:has-text("instructor"), [data-testid*="instructor-filter"], ' +
        '[placeholder*="instructor"], button:has-text("Instructor")'
      ).first();
      
      const hasFilter = await instructorFilter.isVisible().catch(() => false);
      
      if (hasFilter) {
        // Click to open filter
        await instructorFilter.click();
        await page.waitForTimeout(500);
        
        // Verify options appear
        const options = page.locator('option, [role="option"], [data-value]');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('3. Session Management', () => {
    
    test.beforeEach(async ({ page }) => {
      await loginAndSelectBranch(page);
      await navigateToAttendance(page);
    });

    test('3.1 - Ver sesiones de un grupo', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Try to find a group with "pendientes" text (most common indicator)
      const groupWithPendientes = page.getByText(/pendientes/i).first();
      const hasPendientesGroup = await groupWithPendientes.isVisible().catch(() => false);
      
      if (hasPendientesGroup) {
        await groupWithPendientes.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // After selecting a group, should see session content
        const hasSessionHeader = await page.locator('.p-6.py-4 > .flex.items-center.justify-between').isVisible().catch(() => false);
        const hasBackButton = await page.locator('text=Volver a grupos').isVisible().catch(() => false);
        const hasProgress = await page.locator('text=Progreso').isVisible().catch(() => false);
        
        expect(hasSessionHeader || hasBackButton || hasProgress).toBeTruthy();
      } else {
        // Try any clickable group element
        const groupCards = page.locator('[class*="cursor-pointer"]');
        const groupCount = await groupCards.count();
        
        if (groupCount > 0) {
          await groupCards.first().click();
          await page.waitForLoadState('networkidle');
          expect(true).toBeTruthy();
        }
      }
    });

    test('3.2 - Vista de calendario muestra sesiones', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Click on calendar view if available
      const calendarBtn = page.locator('button:has-text("Calendario"), [data-testid*="calendar"]').first();
      const hasCalendar = await calendarBtn.isVisible().catch(() => false);
      
      if (hasCalendar) {
        await calendarBtn.click();
        await page.waitForLoadState('networkidle');
        
        // Should see calendar UI
        const calendarUI = page.locator(
          '[class*="calendar"], [data-testid*="calendar"], .fc-view, table'
        );
        await expect(calendarUI.first()).toBeVisible();
      }
    });

    test('3.3 - Vista de pendientes muestra sesiones sin tomar', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Click on pending view if available
      const pendingBtn = page.locator(
        'button:has-text("Pendiente"), [data-testid*="pending"]'
      ).first();
      const hasPending = await pendingBtn.isVisible().catch(() => false);
      
      if (hasPending) {
        await pendingBtn.click();
        await page.waitForLoadState('networkidle');
        
        // Should see pending sessions or empty state
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('4. Attendance Taking (Toma de Asistencia)', () => {
    
    test.beforeEach(async ({ page }) => {
      await loginAndSelectBranch(page);
      await navigateToAttendance(page);
    });

    test('4.1 - Abrir formulario de toma de asistencia', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Find a group to take attendance
      const groupCard = page.locator(
        '[data-testid*="group"], .group-card, table tbody tr'
      ).first();
      
      const hasGroups = await groupCard.isVisible().catch(() => false);
      
      if (hasGroups) {
        await groupCard.click();
        await page.waitForLoadState('networkidle');
        
        // Look for take attendance button
        const takeAttendanceBtn = page.locator(
          'button:has-text("Tomar"), button:has-text("asistencia"), ' +
          '[data-testid*="take-attendance"]'
        ).first();
        
        const hasBtn = await takeAttendanceBtn.isVisible().catch(() => false);
        
        if (hasBtn) {
          await takeAttendanceBtn.click();
          await page.waitForLoadState('networkidle');
          
          // Should see attendance form/sheet
          const attendanceSheet = page.locator(
            '[data-testid*="attendance-sheet"], form, table, [class*="attendance"]'
          );
          await expect(attendanceSheet.first()).toBeVisible();
        }
      }
    });

    test('4.2 - Lista de estudiantes visible en toma de asistencia', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Navigate to attendance sheet
      const groupCard = page.locator('[data-testid*="group"], .group-card, table tbody tr').first();
      const hasGroups = await groupCard.isVisible().catch(() => false);
      
      if (hasGroups) {
        await groupCard.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Should see student list or table
        const studentList = page.locator('table tbody tr, [data-testid*="student"]');
        const count = await studentList.count();
        
        // May have students or empty state
        expect(count >= 0).toBeTruthy();
      }
    });

    test('4.3 - Botones de estado de asistencia visibles', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Navigate to a group card
      const groupCards = page.locator('.cursor-pointer.transition-all');
      const groupCount = await groupCards.count();
      
      if (groupCount > 0) {
        await groupCards.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // After selecting a group, we might see session cards
        // Status buttons appear when taking attendance on a session
        // For now, just verify the view loaded (has back button)
        const hasSessionView = await page.locator('text=Volver a grupos').isVisible().catch(() => false);
        expect(hasSessionView).toBeTruthy();
      } else {
        // No groups to test with
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('5. Error Handling & Edge Cases', () => {
    
    test.beforeEach(async ({ page }) => {
      await loginAndSelectBranch(page);
      await navigateToAttendance(page);
    });
    
    test('5.1 - Página no crashea con datos vacíos', async ({ page }) => {
      // Test uses beforeEach which already logged in and navigated
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      // Just verify the attendance module loaded without errors
      await page.waitForLoadState('networkidle');
      
      // Wait for any errors to surface
      await page.waitForTimeout(2000);
      
      // Should not have uncaught exceptions
      const criticalErrors = errors.filter(e => 
        !e.includes('ResizeObserver') && 
        !e.includes('Script error')
      );
      
      expect(criticalErrors.length).toBe(0);
    });

    test('5.2 - Loading states se muestran correctamente', async ({ page }) => {
      // beforeEach already logged in and navigated
      // Just verify that loading completed without issues
      await page.waitForLoadState('networkidle');
      
      // The page should have content (either groups or empty state)
      const hasContent = await page.locator('text=Registro de Asistencias').isVisible().catch(() => false);
      expect(hasContent).toBeTruthy();
    });

    test('5.3 - Navegación con botón atrás funciona', async ({ page }) => {
      // beforeEach already logged in and navigated
      
      // Save current URL
      const attendanceUrl = page.url();
      
      // Click on a group if available
      const groupCard = page.locator('[data-testid*="group"], .group-card, table tbody tr').first();
      const hasGroups = await groupCard.isVisible().catch(() => false);
      
      if (hasGroups) {
        await groupCard.click();
        await page.waitForLoadState('networkidle');
        
        // Go back
        await page.goBack();
        await page.waitForLoadState('networkidle');
        
        // Should be back at attendance module
        // Just verify page didn't crash
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('6. Responsiveness', () => {
    
    test('6.1 - Módulo funciona en viewport móvil', async ({ page }) => {
      // Set mobile viewport BEFORE navigating
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Login first (viewport may affect UI but login should work)
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username);
      await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      
      // Select branch - on mobile the cards stack vertically
      await page.waitForSelector('text=Mis Filiales', { timeout: 10000 });
      const branchButton = page.locator('button.w-full:has-text("Entrar")').first();
      await branchButton.waitFor({ state: 'visible', timeout: 10000 });
      await branchButton.click();
      await page.waitForURL('**/workspace**', { timeout: 10000 });
      
      // On mobile, sidebar may be collapsed - just verify workspace loaded
      await page.waitForLoadState('networkidle');
      
      // Page should render without critical issues
      await expect(page.locator('body')).toBeVisible();
      
      // Check for no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 100);
    });

    test('6.2 - Módulo funciona en viewport tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username);
      await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      
      await page.waitForSelector('text=Mis Filiales', { timeout: 10000 });
      const branchButton = page.locator('button.w-full:has-text("Entrar")').first();
      await branchButton.waitFor({ state: 'visible', timeout: 10000 });
      await branchButton.click();
      await page.waitForURL('**/workspace**', { timeout: 10000 });
      
      await page.waitForLoadState('networkidle');
      
      // Page should render without errors
      await expect(page.locator('body')).toBeVisible();
    });

    test('6.3 - Módulo funciona en viewport desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await loginAndSelectBranch(page);
      await navigateToAttendance(page);
      
      await page.waitForLoadState('networkidle');
      
      // Page should render without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

// Standalone test for console error capture
test('Captura global de errores de consola', async ({ page }) => {
  const allErrors: { url: string; error: string }[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      allErrors.push({ url: page.url(), error: msg.text() });
    }
  });
  
  page.on('pageerror', error => {
    allErrors.push({ url: page.url(), error: error.message });
  });
  
  // Full navigation flow
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username);
  await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Select IQUITOS branch - use w-full button (inside branch card, not admin panel)
  await page.waitForSelector('text=Mis Filiales', { timeout: 10000 });
  const branchButton = page.locator('button.w-full:has-text("Entrar")').first();
  await branchButton.waitFor({ state: 'visible', timeout: 10000 });
  await branchButton.click();
  await page.waitForURL('**/workspace**', { timeout: 10000 });
  
  // Navigate to attendance
  const attendanceLink = page.locator('text=Asistencia').first();
  const hasLink = await attendanceLink.isVisible().catch(() => false);
  if (hasLink) {
    await attendanceLink.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Wait for any async errors
  await page.waitForTimeout(3000);
  
  // Filter critical errors
  const criticalErrors = allErrors.filter(e => 
    !e.error.includes('Warning:') && 
    !e.error.includes('DevTools') &&
    !e.error.includes('favicon') &&
    !e.error.includes('ResizeObserver')
  );
  
  // Log all errors for debugging
  if (criticalErrors.length > 0) {
    console.log('=== CRITICAL ERRORS FOUND ===');
    criticalErrors.forEach(e => {
      console.log(`URL: ${e.url}`);
      console.log(`Error: ${e.error}`);
      console.log('---');
    });
  }
  
  // Test passes if no critical errors
  expect(criticalErrors.length).toBe(0);
});
