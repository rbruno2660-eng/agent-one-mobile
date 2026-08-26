const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /agents — configuração do agente do tenant
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, persona, tone, status, settings FROM agents WHERE tenant_id = $1 LIMIT 1`,
      [req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar agente' });
  }
});

// PATCH /agents — atualiza configuração do agente do tenant
router.patch('/', requireRole('manager'), async (req, res) => {
  try {
    const { name, persona, tone, settings } = req.body;
    const fields = [], values = [];
    let i = 1;
    if (name      !== undefined) { fields.push(`name = $${i++}`);     values.push(name); }
    if (persona   !== undefined) { fields.push(`persona = $${i++}`);  values.push(persona); }
    if (tone      !== undefined) { fields.push(`tone = $${i++}`);     values.push(tone); }
    if (settings  !== undefined) {
      // Merge settings JSONB em vez de sobrescrever
      fields.push(`settings = settings || $${i++}::jsonb`);
      values.push(JSON.stringify(settings));
    }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    values.push(req.tenantId);
    const result = await query(
      `UPDATE agents SET ${fields.join(', ')}, updated_at = NOW(), prompt_version = prompt_version + 1
       WHERE tenant_id = $${i} RETURNING id, name, persona, tone, status, settings`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('patch agent error:', err);
    res.status(500).json({ error: 'Erro ao atualizar agente' });
  }
});

module.exports = router;
