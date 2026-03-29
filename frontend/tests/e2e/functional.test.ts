import { test, expect } from '@playwright/test';

/**
 * Functional tests for Pulse frontend features:
 * - Admin Impersonation (View As)
 * - Project Integration visibility
 */

test.describe('Admin Functional Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject admin JWT
    const payload = {
      id: 'admin-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      workspace_id: 'ws-1',
    };
    const fakeToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify(payload)),
      'fakesig',
    ].join('.');

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/admin/users')) {
        await route.fulfill({
          json: [
            { id: 'u-va', email: 'va@example.com', full_name: 'VA User', role: 'va' },
            { id: 'u-client', email: 'client@example.com', full_name: 'Client User', role: 'client' },
          ],
        });
      } else if (url.includes('/api/admin/projects')) {
        await route.fulfill({
          json: [{ id: 'p-1', title: 'Example Project', status: 'active' }],
        });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.addInitScript((token) => {
      localStorage.setItem('pulse_token', token);
    }, fakeToken);
  });

  test('admin can use "View As" to impersonate a VA', async ({ page }) => {
    // This assumes the impersonation is triggered from the Users list
    await page.goto('/app/users');
    const vaRow = page.getByRole('row', { name: 'VA User' });
    const viewAsBtn = vaRow.getByRole('button', { name: /View As/i });
    
    // If the button is inside a dropdown/menu, we might need to click that first
    // Assuming for now it is a direct action button or menu item
    await expect(viewAsBtn).toBeVisible();
    
    // We mock the impersonation API call which returns a new token
    await page.route('**/api/admin/impersonate/u-va', async (route) => {
      const vaPayload = {
        id: 'u-va',
        email: 'va@example.com',
        full_name: 'VA User',
        role: 'va',
        workspace_id: 'ws-1',
        is_impersonating: true,
      };
      const vaToken = [
        btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
        btoa(JSON.stringify(vaPayload)),
        'fakesig',
      ].join('.');
      await route.fulfill({ json: { token: vaToken } });
    });

    await viewAsBtn.click();
    
    // Dashboard should reload and redirect to /va/tasks (VA context)
    // There should be a banner indicating we are impersonating
    await expect(page).toHaveURL(/\/va/);
    await expect(page.getByText(/Viewing as VA User/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Stop Impersonation/i })).toBeVisible();
  });

  test('admin can configure project integration', async ({ page }) => {
    await page.goto('/app/projects');
    await page.getByRole('link', { name: 'Example Project' }).click();
    
    // On the project detail page, should see integration settings
    await expect(page.getByRole('heading', { name: 'Integration' })).toBeVisible();
    await expect(page.getByLabel(/Source Provider/i)).toBeVisible();
    
    // Mock the available containers (e.g. Asana projects)
    await page.route('**/api/integrations/containers?provider=asana', async (route) => {
      await route.fulfill({
        json: [{ id: 'ext-c-1', name: 'Web Dev / Launch' }],
      });
    });

    // Mock saving the config
    await page.route('**/api/project-integrations', async (route) => {
      await route.fulfill({ status: 200, json: { success: true } });
    });

    // Select provider
    await page.getByLabel(/Source Provider/i).selectOption('asana');
    // Select container
    await expect(page.getByLabel(/Project Container/i)).toBeVisible();
    await page.getByLabel(/Project Container/i).selectOption('ext-c-1');
    
    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/Project updated/i)).toBeVisible();
  });
});

test.describe('VA Functional Flow', () => {
  test.beforeEach(async ({ page }) => {
    const payload = {
      id: 'u-va',
      email: 'va@example.com',
      full_name: 'VA User',
      role: 'va',
      workspace_id: 'ws-1',
    };
    const fakeToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify(payload)),
      'fakesig',
    ].join('.');

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/tasks')) {
        await route.fulfill({
          json: [{ id: 't-1', title: 'Code Integration Test', status: 'todo' }],
        });
      } else if (url.includes('/api/timer/current')) {
        await route.fulfill({ status: 200, json: null });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.addInitScript((token) => {
      localStorage.setItem('pulse_token', token);
    }, fakeToken);
  });

  test('VA can start and pause a timer', async ({ page }) => {
    await page.goto('/va/tasks');
    await page.getByRole('link', { name: 'Code Integration Test' }).click();
    
    const startBtn = page.getByRole('button', { name: /Start Timer/i });
    await expect(startBtn).toBeVisible();
    
    // Mock timer start
    await page.route('**/api/timer/start', async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: 's-1', state: 'running', task_id: 't-1' },
      });
    });

    await startBtn.click();
    await expect(page.getByText(/Running/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
    
    // Mock pause
    await page.route('**/api/timer/pause', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 's-1', state: 'paused' },
      });
    });

    await page.getByRole('button', { name: /Pause/i }).click();
    await expect(page.getByText(/Paused/i)).toBeVisible();
  });
});
