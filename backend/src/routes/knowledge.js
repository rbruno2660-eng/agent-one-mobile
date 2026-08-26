const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/audit');

router.use(authMiddleware);

const TYPES = ['faq', 'policy', 'operational', 'commercial', 'brand'];

// GET /knowledge — lista todos os documentos
router.get('/', async (req, res) => {
  try {
    const { type, category } = req.query;
    const conditions = ['tenant_id = $1'];
    const values = [req.tenantId];
    let i = 2;

    const typeFilter = type || category;
    if (typeFilter) { conditions.push(`type = $${i++}`); values.push(typeFilter); }

    const result = await query(
      `SELECT id, title, type AS category, status AS active, char_length(content) AS chars, created_at, updated_at
       FROM knowledge_documents
       WHERE ${conditions.join(' AND ')}
       ORDER BY type, title`,
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
      `SELECT id, title, type AS category, content, status AS active, version, created_at, updated_at
       FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
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
      category: z.enum(TYPES).default('faq'),
      type: z.enum(TYPES).optional(),
    });
    const data = schema.parse(req.body);
    const docType = data.type || data.category;

    const result = await query(
      `INSERT INTO knowledge_documents (tenant_id, title, content, type, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, title, type AS category, status AS active, created_at`,
      [req.tenantId, data.title, data.content, docType, req.user.id]
    );

    await auditLog({
      tenantId: req.tenantId, actor: req.user,
      action: 'create_knowledge_doc', entity: 'knowledge_document',
      entityId: result.rows[0].id, after: { title: data.title, type: docType },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    console.error('knowledge post error:', err.message);
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
    if (req.body.title   !== undefined) { fields.push(`title = $${i++}`);   values.push(req.body.title); }
    if (req.body.content !== undefined) { fields.push(`content = $${i++}`); values.push(req.body.content); }
    if (req.body.category !== undefined || req.body.type !== undefined) {
      fields.push(`type = $${i++}`); values.push(req.body.type || req.body.category);
    }
    if (req.body.active !== undefined) {
      fields.push(`status = $${i++}`); values.push(req.body.active === true || req.body.active === 'active' ? 'active' : 'inactive');
    }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);

    const result = await query(
      `UPDATE knowledge_documents SET ${fields.join(', ')}, updated_at = NOW(), version = version + 1
       WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, title, type AS category, status AS active`,
      values
    );

    await auditLog({
      tenantId: req.tenantId, actor: req.user,
      action: 'update_knowledge_doc', entity: 'knowledge_document',
      entityId: req.params.id, before: before.rows[0], after: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('knowledge patch error:', err.message);
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
