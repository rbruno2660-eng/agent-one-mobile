/**
 * Rotas de reativação — Feature 5.
 * Histórico da fila de reativações do tenant.
 */

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authMiddleware);

// GET /reactivation/history — histórico de reativações enviadas
router.get('/history', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         rq.id,
         rq.status,
         rq.scheduled_for,
         rq.updated_at AS sent_at,
         rq.message,
         c.name  AS contact_name,
         c.phone AS phone
       FROM reactivation_queue rq
       LEFT JOIN contacts c ON c.id = rq.contact_id AND c.tenant_id = rq.tenant_id
       WHERE rq.tenant_id = $1
       ORDER BY rq.updated_at DESC NULLS LAST
       LIMIT 200`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico de reativações' });
  }
});

// GET /reactivation/pending — fila pendente
router.get('/pending', async (req, res) => {
  try {
    const result = await query(
      `SELECT rq.*, c.name AS contact_name, c.phone
       FROM reactivation_queue rq
       LEFT JOIN contacts c ON c.id = rq.contact_id AND c.tenant_id = rq.tenant_id
       WHERE rq.tenant_id = $1 AND rq.status = 'pending'
       ORDER BY rq.scheduled_for ASC
       LIMIT 100`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fila pendente' });
  }
});

module.exports = router;
