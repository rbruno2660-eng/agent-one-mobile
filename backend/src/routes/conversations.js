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
    const updated = await conversationService.updateConversationStatus(
      req.params.id, req.tenantId, 'closed'
    );
    if (!updated) return res.status(404).json({ error: 'Conversa não encontrada' });
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

    // Deleta mensagens e a conversa (ON DELETE CASCADE garante integridade)
    await query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
    await query(`DELETE FROM conversations WHERE id = $1 AND tenant_id = $2`, [id, req.tenantId]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir conversa' });
  }
});

module.exports = router;
