/**
 * Rota de funil de conversas — Feature 3.
 * GET /pipeline — agrupa conversas por estágio do lead (kanban).
 */

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authMiddleware);

// Mapeamento de estágio do lead → coluna do funil
const STAGE_COLUMNS = ['interesse', 'qualificado', 'negociacao', 'fechamento', 'pos_venda'];

const STAGE_MAP = {
  new:        'interesse',
  qualifying: 'qualificado',
  interested: 'qualificado',
  contacted:  'interesse',
  negotiating:'negociacao',
  won:        'fechamento',
  // pos_venda é populado pelas reativações (reactivation_queue)
};

/**
 * GET /pipeline
 * Retorna um objeto com as colunas do funil e as conversas em cada uma.
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Busca todas as conversas abertas com info de contato e lead
    const result = await query(`
      SELECT
        c.id              AS conversation_id,
        c.status          AS conversation_status,
        c.last_message_at,
        c.created_at      AS conversation_created_at,
        ct.name           AS contact_name,
        ct.phone          AS contact_phone,
        l.id              AS lead_id,
        l.stage           AS lead_stage,
        p.model           AS product_model,
        p.variant         AS product_variant,
        p.storage         AS product_storage,
        (
          SELECT content FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message_preview,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_message_at, c.created_at))) AS seconds_since_last
      FROM conversations c
      JOIN contacts ct ON ct.id = c.contact_id
      LEFT JOIN leads l ON l.conversation_id = c.id AND l.tenant_id = c.tenant_id
      LEFT JOIN products p ON p.id = l.product_id
      WHERE c.tenant_id = $1
        AND c.status NOT IN ('closed')
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 500
    `, [tenantId]);

    // Também busca reativações pendentes (pos_venda)
    const reactivations = await query(`
      SELECT
        rq.id             AS reactivation_id,
        rq.conversation_id,
        rq.scheduled_for,
        ct.name           AS contact_name,
        ct.phone          AS contact_phone
      FROM reactivation_queue rq
      JOIN contacts ct ON ct.id = rq.contact_id
      WHERE rq.tenant_id = $1
        AND rq.status = 'pending'
      LIMIT 100
    `, [tenantId]).catch(() => ({ rows: [] }));

    // Monta pipeline por coluna
    const pipeline = {};
    for (const col of STAGE_COLUMNS) {
      pipeline[col] = [];
    }

    for (const row of result.rows) {
      const funnelCol = STAGE_MAP[row.lead_stage] || 'interesse';
      const secondsSince = Math.floor(row.seconds_since || row.seconds_since_last || 0);
      const urgency = secondsSince < 3600 ? 'green' : secondsSince < 14400 ? 'yellow' : 'red';

      pipeline[funnelCol].push({
        conversation_id:    row.conversation_id,
        conversation_status:row.conversation_status,
        contact_name:       row.contact_name || row.contact_phone,
        contact_phone:      row.contact_phone,
        lead_id:            row.lead_id,
        lead_stage:         row.lead_stage,
        product:            [row.product_model, row.product_variant, row.product_storage].filter(Boolean).join(' ') || null,
        last_message_preview: row.last_message_preview
          ? row.last_message_preview.substring(0, 120)
          : null,
        seconds_since_last: secondsSince,
        urgency,
      });
    }

    // Coluna pos_venda: reativações pendentes
    for (const r of reactivations.rows) {
      pipeline.pos_venda.push({
        conversation_id: r.conversation_id,
        conversation_status: 'reactivation_pending',
        contact_name:  r.contact_name || r.contact_phone,
        contact_phone: r.contact_phone,
        scheduled_for: r.scheduled_for,
        urgency: 'green',
      });
    }

    res.json({
      columns: STAGE_COLUMNS,
      pipeline,
      totals: Object.fromEntries(STAGE_COLUMNS.map(c => [c, pipeline[c].length])),
    });
  } catch (err) {
    console.error('[Pipeline] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao carregar funil' });
  }
});

module.exports = router;
