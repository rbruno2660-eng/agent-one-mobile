/**
 * AI Execution Log — Agent One
 *
 * Registra cada chamada ao modelo de IA com intent, tokens, custo e latência.
 * Gravar é fire-and-forget — nunca bloqueia a resposta ao usuário.
 *
 * Custo estimado (preços OpenAI, dez/2024):
 *   gpt-4o-mini: input $0.15/1M  output $0.60/1M
 *   gpt-4o:      input $5.00/1M  output $15.00/1M
 */

const { query } = require('../db/pool');

// Anthropic pricing (preços aproximados, dez/2024)
const COST_PER_TOKEN = {
  'claude-haiku-4-5-20251001':  { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  'claude-haiku-3':             { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  'claude-sonnet-4-5':          { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'claude-opus-4':              { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
  // fallback OpenAI (se migrar no futuro)
  'gpt-4o-mini':                { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4o':                     { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
};

/**
 * Estima custo em USD a partir dos tokens e do modelo.
 * @param {string} model
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number}
 */
function estimateCost(model, promptTokens, completionTokens) {
  const rates = COST_PER_TOKEN[model] || COST_PER_TOKEN['gpt-4o-mini'];
  return (promptTokens * rates.input) + (completionTokens * rates.output);
}

/**
 * Salva um registro de execução de IA no banco.
 * Fire-and-forget — erros de escrita são apenas logados, nunca propagados.
 *
 * @param {Object} opts
 * @param {string}  opts.tenantId
 * @param {string}  [opts.conversationId]
 * @param {string}  [opts.intent]           — intenção detectada ('greeting', 'product_query', etc.)
 * @param {string}  [opts.model]            — nome do modelo
 * @param {number}  [opts.promptTokens]
 * @param {number}  [opts.completionTokens]
 * @param {number}  [opts.totalTokens]
 * @param {number}  [opts.latencyMs]        — tempo de resposta em ms
 * @param {string}  [opts.result]           — 'success' | 'error' | 'fallback'
 * @param {string}  [opts.errorMessage]
 */
async function logAICall(opts) {
  try {
    const {
      tenantId,
      conversationId = null,
      intent = null,
      model = 'gpt-4o-mini',
      promptTokens = 0,
      completionTokens = 0,
      totalTokens,
      latencyMs = null,
      result = 'success',
      errorMessage = null,
    } = opts;

    const total = totalTokens ?? (promptTokens + completionTokens);
    const costUsd = estimateCost(model, promptTokens, completionTokens);

    await query(
      `INSERT INTO ai_logs
        (tenant_id, conversation_id, intent, model,
         prompt_tokens, completion_tokens, total_tokens, cost_usd,
         latency_ms, result, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        tenantId, conversationId, intent, model,
        promptTokens, completionTokens, total, costUsd,
        latencyMs, result, errorMessage,
      ]
    );
  } catch (err) {
    // Nunca propagamos erros de log para não interromper o fluxo
    console.warn('[AILog] Falha ao registrar execução:', err.message);
  }
}

/**
 * Retorna estatísticas agregadas dos logs de IA para um tenant.
 * @param {string} tenantId
 * @param {number} [days=30]
 */
async function getAIStats(tenantId, days = 30) {
  const result = await query(
    `SELECT
       COUNT(*)                              AS total_calls,
       SUM(total_tokens)                    AS total_tokens,
       SUM(cost_usd)                        AS total_cost_usd,
       AVG(latency_ms)                      AS avg_latency_ms,
       COUNT(*) FILTER (WHERE result='error')    AS errors,
       COUNT(*) FILTER (WHERE result='fallback') AS fallbacks,
       COUNT(DISTINCT conversation_id)      AS conversations_served,
       mode() WITHIN GROUP (ORDER BY intent) AS top_intent,
       mode() WITHIN GROUP (ORDER BY model)  AS top_model
     FROM ai_logs
     WHERE tenant_id = $1
       AND created_at >= NOW() - ($2 * INTERVAL '1 day')`,
    [tenantId, days]
  );
  return result.rows[0];
}

module.exports = { logAICall, getAIStats, estimateCost };
