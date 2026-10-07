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

    // Feature 1 — Follow-up automático de conversas inativas
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ`,

    // Feature 4 — Campanhas ativas
    `CREATE TABLE IF NOT EXISTS campaigns (
      id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name             TEXT NOT NULL,
      message_template TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','completed','failed')),
      scheduled_at     TIMESTAMPTZ,
      sent_count       INTEGER NOT NULL DEFAULT 0,
      failed_count     INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS campaign_contacts (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      campaign_id    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_phone  TEXT NOT NULL,
      contact_name   TEXT,
      status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
      sent_at        TIMESTAMPTZ,
      UNIQUE(campaign_id, contact_phone)
    )`,

    // Feature 5 — Fila de recompra (reactivation)
    `CREATE TABLE IF NOT EXISTS reactivation_queue (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      contact_id      UUID NOT NULL REFERENCES contacts(id),
      conversation_id UUID REFERENCES conversations(id),
      scheduled_for   TIMESTAMPTZ NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
      message         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // Feature 6 — Lead value (dashboard comercial)
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS value NUMERIC(12,2) DEFAULT 0`,

    // Feature 9 — Catálogo público (slug da loja)
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE`,
    `UPDATE tenants SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL`,

    // Feature 7 — Alerta de lead quente (controle de cooldown)
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_hot_alert_at TIMESTAMPTZ`,

    // Feature 8 — AI Execution Log (observabilidade por chamada)
    `CREATE TABLE IF NOT EXISTS ai_logs (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      intent          TEXT,
      model           TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      prompt_tokens   INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens    INTEGER NOT NULL DEFAULT 0,
      cost_usd        NUMERIC(10,6) NOT NULL DEFAULT 0,
      latency_ms      INTEGER,
      result          TEXT CHECK (result IN ('success','error','fallback')),
      error_message   TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS ai_logs_tenant_created ON ai_logs (tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ai_logs_conversation ON ai_logs (conversation_id)`,
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

    // Cron: lembretes de agendamento (a cada 1 hora — envia 24h antes)
    try {
      const cron = require('node-cron');
      const { runReminderCycle } = require('./services/appointment-reminder.service');
      cron.schedule('0 * * * *', async () => {
        try { await runReminderCycle(); }
        catch (err) { console.error('[AppointmentReminder] Erro no cron:', err.message); }
      });
      console.log('✅ Cron de lembretes de agendamento ativo (a cada hora)');
    } catch (err) {
      console.warn('⚠️  Cron de lembretes não iniciado:', err.message);
    }

    // Feature 1 — Cron: follow-up de conversas inativas (a cada 30 minutos)
    try {
      const cron = require('node-cron');
      const { runConversationFollowUpCycle } = require('./services/followup.service');
      cron.schedule('*/30 * * * *', async () => {
        try { await runConversationFollowUpCycle(); }
        catch (err) { console.error('[ConvFollowUp] Erro no cron:', err.message); }
      });
      console.log('✅ Cron de follow-up de conversas ativo (a cada 30 minutos)');
    } catch (err) {
      console.warn('⚠️  Cron de follow-up de conversas não iniciado:', err.message);
    }

    // Feature 5 — Cron: reativações de recompra (diariamente às 10h)
    try {
      const cron = require('node-cron');
      const { processReactivations } = require('./services/reactivation.service');
      cron.schedule('0 10 * * *', async () => {
        try { await processReactivations(); }
        catch (err) { console.error('[Reactivation] Erro no cron:', err.message); }
      });
      console.log('✅ Cron de reativações de recompra ativo (diariamente às 10h)');
    } catch (err) {
      console.warn('⚠️  Cron de reativações não iniciado:', err.message);
    }

    // Feature 7 — Cron: alerta de lead quente sem contato (a cada 2 horas)
    try {
      const cron = require('node-cron');
      const { runHotLeadAlertCycle } = require('./services/hot-lead-alert.service');
      cron.schedule('0 */2 * * *', async () => {
        try { await runHotLeadAlertCycle(); }
        catch (err) { console.error('[HotLeadAlert] Erro no cron:', err.message); }
      });
      console.log('✅ Cron de alerta de lead quente ativo (a cada 2 horas)');
    } catch (err) {
      console.warn('⚠️  Cron de alerta de lead quente não iniciado:', err.message);
    }
  });
});
