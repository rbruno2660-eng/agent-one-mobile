/**
 * Rotas de campanhas ativas — Feature 4.
 */

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');
const { sendCampaign, addContactsToCampaign } = require('../services/campaign.service');

router.use(authMiddleware);

// POST /campaigns — cria campanha
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const { name, message_template, scheduled_at } = req.body;
    if (!name?.trim() || !message_template?.trim()) {
      return res.status(400).json({ error: 'name e message_template são obrigatórios' });
    }

    const result = await query(
      `INSERT INTO campaigns (tenant_id, name, message_template, status, scheduled_at)
       VALUES ($1, $2, $3, 'draft', $4) RETURNING *`,
      [req.tenantId, name.trim(), message_template.trim(), scheduled_at || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// GET /campaigns — lista campanhas do tenant
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) AS total_contacts
       FROM campaigns c
       WHERE c.tenant_id = $1
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar campanhas' });
  }
});

// GET /campaigns/:id — detalhe de campanha
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar campanha' });
  }
});

// GET /campaigns/:id/contacts — lista contatos da campanha
router.get('/:id/contacts', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, phone, name, status, sent_at, error_message
       FROM campaign_contacts
       WHERE campaign_id = $1
       ORDER BY created_at ASC
       LIMIT 500`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contatos' });
  }
});

// POST /campaigns/:id/contacts — importa lista de contatos
router.post('/:id/contacts', requireRole('manager'), async (req, res) => {
  try {
    // Aceita { contacts: [{phone, name}] } ou { phones: ['551199...'] }
    let contacts = req.body.contacts;
    if (!contacts && Array.isArray(req.body.phones)) {
      contacts = req.body.phones.map(p => ({ phone: String(p).trim() }));
    }
    if (!Array.isArray(contacts) || !contacts.length) {
      return res.status(400).json({ error: 'Envie contacts:[{phone,name}] ou phones:[...]' });
    }

    // Valida que a campanha pertence ao tenant
    const camp = await query(
      `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!camp.rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });

    const count = await addContactsToCampaign(req.params.id, contacts);
    res.json({ ok: true, imported: count });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar contatos: ' + err.message });
  }
});

// POST /campaigns/:id/send — dispara campanha imediatamente
router.post('/:id/send', requireRole('manager'), async (req, res) => {
  try {
    // Valida que a campanha pertence ao tenant antes de disparar
    const camp = await query(
      `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!camp.rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });

    // Dispara de forma assíncrona (não bloqueia o HTTP)
    setImmediate(async () => {
      try {
        await sendCampaign(req.tenantId, req.params.id);
      } catch (err) {
        console.error('[Campaign] Erro ao enviar campanha:', err.message);
        await query(
          `UPDATE campaigns SET status = 'failed', updated_at = NOW() WHERE id = $1`,
          [req.params.id]
        ).catch(() => {});
      }
    });

    res.json({ ok: true, message: 'Campanha iniciada em background' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao disparar campanha' });
  }
});

// GET /campaigns/:id/stats — estatísticas
router.get('/:id/stats', async (req, res) => {
  try {
    const [camp, stats] = await Promise.all([
      query(`SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]),
      query(
        `SELECT status, COUNT(*) AS count FROM campaign_contacts
         WHERE campaign_id = $1 GROUP BY status`,
        [req.params.id]
      ),
    ]);

    if (!camp.rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });

    const breakdown = {};
    for (const row of stats.rows) breakdown[row.status] = parseInt(row.count);

    res.json({
      campaign: camp.rows[0],
      breakdown,
      total: Object.values(breakdown).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// DELETE /campaigns/:id — remove campanha (apenas draft)
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2 AND status = 'draft' RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Campanha não encontrada ou não pode ser removida' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover campanha' });
  }
});

module.exports = router;
