const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../db/pool');

router.use(authMiddleware);
router.use(requireRole('admin'));

// GET /audit — retorna os últimos logs de auditoria do tenant
// Query params: entity, actor_id, action, limit (max 200), offset
router.get('/', async (req, res) => {
  try {
    const { entity, action, limit = 50, offset = 0 } = req.query;
    const conditions = ['a.tenant_id = $1'];
    const values = [req.tenantId];
    let i = 2;

    if (entity) { conditions.push(`a.entity = $${i++}`); values.push(entity); }
    if (action) { conditions.push(`a.action = $${i++}`); values.push(action); }

    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    const safeOffset = parseInt(offset) || 0;

    values.push(safeLimit, safeOffset);

    const result = await query(`
      SELECT
        a.id, a.action, a.entity, a.entity_id,
        a.before, a.after, a.created_at,
        u.name AS actor_name, u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, values);

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs a WHERE ${conditions.join(' AND ')}`,
      values.slice(0, -2)
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: safeLimit,
      offset: safeOffset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar logs de auditoria' });
  }
});

// GET /audit/entities — lista os entity types disponíveis para filtrar
router.get('/entities', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT entity FROM audit_logs WHERE tenant_id = $1 ORDER BY entity`,
      [req.tenantId]
    );
    res.json(result.rows.map(r => r.entity));
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

module.exports = router;
