/**
 * Rotas do painel Super Admin — Agent One
 * Todas protegidas por superadminMiddleware.
 * Nenhuma dessas rotas é acessível por usuários normais.
 */

const router = require('express').Router();
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');

// ──────────────────────────────────────────────
// GET /superadmin/tenants
// Lista todos os tenants com métricas básicas
// ──────────────────────────────────────────────
router.get('/tenants', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        t.id,
        t.name,
        t.niche,
        t.status,
        t.created_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_superadmin = false OR u.is_superadmin IS NULL) AS user_count,
        COUNT(DISTINCT c.id) AS channel_count,
        COUNT(DISTINCT cv.id) AS conversation_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      LEFT JOIN channels c ON c.tenant_id = t.id
      LEFT JOIN conversations cv ON cv.tenant_id = t.id
      GROUP BY t.id, t.name, t.niche, t.status, t.created_at
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /superadmin/tenants/:id
// Detalhe completo de um tenant
// ──────────────────────────────────────────────
router.get('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await query(`SELECT * FROM tenants WHERE id = $1`, [id]);
    if (!tenant.rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });

    const users = await query(
      `SELECT id, name, email, role, status, last_login FROM users WHERE tenant_id = $1 ORDER BY role`,
      [id]
    );

    const channel = await query(
      `SELECT id, provider, phone_id, phone_number, status FROM channels WHERE tenant_id = $1 LIMIT 1`,
      [id]
    );

    const metrics = await query(`
      SELECT
        (SELECT COUNT(*) FROM conversations WHERE tenant_id = $1) AS conversations,
        (SELECT COUNT(*) FROM messages WHERE tenant_id = $1) AS messages,
        (SELECT COUNT(*) FROM contacts WHERE tenant_id = $1) AS contacts,
        (SELECT COUNT(*) FROM products WHERE tenant_id = $1) AS products
    `, [id]);

    res.json({
      tenant: tenant.rows[0],
      users: users.rows,
      channel: channel.rows[0] || null,
      metrics: metrics.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /superadmin/tenants
// Cria novo tenant + usuário owner
// ──────────────────────────────────────────────
router.post('/tenants', async (req, res) => {
  try {
    const schema = z.object({
      tenantName: z.string().min(2),
      niche: z.string().default('mobile_store'),
      ownerName: z.string().min(2),
      ownerEmail: z.string().email(),
      ownerPassword: z.string().min(8),
    });
    const { tenantName, niche, ownerName, ownerEmail, ownerPassword } = schema.parse(req.body);

    const client = await require('../db/pool').pool.connect();
    try {
      await client.query('BEGIN');

      const tenantResult = await client.query(
        `INSERT INTO tenants (name, niche, status) VALUES ($1, $2, 'active') RETURNING id`,
        [tenantName, niche]
      );
      const tenantId = tenantResult.rows[0].id;

      const hash = await bcrypt.hash(ownerPassword, 12);
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, name, email, password, role, status)
         VALUES ($1, $2, $3, $4, 'owner', 'active') RETURNING id`,
        [tenantId, ownerName, ownerEmail.toLowerCase().trim(), hash]
      );

      await client.query('COMMIT');
      res.status(201).json({
        tenantId,
        userId: userResult.rows[0].id,
        message: 'Tenant e owner criados com sucesso',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PATCH /superadmin/tenants/:id/status
// Suspender ou reativar tenant
// ──────────────────────────────────────────────
router.patch('/tenants/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['active', 'suspended', 'cancelled']),
    }).parse(req.body);

    const result = await query(
      `UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Status inválido' });
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /superadmin/tenants/:id/reset-owner-password
// Reseta a senha do owner sem precisar da senha atual
// ──────────────────────────────────────────────
router.post('/tenants/:id/reset-owner-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);

    const owner = await query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role = 'owner' AND status = 'active' LIMIT 1`,
      [id]
    );
    if (!owner.rows.length) return res.status(404).json({ error: 'Owner não encontrado' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, owner.rows[0].id]);

    // Revoga refresh tokens do owner
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [owner.rows[0].id]);

    res.json({ ok: true, message: 'Senha do owner resetada com sucesso' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos' });
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /superadmin/tenants/:id/activate
// Ativa/atualiza canal WhatsApp e cria agente
// ──────────────────────────────────────────────
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      phone_id: z.string().min(1),
      phone_number: z.string().min(1),
      whatsapp_token: z.string().min(10),
    });
    const { phone_id, phone_number, whatsapp_token } = schema.parse(req.body);

    const tenant = await query(`SELECT id FROM tenants WHERE id = $1`, [id]);
    if (!tenant.rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });

    // Upsert canal WhatsApp
    const existing = await query(`SELECT id FROM channels WHERE tenant_id = $1 LIMIT 1`, [id]);
    if (existing.rows.length > 0) {
      await query(
        `UPDATE channels
         SET phone_id = $1, phone_number = $2, status = 'active',
             settings = settings || $3::jsonb, updated_at = NOW()
         WHERE tenant_id = $4`,
        [phone_id, phone_number, JSON.stringify({ access_token: whatsapp_token }), id]
      );
    } else {
      await query(
        `INSERT INTO channels (tenant_id, provider, phone_id, phone_number, status, settings)
         VALUES ($1, 'whatsapp', $2, $3, 'active', $4::jsonb)`,
        [id, phone_id, phone_number, JSON.stringify({ access_token: whatsapp_token })]
      );
    }

    // Cria agent row se ainda não existir
    const agentExists = await query(`SELECT id FROM agents WHERE tenant_id = $1`, [id]);
    if (!agentExists.rows.length) {
      await query(
        `INSERT INTO agents (tenant_id, name, persona, tone, status)
         VALUES ($1, 'Sofia', 'Atendente virtual especialista em celulares e acessórios', 'professional', 'active')`,
        [id]
      );
    }

    res.json({ ok: true, message: 'Cliente ativado com sucesso' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /superadmin/tenants/:id/metrics
// Métricas de uso dos últimos 30 dias
// ──────────────────────────────────────────────
router.get('/tenants/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT
        COUNT(DISTINCT cv.id) FILTER (WHERE cv.created_at >= NOW() - INTERVAL '30 days') AS conversations_30d,
        COUNT(DISTINCT m.id)  FILTER (WHERE m.created_at  >= NOW() - INTERVAL '30 days') AS messages_30d,
        COUNT(DISTINCT cv.id) AS conversations_total,
        COUNT(DISTINCT m.id)  AS messages_total
      FROM conversations cv
      LEFT JOIN messages m ON m.conversation_id = cv.id
      WHERE cv.tenant_id = $1
    `, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
