const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const conversationService = require('../services/conversation.service');
const whatsappService = require('../services/whatsapp.service');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/audit');

router.use(authMiddleware);

// GET /conversations
router.get('/', async (req, res) => {
  try {
    const conversations = await conversationService.listConversations(req.tenantId, {
      status: req.query.status,
      assignedTo: req.query.assigned_to,
    });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// GET /conversations/:id
router.get('/:id', async (req, res) => {
  try {
    const conversation = await conversationService.getConversation(req.tenantId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
});

// POST /conversations/:id/reply — resposta manual do humano
router.post('/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Texto obrigatório' });

    const conversation = await conversationService.getConversation(req.tenantId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Busca canal ativo do tenant
    const channelResult = await query(
      `SELECT phone_id FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [req.tenantId]
    );
    if (channelResult.rows.length === 0) return res.status(400).json({ error: 'Canal WhatsApp não configurado' });

    const phoneId = channelResult.rows[0].phone_id;
    const sent = await whatsappService.sendText(phoneId, conversation.contact_phone, text);

    await conversationService.saveMessage({
      conversationId: conversation.id,
      tenantId: req.tenantId,
      direction: 'outbound',
      type: 'text',
      content: text,
      providerId: sent?.messages?.[0]?.id || null,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao enviar mensagem' });
  }
});

// POST /conversations/:id/handoff — transfere para humano
router.post('/:id/handoff', async (req, res) => {
  try {
    const { reason, summary } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason obrigatório' });

    const conversation = await conversationService.getConversation(req.tenantId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Cria handoff
    await query(
      `INSERT INTO handoffs (conversation_id, tenant_id, reason, summary, status)
       VALUES ($1,$2,$3,$4,'pending')`,
      [req.params.id, req.tenantId, reason, summary || null]
    );

    // Atualiza status da conversa
    await conversationService.updateConversationStatus(req.params.id, req.tenantId, 'human_requested');

    await auditLog({
      tenantId: req.tenantId,
      actor: req.user,
      action: 'handoff_requested',
      entity: 'conversation',
      entityId: req.params.id,
      after: { reason, summary },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar handoff' });
  }
});

// PATCH /conversations/:id/assign — atribui a um usuário
router.patch('/:id/assign', async (req, res) => {
  try {
    const { user_id } = req.body;

    // Verifica ownership e atualiza em uma só operação com tenant_id
    const updated = await conversationService.updateConversationStatus(
      req.params.id, req.tenantId, 'human_active', user_id
    );
    if (!updated) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Atualiza handoff pendente — filtra por tenant_id para evitar cross-tenant
    await query(
      `UPDATE handoffs SET status = 'assigned', assigned_to = $1, updated_at = NOW()
       WHERE conversation_id = $2 AND tenant_id = $3 AND status = 'pending'`,
      [user_id, req.params.id, req.tenantId]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atribuir conversa' });
  }
});

// PATCH /conversations/:id/close — encerra conversa
router.patch('/:id/close', async (req, res) => {
  try {
    const conversation = await conversationService.getConversation(req.tenantId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });

    const updated = await conversationService.updateConversationStatus(
      req.params.id, req.tenantId, 'closed'
    );
    if (!updated) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Feature 5 — Recompra: se lead atingiu 'won', agenda reativação em 30 dias
    setImmediate(async () => {
      try {
        const { scheduleReactivation } = require('../services/reactivation.service');
        const wonLead = await query(
          `SELECT id, contact_id FROM leads
           WHERE conversation_id = $1 AND tenant_id = $2 AND stage = 'won'
           LIMIT 1`,
          [req.params.id, req.tenantId]
        );
        if (wonLead.rows.length) {
          await scheduleReactivation(req.tenantId, wonLead.rows[0].contact_id, req.params.id);
        }
      } catch (err) {
        console.error('[Close/Reactivation] Erro ao agendar reativação:', err.message);
      }
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao encerrar conversa' });
  }
});

// PATCH /conversations/:id/return-to-ai — devolve para IA
router.patch('/:id/return-to-ai', requireRole('seller'), async (req, res) => {
  try {
    const updated = await conversationService.updateConversationStatus(
      req.params.id, req.tenantId, 'ai_active', null
    );
    if (!updated) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao devolver conversa para IA' });
  }
});

// GET /conversations/:id/handoff-summary — briefing card para o vendedor
router.get('/:id/handoff-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const tid = req.tenantId;

    const [convResult, leadResult, handoffResult, messagesResult] = await Promise.all([
      // Conversa + contato
      query(`
        SELECT c.*, ct.name AS contact_name, ct.phone AS contact_phone
        FROM conversations c
        JOIN contacts ct ON ct.id = c.contact_id
        WHERE c.id = $1 AND c.tenant_id = $2
      `, [id, tid]),

      // Lead mais recente com produto e score
      query(`
        SELECT l.*, p.model AS product_model, p.storage AS product_storage, p.current_price
        FROM leads l
        LEFT JOIN products p ON p.id = l.product_id
        WHERE l.conversation_id = $1 AND l.tenant_id = $2
        ORDER BY l.score DESC, l.created_at DESC
        LIMIT 1
      `, [id, tid]),

      // Registro de handoff (motivo + resumo da IA)
      query(`
        SELECT * FROM handoffs
        WHERE conversation_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC LIMIT 1
      `, [id, tid]),

      // Últimas 6 mensagens para contexto
      query(`
        SELECT direction, content, created_at, metadata
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC LIMIT 6
      `, [id]),
    ]);

    if (!convResult.rows.length) return res.status(404).json({ error: 'Conversa não encontrada' });

    const conv = convResult.rows[0];
    const lead = leadResult.rows[0] || null;
    const handoff = handoffResult.rows[0] || null;
    const recentMessages = messagesResult.rows.reverse();

    // Deriva temperatura do score
    function tempFromScore(score, stage) {
      if (stage === 'won')  return { label: 'Ganho', emoji: '✅', color: '#22c55e' };
      if (stage === 'lost') return { label: 'Perdido', emoji: '❌', color: '#6b7280' };
      if (!score)           return { label: 'Frio', emoji: '🧊', color: '#60a5fa' };
      if (score >= 70)      return { label: 'Quente', emoji: '🔥', color: '#ef4444' };
      if (score >= 40)      return { label: 'Morno', emoji: '☀️', color: '#f59e0b' };
      return { label: 'Frio', emoji: '🧊', color: '#60a5fa' };
    }

    // Ação recomendada baseada no score/stage
    function recommendedAction(lead) {
      if (!lead) return 'Entender o que o cliente precisa antes de fazer uma oferta.';
      const stage = lead.stage;
      const score = lead.score || 0;
      if (stage === 'won') return 'Venda fechada — confirmar pagamento e entrega.';
      if (stage === 'lost') return 'Lead perdido — entender objeção antes de tentar retomar.';
      if (stage === 'negotiating' || stage === 'quoted') return 'Proposta enviada — resolver objeção de preço ou prazo.';
      if (stage === 'interested' && score >= 60) return 'Lead quente com produto identificado — fazer oferta concreta agora.';
      if (stage === 'interested') return 'Cliente interessado — confirmar produto e orçamento antes de oferta.';
      if (stage === 'qualifying' || stage === 'contacted') return 'Cliente em qualificação — mapear necessidade e produto certo.';
      return 'Entender o que o cliente precisa antes de fazer uma oferta.';
    }

    const temperature = lead ? tempFromScore(lead.score, lead.stage) : null;

    res.json({
      conversation: {
        id: conv.id,
        status: conv.status,
        contact: { name: conv.contact_name, phone: conv.contact_phone },
        started_at: conv.created_at,
      },
      lead: lead ? {
        id: lead.id,
        stage: lead.stage,
        score: lead.score,
        value: lead.value ? parseFloat(lead.value) : null,
        notes: lead.notes,
        follow_up_count: lead.follow_up_count,
        temperature,
        product: lead.product_model
          ? { model: lead.product_model, storage: lead.product_storage, price: lead.current_price ? parseFloat(lead.current_price) : null }
          : null,
      } : null,
      handoff: handoff ? {
        reason: handoff.reason,
        summary: handoff.summary,
        created_at: handoff.created_at,
      } : null,
      recent_messages: recentMessages.map(m => ({
        direction: m.direction,
        content: m.content,
        time: m.created_at,
      })),
      recommended_action: recommendedAction(lead),
    });
  } catch (err) {
    console.error('[HandoffSummary]', err.message);
    res.status(500).json({ error: 'Erro ao gerar briefing' });
  }
});

// DELETE /conversations/:id — exclui conversa e mensagens (manager+)
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    // Verifica que a conversa pertence ao tenant
    const check = await query(
      `SELECT id FROM conversations WHERE id = $1 AND tenant_id = $2`,
      [id, req.tenantId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Deleta todos os registros dependentes antes da conversa
    await query(`DELETE FROM tool_calls WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM handoffs WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM leads WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM orders WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM service_orders WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM trade_evaluations WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM conversations WHERE id = $1 AND tenant_id = $2`, [id, req.tenantId]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir conversa' });
  }
});

module.exports = router;
