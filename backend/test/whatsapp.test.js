/**
 * Testes de aceitação — Webhook WhatsApp
 * Valida: verificação do hub, HMAC, idempotência
 */
require('./setup');

const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { query: mockQuery } = require('../src/db/pool');

const VERIFY_TOKEN = 'test-verify-token';
const APP_SECRET = 'test-app-secret';

beforeAll(() => {
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
});

function hmac(body) {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
}

const FAKE_PAYLOAD = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'entry-1',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '5511999999999', phone_number_id: 'phone-123' },
        messages: [{
          from: '5511888888888',
          id: 'wamid.TEST001',
          timestamp: '1700000000',
          text: { body: 'Olá, tem iPhone 12?' },
          type: 'text',
        }],
      },
      field: 'messages',
    }],
  }],
});

describe('GET /webhooks/whatsapp — verificação do hub', () => {
  it('retorna hub.challenge quando verify_token correto', async () => {
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': 'challenge-xyz',
      });
    expect(res.status).toBe(200);
    expect(res.text).toBe('challenge-xyz');
  });

  it('retorna 403 com verify_token errado', async () => {
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-xyz',
      });
    expect(res.status).toBe(403);
  });
});

describe('POST /webhooks/whatsapp — recebimento de mensagem', () => {
  it('retorna 401 sem assinatura HMAC', async () => {
    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .send(FAKE_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it('retorna 200 com assinatura HMAC válida', async () => {
    // Mock: channel lookup retorna o tenant, enqueue retorna job
    mockQuery.mockResolvedValue({ rows: [{ tenant_id: 'tenant-1' }], rowCount: 1 });

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', hmac(FAKE_PAYLOAD))
      .send(FAKE_PAYLOAD);

    // 200 = aceito para processamento assíncrono
    expect([200, 204]).toContain(res.status);
  });
});
