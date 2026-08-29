const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

router.use(authMiddleware);
router.use(requireRole('manager'));

// GET /analytics/overview — métricas gerais
router.get('/overview', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { period = '30' } = req.query; // dias
    const days = Math.min(parseInt(period) || 30, 365);

    const [
      convsResult,
      msgsResult,
      handoffResult,
      leadsResult,
      topProductsResult,
      dailyResult,
    ] = await Promise.all([
      // Total conversas no período — $2 = dias (inteiro sanitizado)
      query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - ($2 * INTERVAL '1 day')) AS total,
          COUNT(*) FILTER (WHERE status = 'closed' AND created_at >= NOW() - ($2 * INTERVAL '1 day')) AS closed,
          COUNT(*) FILTER (WHERE status IN ('human_requested','human_active') AND created_at >= NOW() - ($2 * INTERVAL '1 day')) AS in_handoff
        FROM conversations WHERE tenant_id = $1
      `, [tid, days]),

      // Total mensagens
      query(`
        SELECT COUNT(*) AS total FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.tenant_id = $1 AND m.created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Taxa de handoff
      query(`
        SELECT COUNT(*) AS total FROM handoffs
        WHERE tenant_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Leads no funil
      query(`
        SELECT stage, COUNT(*) AS count FROM leads
        WHERE tenant_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY stage
      `, [tid, days]),

      // Produtos mais consultados via tool_calls
      query(`
        SELECT tc.input->>'product_id' AS product_id, p.model, p.storage, COUNT(*) AS queries
        FROM tool_calls tc
        JOIN conversations c ON c.id = tc.conversation_id
        LEFT JOIN products p ON p.id = (tc.input->>'product_id')::uuid
        WHERE c.tenant_id = $1
          AND tc.tool IN ('get_product_price','check_stock')
          AND tc.created_at >= NOW() - ($2 * INTERVAL '1 day')
          AND tc.input->>'product_id' IS NOT NULL
        GROUP BY tc.input->>'product_id', p.model, p.storage
        ORDER BY queries DESC LIMIT 5
      `, [tid, days]),

      // Conversas por dia (últimos 14 dias sempre, para o gráfico)
      query(`
        SELECT
          DATE(created_at) AS day,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed
        FROM conversations
        WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY day
      `, [tid]),
    ]);

    const convs = convsResult.rows[0];
    const total = parseInt(convs.total) || 0;
    const handoffTotal = parseInt(handoffResult.rows[0].total) || 0;

    res.json({
      period: days,
      conversations: {
        total,
        closed: parseInt(convs.closed) || 0,
        in_handoff: parseInt(convs.in_handoff) || 0,
        ai_resolution_rate: total > 0 ? Math.round(((total - handoffTotal) / total) * 100) : 0,
      },
      messages: { total: parseInt(msgsResult.rows[0].total) || 0 },
      handoffs: { total: handoffTotal },
      leads: leadsResult.rows.reduce((acc, r) => { acc[r.stage] = parseInt(r.count); return acc; }, {}),
      top_products: topProductsResult.rows,
      daily: dailyResult.rows.map(r => ({
        day: r.day,
        total: parseInt(r.total),
        closed: parseInt(r.closed),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar métricas' });
  }
});

module.exports = router;
