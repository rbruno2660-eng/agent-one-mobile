const Bull = require('bull');

/**
 * Fila de processamento de mensagens WhatsApp.
 * Desacopla o webhook (que precisa responder 200 rápido) do processamento.
 */

const messageQueue = new Bull('whatsapp-messages', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Adiciona mensagem inbound na fila.
 * @param {object} payload - { tenantId, channelId, phoneId, from, name, message }
 */
async function enqueueInbound(payload) {
  return messageQueue.add('inbound', payload, { priority: 1 });
}

/**
 * Registra o worker que processa mensagens.
 * Chamar este arquivo no server.js para iniciar o processamento.
 */
function startWorker() {
  const conversationService = require('../services/conversation.service');
  const whatsappService = require('../services/whatsapp.service');
  // Agent runtime (Sprint 5 — por ora só ecoa ou envia mensagem padrão)

  messageQueue.process('inbound', 5, async (job) => {
    const { tenantId, phoneId, from, name, message } = job.data;

    // 1. Busca/cria contato
    const contact = await conversationService.findOrCreateContact(tenantId, from, name);

    // 2. Busca/cria conversa
    const conversation = await conversationService.findOrCreateConversation(tenantId, contact.id);

    // 3. Persiste mensagem (idempotência pelo provider_id)
    const saved = await conversationService.saveMessage({
      conversationId: conversation.id,
      tenantId,
      direction: 'inbound',
      type: message.type || 'text',
      content: message.text?.body || message.caption || '[mídia]',
      providerId: message.id,
      metadata: message,
    });

    if (!saved) {
      // Mensagem duplicada — ignora
      return { skipped: true, reason: 'duplicate' };
    }

    // 4. Atualiza status da conversa para ai_active
    if (conversation.status === 'new') {
      await conversationService.updateConversationStatus(conversation.id, 'ai_active');
    }

    // 5. Se conversa está com humano ativo, não responde automaticamente
    if (conversation.status === 'human_active') {
      return { skipped: true, reason: 'human_active' };
    }

    // 6. Agent Runtime — gera resposta com dados reais
    const agentRuntime = require('../agents/runtime');
    const reply = await agentRuntime.run(tenantId, conversation.id, contact, saved);

    if (!reply) {
      // Handoff acionado ou conversa encerrada — não enviar mensagem automática
      return { skipped: true, reason: 'handoff_or_closed' };
    }

    const sent = await whatsappService.sendText(phoneId, from, reply);

    // Persiste resposta enviada
    await conversationService.saveMessage({
      conversationId: conversation.id,
      tenantId,
      direction: 'outbound',
      type: 'text',
      content: reply,
      providerId: sent?.messages?.[0]?.id || null,
    });

    return { ok: true, conversationId: conversation.id };
  });

  messageQueue.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job.id} falhou:`, err.message);
  });

  console.log('✅ Worker de mensagens iniciado');
}

module.exports = { messageQueue, enqueueInbound, startWorker };
