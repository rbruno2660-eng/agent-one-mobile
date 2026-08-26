const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/audit');

router.use(authMiddleware);

const CATEGORIES = ['faq', 'policy', 'promotions', 'warranty', 'payment', 'trade', 'service', 'other'];

// GET /knowledge — lista todos os documentos
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const conditions = ['tenant_id = $1'];
    const values = [req.tenantId];
    let i = 2;

    if (category) { conditions.push(`category = $${i++}`); values.push(category); }

    const result = await query(
      `SELECT id, title, category, active, char_length(content) AS chars, created_at, updated_at
       FROM knowledge_documents
       WHERE ${conditions.join(' AND ')}
       ORDER BY category, title`,
      values
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
});

// GET /knowledge/:id — conteúdo completo
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});

// POST /knowledge
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(3).max(200),
      content: z.string().min(10),
      category: z.enum(CATEGORIES).default('other'),
    });
    const data = schema.parse(req.body);

    const result = await query(
      `INSERT INTO knowledge_documents (tenant_id, title, content, category)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.tenantId, data.title, data.content, data.category]
    );

    await auditLog({
      tenantId: req.tenantId, actor: req.user,
      action: 'create_knowledge_doc', entity: 'knowledge_document',
      entityId: result.rows[0].id, after: { title: data.title, category: data.category },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: 'Erro ao criar documento' });
  }
});

// PATCH /knowledge/:id
router.patch('/:id', requireRole('manager'), async (req, res) => {
  try {
    const before = await query(
      `SELECT * FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (before.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' });

    const fields = [], values = [];
    let i = 1;
    const allowed = ['title', 'content', 'category', 'active'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) { fields.push(`${f} = $${i++}`); values.push(req.body[f]); }
    }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);

    const result = await query(
      `UPDATE knowledge_documents SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );

    await auditLog({
      tenantId: req.tenantId, actor: req.user,
      action: 'update_knowledge_doc', entity: 'knowledge_document',
      entityId: req.params.id, before: before.rows[0], after: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// DELETE /knowledge/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const before = await query(
      `SELECT title FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (before.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' });

    await query(`DELETE FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);

    await auditLog({
      tenantId: req.tenantId, actor: req.user,
      action: 'delete_knowledge_doc', entity: 'knowledge_document',
      entityId: req.params.id, before: before.rows[0],
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao remover documento' });
  }
});

module.exports = router;
