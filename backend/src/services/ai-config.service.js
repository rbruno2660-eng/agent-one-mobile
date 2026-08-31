const { query } = require('../db/pool');

const DEFAULT_OFFLINE_MSG = 'Olá! No momento estamos fora do horário de atendimento. Em breve retornaremos! 🕐';

/**
 * Busca (ou cria) a config de IA do tenant.
 */
async function getConfig(tenantId) {
  let result = await query(
    `SELECT * FROM ai_config WHERE tenant_id = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    result = await query(
      `INSERT INTO ai_config (tenant_id) VALUES ($1) RETURNING *`,
      [tenantId]
    );
  }

  const config = result.rows[0];

  const slots = await query(
    `SELECT * FROM ai_schedule_slots WHERE tenant_id = $1 ORDER BY day_of_week`,
    [tenantId]
  );

  return { ...config, slots: slots.rows };
}

/**
 * Retorna true se a IA deve responder agora.
 * Ordem de prioridade:
 *   1. pause_until (pausa temporária) — desativa independente de tudo
 *   2. manual_override ('active' | 'inactive') — sobrescreve modo
 *   3. mode: 'always_on' | 'always_off' | 'scheduled'
 */
async function isAIActive(tenantId) {
  const config = await getConfig(tenantId);

  // 1. Pausa temporária ainda vigente?
  if (config.pause_until && new Date(config.pause_until) > new Date()) {
    return false;
  }

  // 2. Override manual
  if (config.manual_override === 'active') return true;
  if (config.manual_override === 'inactive') return false;

  // 3. Modo
  if (config.mode === 'always_on') return true;
  if (config.mode === 'always_off') return false;

  // 4. Modo agendado — compara hora atual com slots
  if (config.mode === 'scheduled') {
    const tz = config.timezone || 'America/Sao_Paulo';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const dayOfWeek = now.getDay(); // 0=Dom … 6=Sab
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const slot = config.slots.find(s => parseInt(s.day_of_week) === dayOfWeek && s.active);
    if (!slot) return false;

    const start = String(slot.start_time).slice(0, 5);
    const end   = String(slot.end_time).slice(0, 5);
    return currentTime >= start && currentTime < end;
  }

  return true;
}

/**
 * Atualiza campos da config (patch parcial).
 */
async function updateConfig(tenantId, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  if (updates.mode !== undefined)            { fields.push(`mode = $${i++}`);            values.push(updates.mode); }
  if (updates.manual_override !== undefined) { fields.push(`manual_override = $${i++}`); values.push(updates.manual_override); }
  if (updates.pause_until !== undefined)     { fields.push(`pause_until = $${i++}`);     values.push(updates.pause_until); }
  if (updates.offline_message !== undefined) { fields.push(`offline_message = $${i++}`); values.push(updates.offline_message); }
  if (updates.timezone !== undefined)        { fields.push(`timezone = $${i++}`);        values.push(updates.timezone); }

  if (fields.length === 0) return getConfig(tenantId);

  fields.push(`updated_at = NOW()`);
  values.push(tenantId);

  // Upsert: garante que a linha existe
  await query(
    `INSERT INTO ai_config (tenant_id) VALUES ($${i}) ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId]
  );

  await query(
    `UPDATE ai_config SET ${fields.join(', ')} WHERE tenant_id = $${i}`,
    values
  );

  return getConfig(tenantId);
}

/**
 * Substitui completamente os slots de agenda do tenant.
 */
async function updateSchedule(tenantId, slots) {
  await query(`DELETE FROM ai_schedule_slots WHERE tenant_id = $1`, [tenantId]);

  for (const slot of slots) {
    if (slot.start_time && slot.end_time) {
      await query(
        `INSERT INTO ai_schedule_slots (tenant_id, day_of_week, start_time, end_time, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, slot.day_of_week, slot.start_time, slot.end_time, slot.active !== false]
      );
    }
  }

  return getConfig(tenantId);
}

/**
 * Busca mensagem offline do tenant (com fallback).
 */
async function getOfflineMessage(tenantId) {
  const result = await query(
    `SELECT offline_message FROM ai_config WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows[0]?.offline_message || DEFAULT_OFFLINE_MSG;
}

module.exports = { getConfig, isAIActive, updateConfig, updateSchedule, getOfflineMessage };
