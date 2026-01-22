/**
 * E2E Tests for API Endpoints
 */
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

test.describe('Health Endpoints', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(['healthy', 'degraded']).toContain(data.status);
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBeDefined();
  });

  test('should return ready status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ready`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ready');
    expect(data.database).toBeDefined();
  });

  test('should return live status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/live`);
    expect(response.ok()).toBeTruthy();

    const text = await response.text();
    expect(text).toBe('OK');
  });

  test('should return metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE}/metrics`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.timestamp).toBeDefined();
    expect(data.process).toBeDefined();
    expect(data.memory).toBeDefined();
    expect(data.cpu).toBeDefined();
  });
});

test.describe('Auth Endpoints', () => {
  test('should register anonymous user', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/anonymous`, {
      data: {
        name: `TestUser_${Date.now()}`,
        avatar: '🎮',
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user.name).toContain('TestUser_');
  });

  test('should reject registration without name', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/anonymous`, {
      data: {
        avatar: '🎮',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });
});

test.describe('Rate Limiting', () => {
  test('should allow normal request rate', async ({ request }) => {
    // Make a few requests - should all succeed
    for (let i = 0; i < 5; i++) {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.ok()).toBeTruthy();
    }
  });
});
