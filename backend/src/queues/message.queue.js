/**
 * Fila de processamento de mensagens WhatsApp.
 * Desacopla o webhook (que precisa responder 200 rápido) do processamento.
 *
 * Modo: Redis disponível → Bull queue com retries
 *       Redis indisponível → processamento direto (in-process, sem retry)
 */

let messageQueue = null;
let useInProcess = false;

// Tenta conectar ao Redis; se falhar, usa modo in-process
function initQueue() {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    console.warn('[Queue] REDIS_URL não configurado — usando processamento direto (sem fila)');
    useInProcess = true;
    return;
  }

  try {
    const Bull = require('bull');
    messageQueue = new Bull('whatsapp-messages', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    // Testa a conexão
    messageQueue.client.on('error', (err) => {
      if (!useInProcess) {
        console.warn('[Queue] Redis error — fallback para processamento direto:', err.message);
        useInProcess = true;
      }
    });
  } catch (err) {
    console.warn('[Queue] Bull não disponível — usando processamento direto:', err.message);
    useInProcess = true;
  }
}

initQueue();

/**
 * Lógica central de processamento de uma mensagem inbound.
 * Usada tanto pelo worker Bull quanto pelo modo in-process.
 */
async function processInbound({ tenantId, phoneId, from, name, message }) {
  const conversationService = require('../services/conversation.service');
  const whatsappService = require('../services/whatsapp.service');
  const agentRuntime = require('../agents/runtime');
  const { transcribeAudio } = require('../services/transcription.service');

  // 1. Busca/cria contato
  const contact = await conversationService.findOrCreateContact(tenantId, from, name);

  // 2. Busca/cria conversa
  const conversation = await conversationService.findOrCreateConversation(tenantId, contact.id);

  // 3. Resolve conteúdo da mensagem — transcreve áudio se disponível
  let content = message.text?.body || message.caption || '[mídia]';
  if (message.type === 'audio' && message.audio?.id) {
    try {
      const transcript = await transcribeAudio(message.audio.id);
      if (transcript) {
        content = `[Áudio]: ${transcript}`;
        console.log(`[Transcription] Áudio transcrito: "${transcript.slice(0, 80)}..."`);
      }
    } catch (err) {
      console.warn('[Transcription] Falha ao transcrever áudio:', err.message);
      // Fallback: conteúdo como '[mídia]' — IA informará ao cliente que não entendeu o áudio
    }
  }

  // 3b. Persiste mensagem (idempotência pelo provider_id)
  const saved = await conversationService.saveMessage({
    conversationId: conversation.id,
    tenantId,
    direction: 'inbound',
    type: message.type || 'text',
    content,
    providerId: message.id,
    metadata: message,
  });

  if (!saved) {
    return { skipped: true, reason: 'duplicate' };
  }

  // 4. Atualiza status da conversa para ai_active
  if (conversation.status === 'new') {
    await conversationService.updateConversationStatus(conversation.id, tenantId, 'ai_active');
  }

  // 5. Se conversa está com humano ativo, não responde automaticamente
  if (conversation.status === 'human_active') {
    return { skipped: true, reason: 'human_active' };
  }

  // 6. Agent Runtime — gera resposta com Claude
  const reply = await agentRuntime.run(tenantId, conversation.id, contact, saved);

  if (!reply) {
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
}

/**
 * Adiciona mensagem inbound na fila (ou processa direto se sem Redis).
 */
async function enqueueInbound(payload) {
  if (useInProcess || !messageQueue) {
    // Processa de forma assíncrona sem bloquear o webhook
    setImmediate(async () => {
      try {
        await processInbound(payload);
      } catch (err) {
        console.error('[Queue/InProcess] Erro ao processar mensagem:', err.message);
      }
    });
    return { ok: true, mode: 'in-process' };
  }

  return messageQueue.add('inbound', payload, { priority: 1 });
}

/**
 * Registra o worker Bull (só usado quando Redis está disponível).
 */
function startWorker() {
  if (useInProcess || !messageQueue) {
    console.log('✅ Modo in-process ativo (sem Redis) — mensagens processadas diretamente');
    return;
  }

  messageQueue.process('inbound', 5, async (job) => {
    return processInbound(job.data);
  });

  messageQueue.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job.id} falhou:`, err.message);
  });

  console.log('✅ Worker de mensagens (Bull/Redis) iniciado');
}

module.exports = { messageQueue, enqueueInbound, startWorker };
