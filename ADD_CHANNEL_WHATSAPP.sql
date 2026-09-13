-- ============================================================
--  Agent-One — Vincular número WhatsApp ao tenant
--  Rodar no Neon.tech (SQL Editor) após registrar o número no Meta
-- ============================================================

-- 1. Descubra o tenant_id (substitua pelo email correto se for outro)
SELECT id, name, email FROM tenants LIMIT 5;

-- 2. Insira o canal (substitua PHONE_ID e PHONE_NUMBER pelos valores reais)
--    PHONE_ID     = ID do número de telefone no Meta (ex: 123456789012345)
--    PHONE_NUMBER = número com DDI, sem símbolos (ex: 5512999999999)

INSERT INTO channels (tenant_id, provider, phone_id, phone_number, status)
VALUES (
  (SELECT id FROM tenants LIMIT 1),   -- ajuste se tiver mais de 1 tenant
  'whatsapp',
  'COLE_AQUI_O_PHONE_ID',             -- Meta Developers → WhatsApp → ID do número de telefone
  '5512991913347',                    -- número registrado
  'active'
)
ON CONFLICT DO NOTHING;

-- 3. Confirme
SELECT * FROM channels;
