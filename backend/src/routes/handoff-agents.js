const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /handoff-agents
router.get('/', requireRole('manager'), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM handoff_agents WHERE tenant_id = $1 ORDER BY name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar atendentes' });
  }
});

// POST /handoff-agents
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return res.status(400).json({ error: 'Telefone inválido' });
    const result = await query(
      `INSERT INTO handoff_agents (tenant_id, name, phone) VALUES ($1, $2, $3) RETURNING *`,
      [req.tenantId, name.trim(), cleanPhone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar atendente' });
  }
});

// PATCH /handoff-agents/:id
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, active } = req.body;
    const fields = [], values = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name.trim()); }
    if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone.replace(/\D/g, '')); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE handoff_agents SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Atendente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar atendente' });
  }
});

// DELETE /handoff-agents/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM handoff_agents WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Atendente não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir atendente' });
  }
});

module.exports = router;
