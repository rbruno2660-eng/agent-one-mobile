const router = require('express').Router();
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

// Todos os endpoints exigem auth + role manager ou superior
router.use(authMiddleware, requireRole('manager'));

// GET /users
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, status, last_login, created_at
       FROM users WHERE tenant_id = $1 ORDER BY name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /users
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['admin','manager','seller','service','viewer']),
      phone: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);

    // Owner não pode criar outro owner
    if (data.role === 'owner') return res.status(403).json({ error: 'Não é possível criar usuário owner' });

    const hash = await bcrypt.hash(data.password, 12);
    const result = await query(
      `INSERT INTO users (tenant_id, name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, status, created_at`,
      [req.tenantId, data.name, data.email.toLowerCase().trim(), hash, data.role, data.phone || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PATCH /users/:id
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      role: z.enum(['admin','manager','seller','service','viewer']).optional(),
      status: z.enum(['active','inactive']).optional(),
      phone: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);

    const fields = [];
    const values = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
    if (data.role !== undefined) { fields.push(`role = $${i++}`); values.push(data.role); }
    if (data.status !== undefined) { fields.push(`status = $${i++}`); values.push(data.status); }
    if (data.phone !== undefined) { fields.push(`phone = $${i++}`); values.push(data.phone); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    values.push(req.params.id, req.tenantId);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i++} AND tenant_id = $${i}
       RETURNING id, name, email, phone, role, status`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos' });
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;
