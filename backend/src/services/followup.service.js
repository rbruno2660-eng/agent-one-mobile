/**
 * Serviço de follow-up automático de leads frios.
 *
 * Roda via cron a cada 2 horas. Para cada tenant, busca leads que:
 *   - Não estão em estágio 'won' ou 'lost'
 *   - Passaram 48h sem atividade (updated_at) — primeiro follow-up
 *   - Ou passaram 72h desde o último follow-up enviado
 *   - E ainda não atingiram o limite de MAX_FOLLOW_UPS
 *
 * Gera mensagem personalizada com Claude Haiku e envia via WhatsApp.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_FOLLOW_UPS = 3; // máximo de follow-ups por lead

/**
 * Ponto de entrada do cron — percorre todos os tenants com leads frios.
 */
async function runFollowUpCycle() {
  console.log('[FollowUp] Iniciando ciclo...');

  const tenantsResult = await query(`
    SELECT DISTINCT l.tenant_id
    FROM leads l
    WHERE l.stage NOT IN ('won', 'lost')
      AND l.follow_up_count < $1
      AND (
        (l.last_follow_up_at IS NULL     AND l.updated_at        < NOW() - INTERVAL '48 hours')
        OR
        (l.last_follow_up_at IS NOT NULL AND l.last_follow_up_at < NOW() - INTERVAL '72 hours')
      )
  `, [MAX_FOLLOW_UPS]);

  for (const { tenant_id } of tenantsResult.rows) {
    try {
      await processFollowUpsForTenant(tenant_id);
    } catch (err) {
      console.error(`[FollowUp] Erro no tenant ${tenant_id}:`, err.message);
    }
  }

  console.log('[FollowUp] Ciclo concluído.');
}

async function processFollowUpsForTenant(tenantId) {
  // Canal ativo do tenant (necessário para saber qual phone_id usar)
  const channelResult = await query(
    `SELECT phone_id FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
    [tenantId]
  );
  if (!channelResult.rows.length) return; // sem canal ativo, pula

  const phoneId = channelResult.rows[0].phone_id;

  // Leads frios do tenant
  const leadsResult = await query(`
    SELECT
      l.id, l.stage, l.score, l.follow_up_count, l.notes,
      l.conversation_id,
      ct.name  AS contact_name,
      ct.phone AS contact_phone,
      p.model   AS product_model,
      p.storage AS product_storage,
      p.variant AS product_variant
    FROM leads l
    JOIN contacts ct ON ct.id = l.contact_id
    LEFT JOIN products p ON p.id = l.product_id
    WHERE l.tenant_id = $1
      AND l.stage NOT IN ('won', 'lost')
      AND l.follow_up_count < $2
      AND (
        (l.last_follow_up_at IS NULL     AND l.updated_at        < NOW() - INTERVAL '48 hours')
        OR
        (l.last_follow_up_at IS NOT NULL AND l.last_follow_up_at < NOW() - INTERVAL '72 hours')
      )
    ORDER BY l.score DESC
    LIMIT 20
  `, [tenantId, MAX_FOLLOW_UPS]);

  for (const lead of leadsResult.rows) {
    try {
      await sendFollowUp(phoneId, lead);
    } catch (err) {
      console.error(`[FollowUp] Erro no lead ${lead.id}:`, err.message);
    }
  }
}

async function sendFollowUp(phoneId, lead) {
  // Contexto: últimas mensagens da conversa (se houver)
  let context = 'Sem histórico disponível.';
  if (lead.conversation_id) {
    const msgs = await query(
      `SELECT direction, content FROM messages
       WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 6`,
      [lead.conversation_id]
    );
    if (msgs.rows.length) {
      context = msgs.rows
        .reverse()
        .map(m => `${m.direction === 'inbound' ? 'Cliente' : 'Sofia'}: ${m.content}`)
        .join('\n');
    }
  }

  const productInfo = [lead.product_model, lead.product_storage, lead.product_variant]
    .filter(Boolean).join(' ') || 'aparelho de interesse';

  const followUpNumber = lead.follow_up_count + 1;

  // Gera mensagem personalizada com Claude Haiku (rápido e barato)
  const aiResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    messages: [{
      role: 'user',
      content:
        `Você é Sofia, atendente simpática de uma loja de celulares. ` +
        `Escreva uma mensagem de follow-up curta (1-2 frases) para ${lead.contact_name || 'o cliente'} ` +
        `que se interessou por "${productInfo}" mas não respondeu há mais de 48 horas. ` +
        `Estágio atual: ${lead.stage}. Este é o follow-up ${followUpNumber} de ${MAX_FOLLOW_UPS}. ` +
        `Tom: amigável, natural e NUNCA insistente. ` +
        `Se for o último follow-up, deixe uma saída elegante. ` +
        `Histórico da conversa:\n${context}\n\n` +
        `Responda APENAS com o texto da mensagem, sem aspas, sem prefixos.`,
    }],
  });

  const message = aiResponse.content[0]?.text?.trim();
  if (!message) return;

  // Envia via WhatsApp
  await whatsappService.sendText(phoneId, lead.contact_phone, message);

  // Atualiza lead (marca como contatado)
  await query(
    `UPDATE leads
     SET last_follow_up_at = NOW(),
         follow_up_count    = follow_up_count + 1,
         stage              = CASE WHEN stage = 'new' THEN 'contacted' ELSE stage END,
         updated_at         = NOW()
     WHERE id = $1`,
    [lead.id]
  );

  console.log(`[FollowUp] ✓ ${lead.contact_name} — ${productInfo} (follow-up ${followUpNumber}/${MAX_FOLLOW_UPS})`);
}

module.exports = { runFollowUpCycle };
