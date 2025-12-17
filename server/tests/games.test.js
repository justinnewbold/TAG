import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './setup.js';

describe('Games API', () => {
  let app;
  let gameManager;
  let userToken;
  let userId;

  beforeEach(async () => {
    const testEnv = createTestApp();
    app = testEnv.app;
    gameManager = testEnv.gameManager;

    // Create a test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'TestHost', avatar: '🏃' });

    userToken = res.body.token;
    userId = res.body.user.id;
  });

  describe('POST /api/games', () => {
    it('should create a new game', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { gameName: 'Test Game', tagRadius: 30 } });

      expect(res.status).toBe(201);
      expect(res.body.game).toBeDefined();
      expect(res.body.game.code).toHaveLength(6);
      expect(res.body.game.settings.gameName).toBe('Test Game');
      expect(res.body.game.settings.tagRadius).toBe(30);
      expect(res.body.game.status).toBe('waiting');
      expect(res.body.game.players).toHaveLength(1);
    });

    it('should create game with default settings', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.game.settings.tagRadius).toBe(20); // default
      expect(res.body.game.settings.maxPlayers).toBe(10); // default
    });

    it('should validate tag radius', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { tagRadius: 5000 } }); // Too large

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Tag radius');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({ settings: {} });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/games/code/:code', () => {
    it('should return game by code', async () => {
      // Create a game first
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { gameName: 'Test Game' } });

      const gameCode = createRes.body.game.code;

      const getRes = await request(app)
        .get(`/api/games/code/${gameCode}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.game.code).toBe(gameCode);
    });

    it('should return 404 for invalid code', async () => {
      const res = await request(app)
        .get('/api/games/code/XXXXXX')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should validate code format', async () => {
      const res = await request(app)
        .get('/api/games/code/invalid!')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/games/join/:code', () => {
    let gameCode;
    let secondUserToken;

    beforeEach(async () => {
      // Create a game
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { gameName: 'Test Game' } });

      gameCode = createRes.body.game.code;

      // Create a second user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'SecondPlayer' });

      secondUserToken = registerRes.body.token;
    });

    it('should allow joining a game', async () => {
      const res = await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.game.players).toHaveLength(2);
    });

    it('should return error for full game', async () => {
      // Create a game with max 2 players
      const smallGameRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { maxPlayers: 2 } });

      const smallGameCode = smallGameRes.body.game.code;

      // Second player joins
      await request(app)
        .post(`/api/games/join/${smallGameCode}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      // Create third user
      const thirdRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'ThirdPlayer' });

      // Third player tries to join
      const res = await request(app)
        .post(`/api/games/join/${smallGameCode}`)
        .set('Authorization', `Bearer ${thirdRes.body.token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('full');
    });
  });

  describe('POST /api/games/:id/start', () => {
    let gameId;
    let secondUserToken;

    beforeEach(async () => {
      // Create a game
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: {} });

      gameId = createRes.body.game.id;
      const gameCode = createRes.body.game.code;

      // Create and join second player
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'SecondPlayer' });

      secondUserToken = registerRes.body.token;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${secondUserToken}`);
    });

    it('should start game as host', async () => {
      const res = await request(app)
        .post(`/api/games/${gameId}/start`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.game.status).toBe('active');
      expect(res.body.game.itPlayerId).toBeDefined();
    });

    it('should not allow non-host to start', async () => {
      const res = await request(app)
        .post(`/api/games/${gameId}/start`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('host');
    });

    it('should require at least 2 players', async () => {
      // Create a solo game
      const soloRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      const res = await request(app)
        .post(`/api/games/${soloRes.body.game.id}/start`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('2 players');
    });
  });

  describe('POST /api/games/leave', () => {
    it('should allow leaving a game', async () => {
      // Create a game
      await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      const res = await request(app)
        .post('/api/games/leave')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return error if not in a game', async () => {
      const res = await request(app)
        .post('/api/games/leave')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });
  });
});
