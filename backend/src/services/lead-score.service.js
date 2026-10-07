/**
 * Lead Score Engine — Agent One
 *
 * Calcula um score (0-100) e temperatura para cada lead com base em:
 *   - Estágio no funil (peso principal)
 *   - Recência da última interação
 *   - Produto identificado
 *   - Engajamento (follow-ups enviados × resposta)
 *   - Notas preenchidas pelo vendedor
 *
 * Temperature:
 *   🔥 Quente  — score >= 70
 *   ☀️  Morno   — score >= 40
 *   🧊 Frio    — score < 40
 */

const STAGE_BASE = {
  new:          10,
  contacted:    20,
  qualifying:   30,
  interested:   42,
  negotiating:  55,
  quoted:       60,
  won:         100,
  lost:          0,
};

/**
 * @param {Object} lead — linha da tabela leads (com updated_at, stage, product_id, notes, follow_up_count)
 * @returns {{ score: number, temperature: 'hot'|'warm'|'cold'|'won'|'lost' }}
 */
function calculateScore(lead) {
  // Casos determinísticos
  if (lead.stage === 'won')  return { score: 100, temperature: 'won' };
  if (lead.stage === 'lost') return { score: 0,   temperature: 'lost' };

  let score = STAGE_BASE[lead.stage] ?? 10;

  // ── Recência ────────────────────────────────────────────────────────────────
  const hoursAgo = (Date.now() - new Date(lead.updated_at).getTime()) / 3_600_000;
  if      (hoursAgo < 2)   score += 25;
  else if (hoursAgo < 24)  score += 18;
  else if (hoursAgo < 72)  score += 10;
  else if (hoursAgo < 168) score += 4;
  // > 7 dias: sem bônus de recência

  // ── Produto identificado ────────────────────────────────────────────────────
  if (lead.product_id) score += 8;

  // ── Notas (vendedor tomou iniciativa) ───────────────────────────────────────
  if (lead.notes && lead.notes.trim().length > 0) score += 4;

  // ── Valor estimado definido ──────────────────────────────────────────────────
  if (lead.value && parseFloat(lead.value) > 0) score += 6;

  // ── Follow-ups: muitos sem resposta = esfriando ──────────────────────────────
  const fu = lead.follow_up_count || 0;
  if      (fu === 0) score += 3;   // lead fresco, ainda não precisou de follow-up
  else if (fu === 1) score += 1;   // um toque, pode estar quente
  else if (fu === 2) score -= 4;   // dois sem resposta: esfriando
  else               score -= 10;  // três+: provavelmente frio

  // Cap
  const finalScore = Math.min(99, Math.max(1, Math.round(score)));

  // Temperatura
  let temperature;
  if      (finalScore >= 70) temperature = 'hot';
  else if (finalScore >= 40) temperature = 'warm';
  else                       temperature = 'cold';

  return { score: finalScore, temperature };
}

/**
 * Recalcula e persiste o score no banco para um lead específico.
 * Temperature é computada em memória — não há coluna no DB para ela.
 * Chame isto após qualquer mutação relevante (stage change, follow-up enviado).
 *
 * @param {Function} query — db/pool.query
 * @param {string} leadId
 * @param {string} tenantId
 * @returns {{ score: number, temperature: string } | null}
 */
async function rescoreLead(query, leadId, tenantId) {
  const result = await query(
    `SELECT stage, updated_at, product_id, notes, follow_up_count
     FROM leads WHERE id = $1 AND tenant_id = $2`,
    [leadId, tenantId]
  );
  if (!result.rows.length) return null;

  const lead = result.rows[0];
  const { score, temperature } = calculateScore(lead);

  // Persiste apenas o score (temperature é derivada, sem coluna no DB)
  await query(
    `UPDATE leads SET score = $1 WHERE id = $2 AND tenant_id = $3`,
    [score, leadId, tenantId]
  );

  return { score, temperature };
}

/**
 * Enriquece um array de leads com score live + temperature computados em memória.
 * Não escreve no banco — use rescoreLead para persistir.
 *
 * @param {Object[]} leads — rows direto do banco
 * @returns {Object[]} leads com score e temperature atualizados
 */
function enrichLeads(leads) {
  return leads.map(lead => {
    const { score, temperature } = calculateScore(lead);
    return { ...lead, score, temperature };
  });
}

module.exports = { calculateScore, rescoreLead, enrichLeads };
