const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authMiddleware);

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

// ─────────────────────────────────────────────────────────────────
// GET /analytics/intelligence — painel de inteligência comercial
// ─────────────────────────────────────────────────────────────────
router.get('/intelligence', async (req, res) => {
  try {
    const tid = req.tenantId;

    const [
      highConversionGap,
      topTradeIns,
      peakHours,
      hotLeads,
    ] = await Promise.all([

      // 1. Produtos mais consultados que não converteram (leads sem stage 'won')
      //    Alta consulta + baixa conversão = pode precisar revisar preço ou estoque
      query(`
        SELECT
          p.id,
          p.model,
          p.storage,
          p.current_price,
          COUNT(DISTINCT l.id) AS total_leads,
          COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'won') AS converted,
          COUNT(DISTINCT l.id) FILTER (WHERE l.stage NOT IN ('won','lost')) AS active_leads,
          ROUND(
            100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'won')
            / NULLIF(COUNT(DISTINCT l.id), 0), 1
          ) AS conversion_rate
        FROM products p
        LEFT JOIN leads l ON l.product_id = p.id AND l.tenant_id = $1
        WHERE p.tenant_id = $1 AND p.active = true
        GROUP BY p.id, p.model, p.storage, p.current_price
        HAVING COUNT(DISTINCT l.id) >= 2
        ORDER BY total_leads DESC, conversion_rate ASC NULLS LAST
        LIMIT 10
      `, [tid]),

      // 2. Modelos de trade-in mais recebidos nos últimos 30 dias
      //    Indica quais modelos estão entrando — sugere estoque para revenda
      query(`
        SELECT
          te.device_model AS model,
          te.device_storage AS storage,
          COUNT(*) AS total_evaluations,
          COUNT(*) FILTER (WHERE te.status = 'approved') AS approved,
          AVG(te.estimate) AS avg_value
        FROM trade_evaluations te
        WHERE te.tenant_id = $1
          AND te.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY te.device_model, te.device_storage
        ORDER BY total_evaluations DESC
        LIMIT 10
      `, [tid]),

      // 3. Horários de pico de atendimento (hora UTC-3, últimos 30 dias)
      query(`
        SELECT
          EXTRACT(HOUR FROM m.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
          COUNT(*) AS message_count
        FROM messages m
        WHERE m.tenant_id = $1
          AND m.direction = 'inbound'
          AND m.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `, [tid]),

      // 4. Leads quentes do dia — alta intenção, sem contato recente
      query(`
        SELECT
          l.id,
          l.score,
          l.stage,
          l.follow_up_count,
          l.last_follow_up_at,
          ct.name AS contact_name,
          ct.phone AS contact_phone,
          p.model AS product_model,
          p.storage AS product_storage,
          p.current_price,
          COALESCE(
            (SELECT MAX(m.created_at) FROM messages m
             JOIN conversations c2 ON c2.id = m.conversation_id
             WHERE c2.contact_id = ct.id AND c2.tenant_id = $1),
            l.created_at
          ) AS last_activity
        FROM leads l
        JOIN contacts ct ON ct.id = l.contact_id
        LEFT JOIN products p ON p.id = l.product_id
        WHERE l.tenant_id = $1
          AND l.stage NOT IN ('won', 'lost')
          AND l.score >= 50
        ORDER BY l.score DESC, last_activity ASC
        LIMIT 10
      `, [tid]),
    ]);

    // Processa horários de pico — retorna array de 24 posições
    const peakHoursArr = Array.from({ length: 24 }, (_, h) => {
      const row = peakHours.rows.find(r => parseInt(r.hour) === h);
      return { hour: h, count: row ? parseInt(row.message_count) : 0 };
    });
    const maxMessages = Math.max(...peakHoursArr.map(h => h.count), 1);
    const peakHoursNormalized = peakHoursArr.map(h => ({
      ...h,
      peak: h.count === maxMessages,
    }));

    res.json({
      high_conversion_gap: highConversionGap.rows.map(r => ({
        id: r.id,
        model: r.model,
        storage: r.storage,
        price: parseFloat(r.current_price) || null,
        total_leads: parseInt(r.total_leads),
        converted: parseInt(r.converted),
        active_leads: parseInt(r.active_leads),
        conversion_rate: parseFloat(r.conversion_rate) || 0,
        alert: parseInt(r.total_leads) >= 5 && parseFloat(r.conversion_rate) < 20
          ? 'Muitas consultas, poucos fechamentos. Revise o preço ou estoque.'
          : null,
      })),
      top_trade_ins: topTradeIns.rows.map(r => ({
        model: r.model,
        storage: r.storage,
        total: parseInt(r.total_evaluations),
        approved: parseInt(r.approved),
        avg_value: r.avg_value ? parseFloat(r.avg_value).toFixed(0) : null,
      })),
      peak_hours: peakHoursNormalized,
      hot_leads: hotLeads.rows.map(r => ({
        id: r.id,
        score: r.score,
        stage: r.stage,
        contact: { name: r.contact_name, phone: r.contact_phone },
        product: r.product_model ? `${r.product_model}${r.product_storage ? ' ' + r.product_storage : ''}` : null,
        price: r.current_price ? parseFloat(r.current_price) : null,
        last_activity: r.last_activity,
        follow_up_count: r.follow_up_count,
        days_inactive: Math.floor((Date.now() - new Date(r.last_activity).getTime()) / 86400000),
      })),
    });
  } catch (err) {
    console.error('[Intelligence]', err);
    res.status(500).json({ error: 'Erro ao gerar inteligência comercial' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /analytics/comercial — dashboard de receita e pipeline
// ─────────────────────────────────────────────────────────────────
router.get('/comercial', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);

    const [
      pipelineResult,
      conversionResult,
      topLeadsResult,
    ] = await Promise.all([

      // Pipeline por estágio: contagem e soma de valor estimado
      query(`
        SELECT
          stage,
          COUNT(*)               AS count,
          COALESCE(SUM(value), 0) AS pipeline_value,
          COALESCE(AVG(NULLIF(value,0)), 0) AS avg_value
        FROM leads
        WHERE tenant_id = $1
          AND stage NOT IN ('lost')
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY stage
      `, [tid, days]),

      // Conversão: won vs total (exceto lost, para não distorcer)
      query(`
        SELECT
          COUNT(*) FILTER (WHERE stage = 'won')  AS won,
          COUNT(*) FILTER (WHERE stage = 'lost') AS lost,
          COUNT(*)                                AS total,
          COALESCE(SUM(value) FILTER (WHERE stage = 'won'), 0) AS receita_realizada,
          COALESCE(AVG(NULLIF(value,0)) FILTER (WHERE stage = 'won'), 0) AS ticket_medio
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Top 5 leads quentes com valor
      query(`
        SELECT
          l.id, l.stage, l.score, l.value,
          c.name AS contact_name, c.phone AS contact_phone,
          p.model AS product_model
        FROM leads l
        JOIN contacts c ON c.id = l.contact_id
        LEFT JOIN products p ON p.id = l.product_id
        WHERE l.tenant_id = $1
          AND l.stage NOT IN ('won','lost')
          AND l.score >= 40
        ORDER BY l.score DESC, l.value DESC NULLS LAST
        LIMIT 5
      `, [tid]),
    ]);

    const conv = conversionResult.rows[0];
    const totalLeads = parseInt(conv.total) || 0;
    const wonLeads   = parseInt(conv.won)   || 0;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Soma o pipeline total (todos os estágios ativos)
    const pipeline = pipelineResult.rows.reduce((acc, r) => {
      acc[r.stage] = {
        count: parseInt(r.count),
        value: parseFloat(r.pipeline_value),
        avg: parseFloat(r.avg_value),
      };
      return acc;
    }, {});

    const pipelineTotal = pipelineResult.rows
      .reduce((sum, r) => sum + parseFloat(r.pipeline_value), 0);

    res.json({
      period: days,
      pipeline,
      pipeline_total: pipelineTotal,
      receita_realizada: parseFloat(conv.receita_realizada) || 0,
      ticket_medio: parseFloat(conv.ticket_medio) || 0,
      conversion_rate: conversionRate,
      leads: { total: totalLeads, won: wonLeads, lost: parseInt(conv.lost) || 0 },
      hot_leads: topLeadsResult.rows,
    });
  } catch (err) {
    console.error('[Analytics/Comercial]', err.message);
    res.status(500).json({ error: 'Erro ao gerar métricas comerciais' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /analytics/ai-logs — uso e custo de IA por período
// ─────────────────────────────────────────────────────────────────
router.get('/ai-logs', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);

    const [summaryResult, dailyResult, intentResult] = await Promise.all([
      // Resumo geral
      query(`
        SELECT
          COUNT(*)                                       AS total_calls,
          SUM(total_tokens)                              AS total_tokens,
          ROUND(SUM(cost_usd)::numeric, 4)               AS total_cost_usd,
          ROUND(AVG(latency_ms)::numeric, 0)             AS avg_latency_ms,
          COUNT(*) FILTER (WHERE result = 'error')       AS errors,
          COUNT(*) FILTER (WHERE result = 'fallback')    AS fallbacks,
          COUNT(DISTINCT conversation_id)                AS conversations_served
        FROM ai_logs
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Custo por dia (últimos 14 dias)
      query(`
        SELECT
          DATE(created_at)              AS day,
          COUNT(*)                      AS calls,
          SUM(total_tokens)             AS tokens,
          ROUND(SUM(cost_usd)::numeric, 4) AS cost_usd
        FROM ai_logs
        WHERE tenant_id = $1
          AND created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY day
      `, [tid]),

      // Top intents
      query(`
        SELECT
          COALESCE(intent, 'desconhecido') AS intent,
          COUNT(*) AS total
        FROM ai_logs
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY intent
        ORDER BY total DESC
        LIMIT 8
      `, [tid, days]),
    ]);

    const summary = summaryResult.rows[0];

    res.json({
      period: days,
      summary: {
        total_calls:          parseInt(summary.total_calls)          || 0,
        total_tokens:         parseInt(summary.total_tokens)         || 0,
        total_cost_usd:       parseFloat(summary.total_cost_usd)     || 0,
        avg_latency_ms:       parseInt(summary.avg_latency_ms)       || 0,
        errors:               parseInt(summary.errors)               || 0,
        fallbacks:            parseInt(summary.fallbacks)            || 0,
        conversations_served: parseInt(summary.conversations_served) || 0,
      },
      daily: dailyResult.rows.map(r => ({
        day:      r.day,
        calls:    parseInt(r.calls),
        tokens:   parseInt(r.tokens),
        cost_usd: parseFloat(r.cost_usd) || 0,
      })),
      top_intents: intentResult.rows.map(r => ({
        intent: r.intent,
        total:  parseInt(r.total),
      })),
    });
  } catch (err) {
    console.error('[Analytics/AILogs]', err.message);
    res.status(500).json({ error: 'Erro ao gerar log de IA' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /analytics/report — dados completos para relatório PDF
// ─────────────────────────────────────────────────────────────────
router.get('/report', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);

    const [
      convRes, leadsRes, comercialRes, aiRes, topProductsRes, tenantRes,
    ] = await Promise.all([
      // Conversas
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed,
          COUNT(*) FILTER (WHERE status IN ('human_requested','human_active')) AS in_handoff,
          COUNT(*) FILTER (WHERE status = 'ai_active') AS ai_active
        FROM conversations
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Leads por estágio
      query(`
        SELECT stage, COUNT(*) AS total, SUM(value) AS total_value
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY stage
        ORDER BY total DESC
      `, [tid, days]),

      // Comercial: receita e conversão
      query(`
        SELECT
          COUNT(*) FILTER (WHERE stage = 'won') AS won,
          COUNT(*) FILTER (WHERE stage = 'lost') AS lost,
          COUNT(*) FILTER (WHERE stage NOT IN ('won','lost')) AS active,
          COALESCE(SUM(value) FILTER (WHERE stage = 'won'), 0) AS receita,
          COALESCE(AVG(value) FILTER (WHERE stage = 'won' AND value > 0), 0) AS ticket_medio,
          COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('won','lost')), 0) AS pipeline
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // IA
      query(`
        SELECT
          COUNT(*) AS total_calls,
          SUM(total_tokens) AS total_tokens,
          SUM(cost_usd) AS total_cost,
          AVG(latency_ms) AS avg_latency,
          COUNT(DISTINCT conversation_id) AS conversations_served
        FROM ai_logs
        WHERE tenant_id = $1
          AND created_at >= NOW() - ($2 * INTERVAL '1 day')
      `, [tid, days]),

      // Top 5 produtos mais consultados
      query(`
        SELECT p.model, p.storage, COUNT(l.id) AS leads_count
        FROM leads l
        JOIN products p ON p.id = l.product_id
        WHERE l.tenant_id = $1
          AND l.created_at >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY p.model, p.storage
        ORDER BY leads_count DESC
        LIMIT 5
      `, [tid, days]),

      // Nome do tenant
      query(`SELECT name FROM tenants WHERE id = $1`, [tid]),
    ]);

    const com = comercialRes.rows[0] || {};
    const ai  = aiRes.rows[0] || {};
    const conv = convRes.rows[0] || {};
    const totalLeads = leadsRes.rows.reduce((s, r) => s + parseInt(r.total), 0);
    const wonCount = parseInt(com.won) || 0;
    const total = wonCount + (parseInt(com.lost) || 0);

    res.json({
      tenant:   { name: tenantRes.rows[0]?.name || 'Loja' },
      period:   days,
      generated_at: new Date().toISOString(),

      conversations: {
        total:      parseInt(conv.total)      || 0,
        closed:     parseInt(conv.closed)     || 0,
        in_handoff: parseInt(conv.in_handoff) || 0,
        ai_active:  parseInt(conv.ai_active)  || 0,
      },

      comercial: {
        won:         wonCount,
        lost:        parseInt(com.lost)   || 0,
        active:      parseInt(com.active) || 0,
        receita:     parseFloat(com.receita)     || 0,
        ticket_medio: parseFloat(com.ticket_medio) || 0,
        pipeline:    parseFloat(com.pipeline)    || 0,
        conversion_rate: total > 0 ? ((wonCount / total) * 100).toFixed(1) : '0.0',
        total_leads: totalLeads,
      },

      ia: {
        total_calls:          parseInt(ai.total_calls)          || 0,
        total_tokens:         parseInt(ai.total_tokens)         || 0,
        total_cost_usd:       parseFloat(ai.total_cost)         || 0,
        avg_latency_ms:       parseInt(ai.avg_latency)          || 0,
        conversations_served: parseInt(ai.conversations_served) || 0,
      },

      leads_by_stage: leadsRes.rows.map(r => ({
        stage:       r.stage,
        total:       parseInt(r.total),
        total_value: parseFloat(r.total_value) || 0,
      })),

      top_products: topProductsRes.rows.map(r => ({
        model:       r.model,
        storage:     r.storage,
        leads_count: parseInt(r.leads_count),
      })),
    });
  } catch (err) {
    console.error('[Analytics/Report]', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
