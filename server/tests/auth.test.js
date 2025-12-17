import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './setup.js';

describe('Auth API', () => {
  let app;

  beforeEach(() => {
    const testEnv = createTestApp();
    app = testEnv.app;
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'TestPlayer', avatar: '🏃' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('TestPlayer');
      expect(res.body.user.avatar).toBe('🏃');
      expect(res.body.token).toBeDefined();
    });

    it('should reject names shorter than 2 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('2 characters');
    });

    it('should reject empty names', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('should sanitize HTML in names', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '<script>alert("xss")</script>Player' });

      expect(res.status).toBe(201);
      expect(res.body.user.name).not.toContain('<script>');
    });

    it('should use default avatar if not provided', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'TestPlayer' });

      expect(res.status).toBe(201);
      expect(res.body.user.avatar).toBe('😀');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should re-authenticate with valid token', async () => {
      // First register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'TestPlayer' });

      const token = registerRes.body.token;

      // Then login with token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ token });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.name).toBe('TestPlayer');
      expect(loginRes.body.token).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('should reject missing token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'TestPlayer' });

      const token = registerRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.name).toBe('TestPlayer');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'TestPlayer' });

      const token = registerRes.body.token;

      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'NewName', avatar: '🦊' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user.name).toBe('NewName');
      expect(updateRes.body.user.avatar).toBe('🦊');
    });
  });
});
