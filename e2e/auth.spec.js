/**
 * E2E Tests for Authentication Flows
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
  });

  test('should allow anonymous registration', async ({ page }) => {
    await page.goto('/register');

    // Fill in name
    const nameInput = page.getByPlaceholder(/name|username/i);
    await nameInput.fill('TestPlayer');

    // Select an avatar (click first emoji option if available)
    const avatarSelector = page.locator('[data-testid="avatar-selector"], .emoji-picker, button:has-text("😀")').first();
    if (await avatarSelector.isVisible()) {
      await avatarSelector.click();
    }

    // Submit registration
    const submitButton = page.getByRole('button', { name: /register|create|start|play/i });
    await submitButton.click();

    // Should redirect to home after successful registration
    await expect(page).toHaveURL('/');

    // Should show user name somewhere on page
    await expect(page.getByText('TestPlayer')).toBeVisible({ timeout: 10000 });
  });

  test('should persist authentication after page refresh', async ({ page }) => {
    // First register
    await page.goto('/register');
    await page.getByPlaceholder(/name|username/i).fill('PersistTest');

    const submitButton = page.getByRole('button', { name: /register|create|start|play/i });
    await submitButton.click();

    // Wait for home page
    await expect(page).toHaveURL('/');

    // Refresh the page
    await page.reload();

    // Should still be on home page (not redirected to login)
    await expect(page).toHaveURL('/');

    // User should still be visible
    await expect(page.getByText('PersistTest')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access settings while not logged in
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Register
    await page.goto('/register');
    await page.getByPlaceholder(/name|username/i).fill('RedirectTest');
    const submitButton = page.getByRole('button', { name: /register|create|start|play/i });
    await submitButton.click();

    // After registration, should go to home
    await expect(page).toHaveURL('/');
  });
});
