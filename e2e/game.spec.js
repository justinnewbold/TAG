/**
 * E2E Tests for Game Flows
 */
import { test, expect } from '@playwright/test';

// Helper to register a user
async function registerUser(page, name) {
  await page.goto('/register');
  await page.getByPlaceholder(/name|username/i).fill(name);
  const submitButton = page.getByRole('button', { name: /register|create|start|play/i });
  await submitButton.click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

test.describe('Game Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should create a new game', async ({ page }) => {
    // Register first
    await registerUser(page, 'GameCreator');

    // Navigate to create game
    await page.goto('/create');
    await expect(page).toHaveURL('/create');

    // Fill in game settings (look for common input patterns)
    const gameDurationInput = page.locator('input[type="number"], input[name*="duration"], [data-testid="duration"]').first();
    if (await gameDurationInput.isVisible()) {
      await gameDurationInput.fill('30');
    }

    // Submit game creation
    const createButton = page.getByRole('button', { name: /create|start|begin/i });
    await createButton.click();

    // Should redirect to lobby
    await expect(page).toHaveURL('/lobby', { timeout: 10000 });

    // Should show game code
    const gameCode = page.locator('[data-testid="game-code"], .game-code, text=/[A-Z0-9]{6}/');
    await expect(gameCode).toBeVisible({ timeout: 5000 });
  });

  test('should show game settings options', async ({ page }) => {
    await registerUser(page, 'SettingsTest');
    await page.goto('/create');

    // Check that various game settings are available
    await expect(page.locator('text=/duration|time|minutes/i')).toBeVisible();
  });
});

test.describe('Game Join', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should navigate to join page', async ({ page }) => {
    await registerUser(page, 'JoinNavigator');
    await page.goto('/join');
    await expect(page).toHaveURL('/join');
  });

  test('should show error for invalid game code', async ({ page }) => {
    await registerUser(page, 'InvalidCodeTest');
    await page.goto('/join');

    // Enter invalid code
    const codeInput = page.getByPlaceholder(/code|game/i);
    await codeInput.fill('XXXXXX');

    // Try to join
    const joinButton = page.getByRole('button', { name: /join/i });
    await joinButton.click();

    // Should show error message
    await expect(page.locator('text=/not found|invalid|error/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Game Lobby', () => {
  test('should redirect to home if no active game', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'LobbyTest');

    // Try to access lobby directly without a game
    await page.goto('/lobby');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Active Game', () => {
  test('should redirect to home if no active game', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await registerUser(page, 'ActiveGameTest');

    // Try to access game directly without active game
    await page.goto('/game');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Game History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show game history page', async ({ page }) => {
    await registerUser(page, 'HistoryViewer');
    await page.goto('/history');

    await expect(page).toHaveURL('/history');
    // Page should load without errors
    await expect(page.locator('text=/history|games|past|no games/i')).toBeVisible({ timeout: 5000 });
  });
});
