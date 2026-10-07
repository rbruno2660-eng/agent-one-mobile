/**
 * Rotas de Contatos — Agent One
 *
 * GET /contacts          — lista contatos com totais
 * GET /contacts/:id      — detalhe do contato
 * GET /contacts/:id/timeline — todas as conversas do contato com mensagens
 */

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /contacts — lista todos os contatos do tenant
router.get('/', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { search, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT
        c.id, c.phone, c.name, c.created_at,
        COUNT(DISTINCT cv.id)                        AS conversation_count,
        MAX(cv.updated_at)                           AS last_activity,
        COUNT(DISTINCT l.id)                         AS lead_count,
        MAX(l.stage)                                 AS last_stage
      FROM contacts c
      LEFT JOIN conversations cv ON cv.contact_id = c.id AND cv.tenant_id = $1
      LEFT JOIN leads l ON l.contact_id = c.id AND l.tenant_id = $1
      WHERE c.tenant_id = $1
    `;
    const values = [tid];
    let i = 2;

    if (search) {
      sql += ` AND (c.name ILIKE $${i} OR c.phone ILIKE $${i})`;
      values.push(`%${search}%`);
      i++;
    }

    sql += ` GROUP BY c.id ORDER BY last_activity DESC NULLS LAST LIMIT $${i} OFFSET $${i+1}`;
    values.push(parseInt(limit), offset);

    const [result, countResult] = await Promise.all([
      query(sql, values),
      query(
        `SELECT COUNT(*) FROM contacts WHERE tenant_id = $1${search ? ' AND (name ILIKE $2 OR phone ILIKE $2)' : ''}`,
        search ? [tid, `%${search}%`] : [tid]
      ),
    ]);

    res.json({
      contacts: result.rows.map(r => ({
        id: r.id,
        phone: r.phone,
        name: r.name,
        conversation_count: parseInt(r.conversation_count) || 0,
        lead_count: parseInt(r.lead_count) || 0,
        last_stage: r.last_stage,
        last_activity: r.last_activity,
        created_at: r.created_at,
      })),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[Contacts]', err.message);
    res.status(500).json({ error: 'Erro ao listar contatos' });
  }
});

// GET /contacts/:id — detalhe do contato
router.get('/:id', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { id } = req.params;

    const [contactRes, statsRes] = await Promise.all([
      query(`SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2`, [id, tid]),
      query(`
        SELECT
          COUNT(DISTINCT cv.id) AS conversations,
          COUNT(DISTINCT l.id)  AS leads,
          MAX(l.stage)          AS last_stage,
          SUM(l.value) FILTER (WHERE l.stage = 'won') AS total_won
        FROM contacts c
        LEFT JOIN conversations cv ON cv.contact_id = c.id
        LEFT JOIN leads l ON l.contact_id = c.id
        WHERE c.id = $1
      `, [id]),
    ]);

    if (!contactRes.rows.length) return res.status(404).json({ error: 'Contato não encontrado' });

    const contact = contactRes.rows[0];
    const stats = statsRes.rows[0];

    res.json({
      ...contact,
      stats: {
        conversations: parseInt(stats.conversations) || 0,
        leads: parseInt(stats.leads) || 0,
        last_stage: stats.last_stage,
        total_won: parseFloat(stats.total_won) || 0,
      },
    });
  } catch (err) {
    console.error('[Contacts/Detail]', err.message);
    res.status(500).json({ error: 'Erro ao buscar contato' });
  }
});

// GET /contacts/:id/timeline — todas as conversas com mensagens
router.get('/:id/timeline', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { id } = req.params;

    // Verifica o contato
    const contactRes = await query(
      `SELECT id, phone, name FROM contacts WHERE id = $1 AND tenant_id = $2`,
      [id, tid]
    );
    if (!contactRes.rows.length) return res.status(404).json({ error: 'Contato não encontrado' });

    // Todas as conversas do contato
    const convsRes = await query(`
      SELECT
        cv.id, cv.status, cv.created_at, cv.updated_at,
        l.id AS lead_id, l.stage AS lead_stage, l.score AS lead_score, l.value AS lead_value,
        p.model AS product_model, p.storage AS product_storage
      FROM conversations cv
      LEFT JOIN leads l ON l.contact_id = $1 AND l.tenant_id = $2
        AND l.id = (
          SELECT id FROM leads
          WHERE contact_id = $1 AND tenant_id = $2
            AND created_at <= cv.updated_at
          ORDER BY created_at DESC LIMIT 1
        )
      LEFT JOIN products p ON p.id = l.product_id
      WHERE cv.contact_id = $1 AND cv.tenant_id = $2
      ORDER BY cv.created_at DESC
    `, [id, tid]);

    // Carrega mensagens para cada conversa (últimas 50 por conversa)
    const conversations = await Promise.all(
      convsRes.rows.map(async (cv) => {
        const msgsRes = await query(`
          SELECT id, direction, type, content, created_at
          FROM messages
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          LIMIT 50
        `, [cv.id]);

        return {
          id: cv.id,
          status: cv.status,
          created_at: cv.created_at,
          updated_at: cv.updated_at,
          lead: cv.lead_id ? {
            id: cv.lead_id,
            stage: cv.lead_stage,
            score: cv.lead_score,
            value: cv.lead_value ? parseFloat(cv.lead_value) : null,
            product: cv.product_model
              ? `${cv.product_model}${cv.product_storage ? ' ' + cv.product_storage : ''}`
              : null,
          } : null,
          messages: msgsRes.rows,
          message_count: msgsRes.rows.length,
        };
      })
    );

    res.json({
      contact: contactRes.rows[0],
      conversations,
      total_conversations: conversations.length,
    });
  } catch (err) {
    console.error('[Contacts/Timeline]', err.message);
    res.status(500).json({ error: 'Erro ao gerar timeline' });
  }
});

module.exports = router;
