import { test, expect } from '@playwright/test';

/**
 * Smoke tests for Pulse frontend.
 * These tests verify that the key pages load correctly without a running backend.
 * They mock the API responses to avoid external dependencies.
 */

test.describe('Login page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Pulse' })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    // Use the form submit button specifically (not the tab toggle button)
    await expect(page.locator('form').getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows register form when switching tabs', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByPlaceholder('Jane Doe')).toBeVisible();
    await expect(page.getByPlaceholder('My Company')).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('shows error on failed login', async ({ page }) => {
    // Mock the API to return an error
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 401, json: { error: 'Invalid credentials' } });
    });

    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    // Click the submit button in the form (not the tab toggle)
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});

test.describe('Dashboard redirect', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects root to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Dashboard with mocked auth', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a valid-looking JWT for an admin user
    const payload = {
      id: 'user-1',
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

    // Mock all API calls that the dashboard makes
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/admin/projects')) {
        await route.fulfill({ json: [] });
      } else if (url.includes('/api/timer/current')) {
        await route.fulfill({ status: 200, json: null });
      } else if (url.includes('/api/reports/live-monitor')) {
        await route.fulfill({ json: { snapshot_at: new Date().toISOString(), active_timers: [] } });
      } else if (url.includes('/api/reports/compliance')) {
        await route.fulfill({ json: [] });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.addInitScript((token) => {
      localStorage.setItem('pulse_token', token);
    }, fakeToken);
  });

  test('admin dashboard loads with nav items', async ({ page }) => {
    await page.goto('/dashboard');
    // The sidebar nav contains admin nav links — check by nav element
    const sidebar = page.locator('nav');
    await expect(sidebar.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Clients' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).toBeVisible();
  });

  test('users page renders', async ({ page }) => {
    await page.route('**/api/admin/users', async (route) => {
      await route.fulfill({
        json: [
          { id: 'u1', email: 'va@example.com', full_name: 'Test VA', role: 'va', is_active: true },
        ],
      });
    });

    await page.goto('/dashboard/admin/users');
    await expect(page.locator('h1')).toContainText('Users');
    await expect(page.getByRole('button', { name: '+ Create User' })).toBeVisible();
    await expect(page.getByText('Test VA')).toBeVisible();
  });

  test('live monitor page renders', async ({ page }) => {
    await page.goto('/dashboard/manager/monitor');
    await expect(page.getByRole('heading', { name: 'Live Monitor' })).toBeVisible();
    await expect(page.getByText('Active VAs')).toBeVisible();
  });
});

test.describe('VA dashboard with mocked auth', () => {
  test.beforeEach(async ({ page }) => {
    const payload = {
      id: 'va-1',
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
      if (url.includes('/api/admin/projects')) {
        await route.fulfill({ json: [] });
      } else if (url.includes('/api/timer/current')) {
        await route.fulfill({ status: 200, json: null });
      } else if (url.includes('/api/checkins/pending')) {
        await route.fulfill({ json: [] });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.addInitScript((token) => {
      localStorage.setItem('pulse_token', token);
    }, fakeToken);
  });

  test('VA timer page shows start timer UI', async ({ page }) => {
    await page.goto('/dashboard/va/timer');
    await expect(page.locator('h1')).toContainText('Timer');
    await expect(page.getByText('No active timer')).toBeVisible();
    await expect(page.getByRole('button', { name: '▶ Start Timer' })).toBeVisible();
  });

  test('VA tasks page renders', async ({ page }) => {
    await page.goto('/dashboard/va/tasks');
    // Check the heading specifically, not the nav link
    await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible();
  });
});
