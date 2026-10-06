/**
 * Serviço de recompra — Feature 5.
 * Quando uma venda é fechada (lead stage = 'won'), agenda uma mensagem proativa
 * 30 dias depois perguntando se o cliente quer ver novidades.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

const REACTIVATION_MESSAGE =
  'Oi! 😊 Já faz um tempinho desde sua última visita. Chegaram novidades aqui na loja! Quer dar uma olhada?';

/**
 * Agenda uma reativação para 30 dias a partir de agora.
 * Idempotente: ignora se já existe um agendamento pendente para essa conversa.
 */
async function scheduleReactivation(tenantId, contactId, conversationId) {
  try {
    // Evita duplicatas
    const existing = await query(
      `SELECT id FROM reactivation_queue
       WHERE tenant_id = $1 AND conversation_id = $2 AND status = 'pending'`,
      [tenantId, conversationId]
    );
    if (existing.rows.length) {
      console.log(`[Reactivation] Agendamento já existe para conversa ${conversationId}`);
      return null;
    }

    const result = await query(
      `INSERT INTO reactivation_queue (tenant_id, contact_id, conversation_id, scheduled_for, message)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', $4) RETURNING *`,
      [tenantId, contactId, conversationId, REACTIVATION_MESSAGE]
    );

    console.log(`[Reactivation] ✓ Reativação agendada para conversa ${conversationId} em 30 dias`);
    return result.rows[0];
  } catch (err) {
    console.error('[Reactivation] Erro ao agendar reativação:', err.message);
    throw err;
  }
}

/**
 * Processa reativações pendentes com scheduled_for <= NOW().
 * Executado diariamente via cron.
 */
async function processReactivations() {
  console.log('[Reactivation] Processando reativações pendentes...');

  const dueResult = await query(`
    SELECT
      rq.id,
      rq.tenant_id,
      rq.contact_id,
      rq.conversation_id,
      rq.message,
      ct.phone  AS contact_phone,
      ct.name   AS contact_name,
      ch.phone_id,
      ch.settings AS channel_settings
    FROM reactivation_queue rq
    JOIN contacts ct ON ct.id = rq.contact_id
    JOIN channels ch ON ch.tenant_id = rq.tenant_id AND ch.status = 'active'
    WHERE rq.status = 'pending'
      AND rq.scheduled_for <= NOW()
    LIMIT 100
  `);

  console.log(`[Reactivation] ${dueResult.rows.length} reativação(ões) para processar.`);

  for (const row of dueResult.rows) {
    try {
      const token = row.channel_settings?.access_token || null;
      const personalizedMsg = row.message
        .replace(/\{nome\}/gi, row.contact_name?.split(' ')[0] || 'cliente');

      await whatsappService.sendText(row.phone_id, row.contact_phone, personalizedMsg, token);

      // Persiste mensagem outbound na conversa original (se ainda existir)
      if (row.conversation_id) {
        await query(
          `INSERT INTO messages (conversation_id, tenant_id, direction, type, content)
           VALUES ($1, $2, 'outbound', 'text', $3)
           ON CONFLICT DO NOTHING`,
          [row.conversation_id, row.tenant_id, personalizedMsg]
        ).catch(() => {}); // ignora se conversa foi deletada
      }

      // Marca como enviado
      await query(
        `UPDATE reactivation_queue SET status = 'sent', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );

      console.log(`[Reactivation] ✓ Enviado para ${row.contact_name || row.contact_phone}`);
    } catch (err) {
      console.error(`[Reactivation] Erro para contato ${row.contact_phone}:`, err.message);
      // Não marca como 'failed' — tenta novamente no próximo ciclo (até scheduled_for + N dias)
    }
  }

  console.log('[Reactivation] Ciclo de reativações concluído.');
}

module.exports = { scheduleReactivation, processReactivations };
