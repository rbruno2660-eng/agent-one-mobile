-- Migração 004: tabela de agendamentos de visita
-- Permite que o Agent One agende visitas/serviços via WhatsApp
-- Execute no Neon: Railway → Database → SQL Editor

CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Data e hora do agendamento
  scheduled_date   DATE        NOT NULL,
  scheduled_time   TIME        NOT NULL,
  duration_minutes INTEGER     NOT NULL DEFAULT 30,

  -- Tipo de visita
  service_type TEXT NOT NULL DEFAULT 'store_visit'
    CHECK (service_type IN ('store_visit', 'repair', 'trade_in', 'other')),

  notes     TEXT,
  status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  -- Controle de lembrete (24h antes)
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por data (listagem de agenda do dia)
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date
  ON appointments(tenant_id, scheduled_date);

-- Índice para o cron de lembretes
CREATE INDEX IF NOT EXISTS idx_appointments_reminder
  ON appointments(tenant_id, status, reminder_sent, scheduled_date)
  WHERE status = 'pending' AND reminder_sent = FALSE;

-- Índice para lookup por contato
CREATE INDEX IF NOT EXISTS idx_appointments_contact
  ON appointments(tenant_id, contact_id, scheduled_date DESC);
