/**
 * Notificações de conversa para atendentes — Agent One
 *
 * Envia WhatsApp para os atendentes ativos do tenant em dois momentos:
 *   1. Nova conversa iniciada (primeiro contato de um número)
 *   2. Handoff solicitado (cliente pediu humano ou IA encaminhou)
 *
 * Fire-and-forget — nunca bloqueia o fluxo principal.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

// Evita spam: armazena em memória os últimos envios por conversa
// (uma notificação de "nova conversa" por conversationId)
const notifiedConversations = new Set();

/**
 * Retorna o canal ativo e os atendentes ativos do tenant.
 */
async function getChannelAndAgents(tenantId) {
  const [channelRes, agentsRes] = await Promise.all([
    query(
      `SELECT phone_id, settings FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [tenantId]
    ),
    query(
      `SELECT name, phone FROM handoff_agents WHERE tenant_id = $1 AND active = true`,
      [tenantId]
    ),
  ]);

  if (!channelRes.rows.length || !agentsRes.rows.length) return null;

  return {
    phoneId: channelRes.rows[0].phone_id,
    channelToken: channelRes.rows[0].settings?.access_token || null,
    agents: agentsRes.rows,
  };
}

/**
 * Notifica atendentes quando uma nova conversa chega pela primeira vez.
 *
 * @param {string} tenantId
 * @param {{ id: string, phone: string, name: string }} contact
 * @param {string} conversationId
 * @param {string} firstMessage  — texto da primeira mensagem do cliente
 */
async function notifyNewConversation(tenantId, contact, conversationId, firstMessage) {
  // Cada conversa notifica só uma vez
  if (notifiedConversations.has(conversationId)) return;
  notifiedConversations.add(conversationId);
  // Limpa memória após 24h para não vazar
  setTimeout(() => notifiedConversations.delete(conversationId), 86_400_000);

  setImmediate(async () => {
    try {
      const ctx = await getChannelAndAgents(tenantId);
      if (!ctx) return;

      const contactName = contact.name || contact.phone;
      const preview = firstMessage?.slice(0, 120) || '[mídia]';

      const msg =
        `💬 *Nova conversa iniciada!*\n\n` +
        `👤 *${contactName}*\n` +
        `📱 ${contact.phone}\n\n` +
        `_"${preview}${firstMessage?.length > 120 ? '…' : ''}"_\n\n` +
        `A IA já está respondendo. Acompanhe no painel.`;

      for (const agent of ctx.agents) {
        try {
          await whatsappService.sendText(ctx.phoneId, agent.phone, msg, ctx.channelToken);
        } catch (err) {
          console.warn(`[ConvNotify] Falha ao notificar ${agent.phone}:`, err.message);
        }
      }

      console.log(`[ConvNotify] Nova conversa notificada para ${ctx.agents.length} atendente(s) — conv ${conversationId}`);
    } catch (err) {
      console.warn('[ConvNotify] Erro ao notificar nova conversa:', err.message);
    }
  });
}

/**
 * Notifica atendentes quando a IA ou uma palavra-chave solicita handoff.
 *
 * @param {string} tenantId
 * @param {{ id: string, phone: string, name: string }} contact
 * @param {string} conversationId
 * @param {string} reason  — motivo do handoff (ex: 'Cliente pediu humano', 'Cancelamento')
 */
async function notifyHandoffRequested(tenantId, contact, conversationId, reason) {
  setImmediate(async () => {
    try {
      const ctx = await getChannelAndAgents(tenantId);
      if (!ctx) return;

      const contactName = contact.name || contact.phone;

      const msg =
        `🚨 *Atendimento humano solicitado!*\n\n` +
        `👤 *${contactName}*\n` +
        `📱 ${contact.phone}\n` +
        `📋 Motivo: ${reason || 'Solicitação do cliente'}\n\n` +
        `⚡ Acesse o painel agora para assumir o atendimento.`;

      for (const agent of ctx.agents) {
        try {
          await whatsappService.sendText(ctx.phoneId, agent.phone, msg, ctx.channelToken);
        } catch (err) {
          console.warn(`[ConvNotify] Falha ao notificar ${agent.phone}:`, err.message);
        }
      }

      console.log(`[ConvNotify] Handoff notificado para ${ctx.agents.length} atendente(s) — conv ${conversationId}`);
    } catch (err) {
      console.warn('[ConvNotify] Erro ao notificar handoff:', err.message);
    }
  });
}

module.exports = { notifyNewConversation, notifyHandoffRequested };
