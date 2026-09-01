require('dotenv').config();
const app = require('./app');
const { startWorker } = require('./queues/message.queue');
const { query } = require('./db/pool');

const PORT = process.env.PORT || 3001;

// Migrations incrementais (idempotentes) — rodam antes de aceitar conexões
async function runMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
    `ALTER TABLE trade_rules ADD COLUMN IF NOT EXISTS min_value NUMERIC(12,2)`,
    `ALTER TABLE trade_rules ADD COLUMN IF NOT EXISTS max_value NUMERIC(12,2)`,
    `CREATE TABLE IF NOT EXISTS trade_device_deductions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      model TEXT NOT NULL,
      item TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS handoffs (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id),
      tenant_id       UUID NOT NULL,
      reason          TEXT NOT NULL,
      summary         TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      assigned_to     UUID REFERENCES users(id),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS handoff_agents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ai_config (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id       UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      mode            TEXT NOT NULL DEFAULT 'always_on',
      manual_override TEXT,
      pause_until     TIMESTAMPTZ,
      offline_message TEXT NOT NULL DEFAULT 'Olá! No momento estamos fora do horário de atendimento. Em breve retornaremos! 🕐',
      timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ai_schedule_slots (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time   TIME NOT NULL,
      end_time     TIME NOT NULL,
      active       BOOLEAN NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    // Follow-up automático de leads frios
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_count INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of migrations) {
    try { await query(sql); } catch (err) { console.warn('Migration skipped:', err.message); }
  }
  console.log('✅ Migrations OK');
}

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Agent One API rodando na porta ${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/health`);

    // Inicia worker de mensagens WhatsApp
    try {
      startWorker();
    } catch (err) {
      console.warn('⚠️  Worker de mensagens não iniciado (Redis offline?):', err.message);
    }

    // Cron: follow-up automático de leads frios (a cada 2 horas)
    try {
      const cron = require('node-cron');
      const { runFollowUpCycle } = require('./services/followup.service');
      cron.schedule('0 */2 * * *', async () => {
        try { await runFollowUpCycle(); }
        catch (err) { console.error('[FollowUp] Erro no cron:', err.message); }
      });
      console.log('✅ Cron de follow-up ativo (a cada 2 horas)');
    } catch (err) {
      console.warn('⚠️  Cron de follow-up não iniciado:', err.message);
    }
  });
});
