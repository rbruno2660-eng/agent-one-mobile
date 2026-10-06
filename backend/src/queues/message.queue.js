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
  const { textToSpeech, isTTSEnabled } = require('../services/tts.service');

  // 1. Busca/cria contato
  const contact = await conversationService.findOrCreateContact(tenantId, from, name);

  // 2. Busca/cria conversa
  const conversation = await conversationService.findOrCreateConversation(tenantId, contact.id);

  // 3. Resolve conteúdo da mensagem — transcreve áudio / analisa foto se disponível
  const clientSentAudio = message.type === 'audio'; // ← usado no passo 7 para espelhar áudio
  let content = message.text?.body || message.caption || '[mídia]';

  if (message.type === 'audio' && message.audio?.id) {
    try {
      const transcript = await transcribeAudio(message.audio.id);
      if (transcript) {
        content = `[Áudio]: ${transcript}`;
        console.log(`[Transcription] Áudio transcrito com sucesso, chars: ${transcript.length}`);
      }
    } catch (err) {
      console.warn('[Transcription] Falha ao transcrever áudio:', err.message);
      // Fallback: conteúdo como '[mídia]' — IA informará ao cliente
    }
  }

  // 3b. Agent One Vision — analisa foto de aparelho para avaliação de troca
  if (message.type === 'image' && message.image?.id) {
    try {
      const { query: dbQuery } = require('../db/pool');
      const channelRow = await dbQuery(
        `SELECT settings FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
        [tenantId]
      );
      const channelToken = channelRow.rows[0]?.settings?.access_token || null;

      if (channelToken) {
        const { analyzeTradePhoto, formatAnalysisForAgent } = require('../services/vision.service');
        const analysis = await analyzeTradePhoto(message.image.id, channelToken);
        content = formatAnalysisForAgent(analysis);
        console.log(`[Vision] Análise concluída: modelo=${analysis.model_detected}, confiança=${analysis.confidence}`);
      } else {
        content = '[Cliente enviou uma foto do aparelho. Canal sem token — peça ao cliente para descrever o estado do aparelho.]';
      }
    } catch (err) {
      console.warn('[Vision] Erro ao analisar foto:', err.message);
      content = '[Cliente enviou uma foto do aparelho para avaliação. Análise automática indisponível — peça detalhes ao cliente: estado da tela, traseira e carcaça, e saúde da bateria.]';
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

  // 5b. Roteamento por palavra-chave — Feature 2
  // Detecta intenções antes de chamar a IA (economiza tokens e redireciona instantaneamente)
  const rawText = message.text?.body || message.caption || '';
  if (rawText) {
    const { detectIntent } = require('../agents/keyword.router');
    const kwIntent = detectIntent(rawText);

    if (kwIntent && kwIntent.handoffReason) {
      // Intenções que exigem transferência para humano (cancel, payment, human_request)
      console.log(`[KeywordRouter] Intent "${kwIntent.intent}" detectado — transferindo para humano (${kwIntent.handoffReason})`);
      const { query: dbQuery } = require('../db/pool');

      // Cria handoff
      await dbQuery(
        `INSERT INTO handoffs (conversation_id, tenant_id, reason, summary, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT DO NOTHING`,
        [conversation.id, tenantId, kwIntent.handoffReason,
          `Transferência automática por palavra-chave (intent: ${kwIntent.intent})`]
      );

      // Atualiza status
      await conversationService.updateConversationStatus(conversation.id, tenantId, 'human_requested');

      // Mensagem de confirmação ao cliente
      const channelRow = await dbQuery(
        `SELECT phone_id, settings FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
        [tenantId]
      );
      if (channelRow.rows.length) {
        const ph = channelRow.rows[0].phone_id;
        const tk = channelRow.rows[0].settings?.access_token || null;
        const confirmMsg = kwIntent.intent === 'cancel'
          ? 'Entendi! Vou te conectar com um de nossos atendentes para resolver isso. Um momento! 🙏'
          : kwIntent.intent === 'payment'
          ? 'Claro! Vou te transferir para nossa equipe financeira agora. Aguarde um instante! 💳'
          : 'Certo! Já estou te conectando com um atendente humano. Um momento! 👤';
        await whatsappService.sendText(ph, from, confirmMsg, tk);
        await conversationService.saveMessage({
          conversationId: conversation.id, tenantId, direction: 'outbound',
          type: 'text', content: confirmMsg, providerId: null,
        });
      }

      return { ok: true, intent: kwIntent.intent, handoff: true };
    }

    // Intent 'promotion': passa flag para o runtime injetar contexto no prompt
    if (kwIntent?.intent === 'promotion') {
      console.log(`[KeywordRouter] Intent "promotion" detectado — injetando contexto no agente`);
      saved.promotionHint = true;
    }
  }

  // 6. Agent Runtime — gera resposta com Claude
  const reply = await agentRuntime.run(tenantId, conversation.id, contact, saved);

  if (!reply) {
    return { skipped: true, reason: 'handoff_or_closed' };
  }

  // 7. Busca configurações do canal (token + voz ElevenLabs por tenant)
  const { query: dbQuery } = require('../db/pool');
  const channelRow = await dbQuery(
    `SELECT settings FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
    [tenantId]
  );
  const channelSettings = channelRow.rows[0]?.settings || {};
  const channelToken = channelSettings.access_token || null;
  const tenantVoiceId = channelSettings.elevenlabs_voice_id || null; // voz clonada por tenant

  // 8. Envia resposta — espelha o formato: áudio → áudio (com voz clonada), texto → texto
  let sent;
  let outboundType = 'text';

  if (clientSentAudio && isTTSEnabled(tenantVoiceId)) {
    try {
      console.log(`[TTS] Cliente enviou áudio — gerando resposta em voz para ${from}`);
      const oggBuffer = await textToSpeech(reply, tenantVoiceId);
      sent = await whatsappService.sendAudio(phoneId, from, oggBuffer, channelToken);
      outboundType = 'audio';
      console.log(`[TTS] Resposta de voz enviada com sucesso para ${from}`);
    } catch (ttsErr) {
      // Fallback para texto se TTS falhar (não quebra o atendimento)
      console.warn(`[TTS] Falha ao gerar áudio — enviando como texto. Erro: ${ttsErr.message}`);
      sent = await whatsappService.sendText(phoneId, from, reply, channelToken);
    }
  } else {
    sent = await whatsappService.sendText(phoneId, from, reply, channelToken);
  }

  // 9. Persiste resposta enviada
  await conversationService.saveMessage({
    conversationId: conversation.id,
    tenantId,
    direction: 'outbound',
    type: outboundType,
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
