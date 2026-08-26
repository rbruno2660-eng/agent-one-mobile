const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /leads
router.get('/', async (req, res) => {
  try {
    const conditions = ['l.tenant_id = $1'];
    const values = [req.tenantId];
    let i = 2;

    if (req.query.stage) { conditions.push(`l.stage = $${i++}`); values.push(req.query.stage); }

    const result = await query(`
      SELECT
        l.*,
        c.name AS contact_name, c.phone AS contact_phone,
        p.model AS product_model, p.variant AS product_variant, p.storage AS product_storage
      FROM leads l
      JOIN contacts c ON c.id = l.contact_id
      LEFT JOIN products p ON p.id = l.product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.score DESC, l.created_at DESC
      LIMIT 200
    `, values);

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

// PATCH /leads/:id
router.patch('/:id', async (req, res) => {
  try {
    const { stage, score, notes } = req.body;
    const fields = [], values = [];
    let i = 1;
    if (stage) { fields.push(`stage = $${i++}`); values.push(stage); }
    if (score !== undefined) { fields.push(`score = $${i++}`); values.push(score); }
    if (notes !== undefined) { fields.push(`notes = $${i++}`); values.push(notes); }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE leads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

module.exports = router;
