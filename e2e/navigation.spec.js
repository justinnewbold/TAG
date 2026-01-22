/**
 * E2E Tests for Navigation and Core UI
 */
import { test, expect } from '@playwright/test';

// Helper to register a user
async function registerUser(page, name) {
  await page.goto('/register');
  await page.getByPlaceholder(/name|username/i).fill(name);
  const submitButton = page.getByRole('button', { name: /register|create|start|play/i });
  await submitButton.click();
  await expect(page).toHaveURL('/');
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'NavTest');
  });

  test('should show navigation bar when logged in', async ({ page }) => {
    // Navigation should be visible
    const nav = page.locator('nav, [role="navigation"], .navigation');
    await expect(nav).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    // Click settings in nav or go directly
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
  });

  test('should navigate to friends page', async ({ page }) => {
    await page.goto('/friends');
    await expect(page).toHaveURL('/friends');
  });

  test('should navigate to achievements', async ({ page }) => {
    await page.goto('/achievements');
    await expect(page).toHaveURL('/achievements');
  });

  test('should navigate to leaderboards', async ({ page }) => {
    await page.goto('/leaderboards');
    await expect(page).toHaveURL('/leaderboards');
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'SettingsUser');
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');

    // Should show settings content
    await expect(page.locator('text=/settings|preferences|account/i')).toBeVisible();
  });

  test('should have toggle controls', async ({ page }) => {
    await page.goto('/settings');

    // Look for toggle/switch elements
    const toggles = page.locator('input[type="checkbox"], [role="switch"], .toggle, .switch');
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'ProfileUser');
  });

  test('should show user profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Should show the user name
    await expect(page.getByText('ProfileUser')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Not Found Page', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'NotFoundTest');

    await page.goto('/this-page-does-not-exist-12345');

    // Should show some indication of not found
    await expect(page.locator('text=/not found|404|page.*exist/i')).toBeVisible();
  });
});

test.describe('Offline Indicator', () => {
  test('should show offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'OfflineTest');

    // Simulate going offline
    await context.setOffline(true);

    // Wait a moment for the indicator to appear
    await page.waitForTimeout(1000);

    // Check for offline indicator
    const offlineIndicator = page.locator('text=/offline|no connection|disconnected/i');
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);

    // Indicator should eventually hide or show online status
    await page.waitForTimeout(2000);
  });
});
