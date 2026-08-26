const router = require('express').Router();
const { verifySignature } = require('../services/whatsapp.service');
const { enqueueInbound } = require('../queues/message.queue');
const { query } = require('../db/pool');

/**
 * GET /webhooks/whatsapp — Verificação do webhook pelo Meta.
 * Meta envia hub.mode=subscribe, hub.verify_token, hub.challenge.
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook WhatsApp verificado');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Verification failed' });
});

/**
 * POST /webhooks/whatsapp — Recebe eventos do Meta.
 * IMPORTANTE: usa rawBody para verificar assinatura HMAC.
 */
router.post('/', async (req, res) => {
  // Responde 200 imediatamente — Meta exige resposta rápida
  res.status(200).send('EVENT_RECEIVED');

  try {
    // Verifica assinatura (pular se APP_SECRET não configurado em dev)
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature)) {
      console.warn('[Webhook] Assinatura inválida — descartando evento');
      return;
    }

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneId = value.metadata?.phone_number_id;

        // Identifica tenant pelo phone_id
        const channelResult = await query(
          `SELECT tenant_id FROM channels WHERE phone_id = $1 AND status = 'active' LIMIT 1`,
          [phoneId]
        );

        if (channelResult.rows.length === 0) {
          console.warn(`[Webhook] phone_id ${phoneId} não encontrado em nenhum tenant`);
          continue;
        }

        const tenantId = channelResult.rows[0].tenant_id;

        // Processa mensagens recebidas
        for (const message of (value.messages || [])) {
          const contact = (value.contacts || []).find(c => c.wa_id === message.from);
          const name = contact?.profile?.name || null;

          await enqueueInbound({
            tenantId,
            phoneId,
            from: message.from,
            name,
            message,
          });
        }

        // Atualiza status de entrega (lido/entregue) — futuro
        // for (const status of (value.statuses || [])) { ... }
      }
    }
  } catch (err) {
    console.error('[Webhook] Erro ao processar evento:', err.message);
  }
});

module.exports = router;
