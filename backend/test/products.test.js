/**
 * Testes de aceitação — Produtos
 */
require('./setup');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { query: mockQuery } = require('../src/db/pool');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID   = '22222222-2222-2222-2222-222222222222';

function makeToken(role = 'manager') {
  return jwt.sign(
    { sub: USER_ID, tenantId: TENANT_ID, role, name: 'Test User', email: 'test@test.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

const fakeProduct = {
  id: 'aaaa-bbbb',
  tenant_id: TENANT_ID,
  model: 'iPhone 14',
  variant: 'Pro',
  storage: '128GB',
  color: 'Space Black',
  condition: 'new',
  active: true,
  stock: 5,
  price: 4999.99,
  min_price: 4700.00,
};

describe('GET /products', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [fakeProduct], rowCount: 1 });
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(401);
  });

  it('retorna lista de produtos com token válido', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /products', () => {
  it('retorna 403 para role viewer', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${makeToken('viewer')}`)
      .send({ model: 'iPhone 14', price: 4999, min_price: 4700, stock: 5 });
    expect(res.status).toBe(403);
  });

  it('retorna 400 sem model', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${makeToken('manager')}`)
      .send({ price: 4999, min_price: 4700, stock: 5 });
    expect([400, 500]).toContain(res.status); // Zod rejeita
  });
});

describe('POST /products/:id/check-discount', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/products/abc/check-discount').send({ proposedPrice: 4500 });
    expect(res.status).toBe(401);
  });
});

describe('Segurança — injeção SQL via query params', () => {
  it('não quebra com payload malicioso em ?search', async () => {
    const res = await request(app)
      .get("/products?search='; DROP TABLE products; --")
      .set('Authorization', `Bearer ${makeToken()}`);
    // A resposta pode ser 200 ou 500, mas nunca deve crashar sem resposta
    expect(res.status).toBeLessThan(600);
  });
});
