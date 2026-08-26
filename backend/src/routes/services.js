const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /services
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM services WHERE tenant_id = $1 ORDER BY name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

// POST /services
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      compatible_with: z.array(z.string()).optional(),
      price: z.number().positive(),
      min_price: z.number().positive(),
      warranty_days: z.number().int().default(90),
      turnaround_days: z.number().int().default(1),
    });
    const data = schema.parse(req.body);

    if (data.min_price > data.price) return res.status(400).json({ error: 'Preço mínimo não pode ser maior que o preço' });

    const result = await query(
      `INSERT INTO services (tenant_id, name, description, compatible_with, price, min_price, warranty_days, turnaround_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.tenantId, data.name, data.description || null, data.compatible_with || [], data.price, data.min_price, data.warranty_days, data.turnaround_days]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// PATCH /services/:id
router.patch('/:id', requireRole('manager'), async (req, res) => {
  try {
    const fields = [], values = [];
    let i = 1;
    const allowed = ['name','description','price','min_price','warranty_days','turnaround_days','active','compatible_with'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) { fields.push(`${f} = $${i++}`); values.push(req.body[f]); }
    }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE services SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// DELETE /services/:id
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    await query(`UPDATE services SET active = false WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
});

module.exports = router;
