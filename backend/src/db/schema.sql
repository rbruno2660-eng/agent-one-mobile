-- =====================================================
-- AGENT ONE — Schema PostgreSQL v1.0
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  niche       TEXT NOT NULL DEFAULT 'mobile_store',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  password     TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('owner','admin','manager','seller','service','viewer')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AGENTS (configuração do agente IA por tenant)
-- ─────────────────────────────────────────────
CREATE TABLE agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Agent One',
  persona         TEXT,
  tone            TEXT NOT NULL DEFAULT 'professional',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  prompt_version  INTEGER NOT NULL DEFAULT 1,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- ─────────────────────────────────────────────
-- CHANNELS (WhatsApp por tenant)
-- ─────────────────────────────────────────────
CREATE TABLE channels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL DEFAULT 'whatsapp',
  phone_id     TEXT,
  phone_number TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','error','disconnected')),
  settings     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  name        TEXT,
  email       TEXT,
  notes       TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- ─────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES contacts(id),
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','ai_active','qualifying','offering','trade_evaluation',
    'payment_pending','human_requested','human_active','follow_up','closed'
  )),
  source           TEXT NOT NULL DEFAULT 'whatsapp',
  assigned_user_id UUID REFERENCES users(id),
  lead_score       INTEGER NOT NULL DEFAULT 0,
  metadata         JSONB NOT NULL DEFAULT '{}',
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL,
  direction        TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  type             TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','audio','document','template')),
  content          TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  provider_id      TEXT,                        -- ID do Meta; garante idempotência
  status           TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','sent','delivered','read','failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id)
);

-- ─────────────────────────────────────────────
-- PRODUTOS
-- ─────────────────────────────────────────────
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'iphone' CHECK (category IN ('iphone','accessory','service')),
  brand       TEXT NOT NULL DEFAULT 'Apple',
  model       TEXT NOT NULL,
  variant     TEXT,                             -- Pro, Pro Max, Plus, normal
  storage     TEXT,                             -- 128GB, 256GB etc.
  color       TEXT,
  condition   TEXT NOT NULL CHECK (condition IN ('new','used')),
  battery_health INTEGER,                       -- % para seminovos
  warranty    TEXT,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ESTOQUE
-- ─────────────────────────────────────────────
CREATE TABLE inventory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved    INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)
);

-- ─────────────────────────────────────────────
-- PREÇOS
-- ─────────────────────────────────────────────
CREATE TABLE price_books (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'default',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_prices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_book_id UUID NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  table_price   NUMERIC(12,2) NOT NULL,         -- preço de referência
  current_price NUMERIC(12,2) NOT NULL,         -- preço que o agente informa
  min_price     NUMERIC(12,2) NOT NULL,         -- piso de negociação
  pix_price     NUMERIC(12,2),                  -- preço especial Pix
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, price_book_id),
  CONSTRAINT min_price_check CHECK (min_price <= current_price)
);

CREATE TABLE installments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_price_id  UUID NOT NULL REFERENCES product_prices(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  installments      INTEGER NOT NULL CHECK (installments > 0),
  installment_value NUMERIC(12,2) NOT NULL,
  total             NUMERIC(12,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TROCA / PARTE DE PAGAMENTO
-- ─────────────────────────────────────────────
CREATE TABLE trade_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model       TEXT NOT NULL,
  storage     TEXT,
  condition   TEXT,
  base_value  NUMERIC(12,2) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_deduction_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('battery','screen','back','body','camera','faceid','other')),
  condition   TEXT NOT NULL,                    -- ex: "below_80", "cracked", "replaced"
  label       TEXT NOT NULL,                    -- ex: "Bateria abaixo de 80%"
  amount      NUMERIC(12,2) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_evaluations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  device_model TEXT NOT NULL,
  device_storage TEXT,
  battery_health INTEGER,
  screen_condition TEXT,
  back_condition TEXT,
  body_condition TEXT,
  other_notes  TEXT,
  base_value   NUMERIC(12,2),
  total_deductions NUMERIC(12,2) DEFAULT 0,
  estimate     NUMERIC(12,2),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  reviewed_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_deductions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id   UUID NOT NULL REFERENCES trade_evaluations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  label           TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- MANUTENÇÃO E SERVIÇOS
-- ─────────────────────────────────────────────
CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  compatible_with TEXT[],                       -- ["iPhone 13", "iPhone 14"]
  price           NUMERIC(12,2) NOT NULL,
  min_price       NUMERIC(12,2) NOT NULL,
  warranty_days   INTEGER NOT NULL DEFAULT 90,
  turnaround_days INTEGER NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  conversation_id UUID REFERENCES conversations(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','in_progress','done','cancelled')),
  quoted_price    NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  product_id      UUID REFERENCES products(id),
  stage           TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','qualifying','interested','negotiating','won','lost')),
  source          TEXT,
  score           INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PEDIDOS
-- ─────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  subtotal        NUMERIC(12,2) NOT NULL,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- KNOWLEDGE BASE
-- ─────────────────────────────────────────────
CREATE TABLE knowledge_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('faq','policy','operational','commercial','brand')),
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  version     INTEGER NOT NULL DEFAULT 1,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- HANDOFFS
-- ─────────────────────────────────────────────
CREATE TABLE handoffs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  tenant_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  summary         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','resolved')),
  assigned_to     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TOOL CALLS (log de chamadas do agente)
-- ─────────────────────────────────────────────
CREATE TABLE tool_calls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  tenant_id       UUID NOT NULL,
  tool            TEXT NOT NULL,
  input           JSONB,
  output          JSONB,
  status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error')),
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL,
  actor_id    UUID REFERENCES users(id),
  actor_email TEXT,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  before      JSONB,
  after       JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS (billing)
-- ─────────────────────────────────────────────
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'starter',
  status        TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','cancelled')),
  trial_ends_at TIMESTAMPTZ,
  renewal_date  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone);
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_tenant_contact ON conversations(tenant_id, contact_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_provider_id ON messages(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_products_tenant ON products(tenant_id, active);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id, stage);
CREATE INDEX idx_tool_calls_conversation ON tool_calls(conversation_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────
-- UPDATED_AT automático
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_trade_evaluations_updated BEFORE UPDATE ON trade_evaluations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
