require('dotenv').config();
const { pool } = require('./src/db/pool');

async function run() {
  console.log('Criando tabela handoff_agents...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS handoff_agents (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        phone       TEXT NOT NULL,
        active      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_handoff_agents_tenant ON handoff_agents(tenant_id);
    `);
    console.log('Tabela handoff_agents criada com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
