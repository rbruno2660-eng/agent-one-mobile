const { query } = require('../db/pool');

/**
 * Registra uma entrada no audit_log.
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {object} opts.actor - req.user
 * @param {string} opts.action - ex: 'update_price', 'create_product'
 * @param {string} opts.entity - ex: 'product', 'trade_rule'
 * @param {string} opts.entityId
 * @param {object} [opts.before] - estado anterior
 * @param {object} [opts.after] - estado novo
 * @param {string} [opts.ip]
 */
async function auditLog({ tenantId, actor, action, entity, entityId, before, after, ip }) {
  try {
    await query(
      `INSERT INTO audit_logs (tenant_id, actor_id, actor_email, action, entity, entity_id, before, after, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId,
        actor?.id || null,
        actor?.email || null,
        action,
        entity,
        entityId || null,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        ip || null,
      ]
    );
  } catch (err) {
    // Audit nunca deve quebrar o fluxo principal
    console.error('auditLog error:', err.message);
  }
}

module.exports = { auditLog };
