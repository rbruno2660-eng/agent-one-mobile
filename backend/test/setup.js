/**
 * Test setup — mocks de infraestrutura para rodar sem banco real ou Redis.
 * Os testes de integração real precisam de DATABASE_URL e REDIS_URL válidos.
 * Os testes unitários usam este setup para isolar a lógica de negócio.
 */

// Pool mock — retorna rows vazias por padrão; cada teste pode sobrescrever
jest.mock('../src/db/pool', () => {
  const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return { query: mockQuery, _mockQuery: mockQuery };
});

// Redis / Bull mock
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }));
});

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
  }));
});

// Winston logger mock — silencia output nos testes
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
}));

// Audit log mock
jest.mock('../src/utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
}));
