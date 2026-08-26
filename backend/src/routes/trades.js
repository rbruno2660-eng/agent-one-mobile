const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/audit');

router.use(authMiddleware);

// ─────────────────────────────────────────────
// REGRAS DE TROCA (valor base por modelo)
// ─────────────────────────────────────────────

// GET /trades/rules
router.get('/rules', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM trade_rules WHERE tenant_id = $1 ORDER BY model, storage`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar regras de troca' });
  }
});

// POST /trades/rules
router.post('/rules', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      model: z.string().min(2),
      storage: z.string().optional(),
      condition: z.string().optional(),
      base_value: z.number().positive(),
    });
    const data = schema.parse(req.body);

    const result = await query(
      `INSERT INTO trade_rules (tenant_id, model, storage, condition, base_value)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.tenantId, data.model, data.storage || null, data.condition || null, data.base_value]
    );
    await auditLog({ tenantId: req.tenantId, actor: req.user, action: 'create_trade_rule', entity: 'trade_rule', entityId: result.rows[0].id, after: result.rows[0] });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: 'Erro ao criar regra de troca' });
  }
});

// PATCH /trades/rules/:id
router.patch('/rules/:id', requireRole('manager'), async (req, res) => {
  try {
    const before = await query(`SELECT * FROM trade_rules WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    if (before.rows.length === 0) return res.status(404).json({ error: 'Regra não encontrada' });

    const { base_value, active } = req.body;
    const fields = [], values = [];
    let i = 1;
    if (base_value !== undefined) { fields.push(`base_value = $${i++}`); values.push(base_value); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE trade_rules SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );
    await auditLog({ tenantId: req.tenantId, actor: req.user, action: 'update_trade_rule', entity: 'trade_rule', entityId: req.params.id, before: before.rows[0], after: result.rows[0] });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar regra' });
  }
});

// DELETE /trades/rules/:id
router.delete('/rules/:id', requireRole('manager'), async (req, res) => {
  try {
    await query(`DELETE FROM trade_rules WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao remover regra' });
  }
});

// ─────────────────────────────────────────────
// REGRAS DE DESCONTO (bateria, tela, traseira...)
// ─────────────────────────────────────────────

// GET /trades/deductions
router.get('/deductions', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM trade_deduction_rules WHERE tenant_id = $1 ORDER BY type, condition`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar regras de desconto' });
  }
});

// POST /trades/deductions
router.post('/deductions', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(['battery','screen','back','body','camera','faceid','other']),
      condition: z.string().min(1),
      label: z.string().min(2),
      amount: z.number().positive(),
    });
    const data = schema.parse(req.body);

    const result = await query(
      `INSERT INTO trade_deduction_rules (tenant_id, type, condition, label, amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.tenantId, data.type, data.condition, data.label, data.amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: 'Erro ao criar regra de desconto' });
  }
});

// PATCH /trades/deductions/:id
router.patch('/deductions/:id', requireRole('manager'), async (req, res) => {
  try {
    const { amount, active } = req.body;
    const fields = [], values = [];
    let i = 1;
    if (amount !== undefined) { fields.push(`amount = $${i++}`); values.push(amount); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE trade_deduction_rules SET ${fields.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar desconto' });
  }
});

// ─────────────────────────────────────────────
// AVALIAÇÕES DE TROCA
// ─────────────────────────────────────────────

// GET /trades/evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, c.phone AS contact_phone, c.name AS contact_name
       FROM trade_evaluations e
       JOIN contacts c ON c.id = e.contact_id
       WHERE e.tenant_id = $1
       ORDER BY e.created_at DESC LIMIT 100`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar avaliações' });
  }
});

// GET /trades/evaluations/:id
router.get('/evaluations/:id', async (req, res) => {
  try {
    const evalResult = await query(
      `SELECT e.*, c.phone AS contact_phone, c.name AS contact_name
       FROM trade_evaluations e
       JOIN contacts c ON c.id = e.contact_id
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (evalResult.rows.length === 0) return res.status(404).json({ error: 'Avaliação não encontrada' });

    const deductions = await query(
      `SELECT * FROM trade_deductions WHERE evaluation_id = $1`,
      [req.params.id]
    );

    res.json({ ...evalResult.rows[0], deductions: deductions.rows });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar avaliação' });
  }
});

// PATCH /trades/evaluations/:id — aprovar ou rejeitar
router.patch('/evaluations/:id', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['approved','rejected','reviewing']),
      estimate: z.number().positive().optional(),
    });
    const data = schema.parse(req.body);

    const before = await query(`SELECT * FROM trade_evaluations WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    if (before.rows.length === 0) return res.status(404).json({ error: 'Avaliação não encontrada' });

    const fields = [`status = $1`, `reviewed_by = $2`, `updated_at = NOW()`];
    const values = [data.status, req.user.id];

    if (data.estimate !== undefined) { fields.push(`estimate = $${values.length + 1}`); values.push(data.estimate); }
    values.push(req.params.id, req.tenantId);

    const result = await query(
      `UPDATE trade_evaluations SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND tenant_id = $${values.length} RETURNING *`,
      values
    );

    await auditLog({ tenantId: req.tenantId, actor: req.user, action: `trade_evaluation_${data.status}`, entity: 'trade_evaluation', entityId: req.params.id, before: before.rows[0], after: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos' });
    res.status(500).json({ error: 'Erro ao atualizar avaliação' });
  }
});

// ─────────────────────────────────────────────
// IMPORTAÇÃO BULK DE REGRAS DE TROCA
// ─────────────────────────────────────────────

// POST /trades/import
// Body: { rules: [{ model, min_value, max_value, deductions: [{item, amount}] }] }
router.post('/import', requireRole('manager'), async (req, res) => {
  const { rules } = req.body;
  if (!Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ error: 'Lista de regras inválida' });
  }

  let inserted = 0;
  let skipped = 0;

  for (const rule of rules) {
    try {
      // Upsert trade_rules (por model + tenant)
      await query(
        `INSERT INTO trade_rules (tenant_id, model, base_value, min_value, max_value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [req.tenantId, rule.model, rule.max_value || 0, rule.min_value || 0, rule.max_value || 0]
      );

      // Remove deduções antigas deste modelo e insere as novas
      if (rule.deductions && rule.deductions.length > 0) {
        await query(
          `DELETE FROM trade_device_deductions WHERE tenant_id = $1 AND model = $2`,
          [req.tenantId, rule.model]
        );
        for (const ded of rule.deductions) {
          await query(
            `INSERT INTO trade_device_deductions (tenant_id, model, item, amount)
             VALUES ($1, $2, $3, $4)`,
            [req.tenantId, rule.model, ded.item, ded.amount]
          );
        }
      }
      inserted++;
    } catch (err) {
      console.warn('trade import skip:', rule.model, err.message);
      skipped++;
    }
  }

  res.json({ ok: true, inserted, skipped });
});

module.exports = router;
