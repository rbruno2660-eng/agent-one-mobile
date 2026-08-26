/**
 * Testes de aceitação — Auth
 * Roda com banco real (DATABASE_URL) ou com mock (padrão).
 */
require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { query: mockQuery } = require('../src/db/pool');
const bcrypt = require('bcryptjs');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID   = '22222222-2222-2222-2222-222222222222';

const fakeUser = {
  id: USER_ID,
  tenant_id: TENANT_ID,
  name: 'Test Owner',
  email: 'owner@test.com',
  password_hash: bcrypt.hashSync('Test@1234', 10),
  role: 'owner',
  active: true,
};

describe('POST /auth/login', () => {
  beforeEach(() => {
    // Primeiro query = buscar user; segundo = salvar refresh token
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 }) // SELECT user
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });         // INSERT refresh token
  });

  it('retorna 200 e tokens com credenciais válidas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'owner@test.com', password: 'Test@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('owner@test.com');
  });

  it('retorna 401 com senha errada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'owner@test.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('retorna 400 sem email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'Test@1234' });

    expect(res.status).toBe(400);
  });
});

describe('GET /auth/me', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('retorna 200 com status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
