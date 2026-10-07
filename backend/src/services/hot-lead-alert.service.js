/**
 * Alerta de Lead Quente — Agent One
 *
 * Roda via cron a cada 2 horas. Para cada tenant, busca leads com:
 *   - Score >= 70 (temperatura 🔥 quente)
 *   - Stage ativo (não won/lost)
 *   - Sem contato nas últimas 24h (updated_at ou last_follow_up_at)
 *   - Alerta ainda não enviado nas últimas 24h
 *
 * Envia WhatsApp para todos os atendentes ativos do tenant com o briefing do lead.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

const ALERT_COOLDOWN_HOURS = 24; // uma notificação por lead a cada 24h

/**
 * Ciclo principal — percorre tenants com leads quentes sem contato.
 */
async function runHotLeadAlertCycle() {
  console.log('[HotLeadAlert] Iniciando ciclo...');

  const tenantsResult = await query(`
    SELECT DISTINCT l.tenant_id
    FROM leads l
    WHERE l.stage NOT IN ('won', 'lost')
      AND l.score >= 70
      AND (
        l.updated_at < NOW() - INTERVAL '24 hours'
        OR (l.last_follow_up_at IS NOT NULL AND l.last_follow_up_at < NOW() - INTERVAL '24 hours')
      )
      AND (l.last_hot_alert_at IS NULL OR l.last_hot_alert_at < NOW() - ($1 * INTERVAL '1 hour'))
  `, [ALERT_COOLDOWN_HOURS]);

  for (const { tenant_id } of tenantsResult.rows) {
    try {
      await processAlertsForTenant(tenant_id);
    } catch (err) {
      console.error(`[HotLeadAlert] Erro no tenant ${tenant_id}:`, err.message);
    }
  }

  console.log('[HotLeadAlert] Ciclo concluído.');
}

async function processAlertsForTenant(tenantId) {
  // Canal ativo do tenant
  const channelResult = await query(
    `SELECT phone_id FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
    [tenantId]
  );
  if (!channelResult.rows.length) return;

  const phoneId = channelResult.rows[0].phone_id;

  // Atendentes ativos do tenant (recebem o alerta)
  const agentsResult = await query(
    `SELECT phone FROM handoff_agents WHERE tenant_id = $1 AND active = true`,
    [tenantId]
  );
  if (!agentsResult.rows.length) return;

  const agentPhones = agentsResult.rows.map(r => r.phone);

  // Leads quentes sem contato recente
  const leadsResult = await query(`
    SELECT
      l.id, l.stage, l.score, l.value, l.notes, l.follow_up_count,
      l.updated_at, l.last_follow_up_at,
      c.name AS contact_name, c.phone AS contact_phone,
      p.model AS product_model, p.storage AS product_storage, p.current_price
    FROM leads l
    JOIN contacts c ON c.id = l.contact_id
    LEFT JOIN products p ON p.id = l.product_id
    WHERE l.tenant_id = $1
      AND l.stage NOT IN ('won', 'lost')
      AND l.score >= 70
      AND (
        l.updated_at < NOW() - INTERVAL '24 hours'
        OR (l.last_follow_up_at IS NOT NULL AND l.last_follow_up_at < NOW() - INTERVAL '24 hours')
      )
      AND (l.last_hot_alert_at IS NULL OR l.last_hot_alert_at < NOW() - ($2 * INTERVAL '1 hour'))
    ORDER BY l.score DESC
    LIMIT 5
  `, [tenantId, ALERT_COOLDOWN_HOURS]);

  if (!leadsResult.rows.length) return;

  for (const lead of leadsResult.rows) {
    const msg = buildAlertMessage(lead);

    // Envia para cada atendente ativo
    for (const agentPhone of agentPhones) {
      try {
        await whatsappService.sendText(phoneId, agentPhone, msg);
      } catch (err) {
        console.warn(`[HotLeadAlert] Falha ao enviar para ${agentPhone}:`, err.message);
      }
    }

    // Registra que o alerta foi enviado
    try {
      await query(
        `UPDATE leads SET last_hot_alert_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [lead.id, tenantId]
      );
    } catch (err) {
      console.warn(`[HotLeadAlert] Falha ao registrar alerta do lead ${lead.id}:`, err.message);
    }
  }

  console.log(`[HotLeadAlert] ${leadsResult.rows.length} alertas enviados para tenant ${tenantId}`);
}

/**
 * Monta a mensagem de alerta para o atendente.
 */
function buildAlertMessage(lead) {
  const STAGE_PT = {
    new: 'Novo', contacted: 'Contatado', qualifying: 'Qualificando',
    interested: 'Interessado', negotiating: 'Negociando', quoted: 'Proposta enviada',
  };

  const hoursAgo = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 3_600_000);
  const lastSeen = hoursAgo < 24 ? `${hoursAgo}h atrás` : `${Math.floor(hoursAgo / 24)}d atrás`;

  let msg = `🔥 *Lead Quente sem contato!*\n\n`;
  msg += `👤 *${lead.contact_name || lead.contact_phone}*\n`;
  msg += `📱 ${lead.contact_phone}\n`;

  if (lead.product_model) {
    const price = lead.current_price
      ? ` · R$ ${Number(lead.current_price).toLocaleString('pt-BR')}`
      : '';
    msg += `📦 ${lead.product_model}${lead.product_storage ? ' ' + lead.product_storage : ''}${price}\n`;
  }

  if (lead.value > 0) {
    msg += `💰 Orçamento: R$ ${Number(lead.value).toLocaleString('pt-BR')}\n`;
  }

  msg += `\n📊 Score: *${lead.score}/100* (${STAGE_PT[lead.stage] || lead.stage})\n`;
  msg += `⏱️ Último contato: ${lastSeen}\n`;

  if (lead.notes) {
    msg += `📝 Nota: ${lead.notes}\n`;
  }

  msg += `\n_Entre em contato agora para não perder essa venda!_ 🚀`;

  return msg;
}

module.exports = { runHotLeadAlertCycle };
