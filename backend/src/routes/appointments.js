/**
 * Rotas REST de agendamentos — /appointments
 * Permite ao manager/owner ver e gerenciar a agenda da loja.
 * O agendamento em si é criado pelo Agent One via tools.
 */

const router = require('express').Router();
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// ──────────────────────────────────────────────────────────────
// GET /appointments
// Lista agendamentos do tenant — filtros: ?date=2026-10-15&status=pending
// ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query;

    let whereClause = `WHERE a.tenant_id = $1`;
    const params = [req.tenantId];
    let i = 2;

    if (date) {
      whereClause += ` AND a.scheduled_date = $${i}`;
      params.push(date);
      i++;
    } else {
      // Por padrão: agendamentos de hoje em diante
      whereClause += ` AND a.scheduled_date >= CURRENT_DATE`;
    }

    if (status) {
      whereClause += ` AND a.status = $${i}`;
      params.push(status);
      i++;
    }

    const result = await query(`
      SELECT
        a.id,
        a.scheduled_date,
        a.scheduled_time,
        a.duration_minutes,
        a.service_type,
        a.notes,
        a.status,
        a.reminder_sent,
        a.created_at,
        c.name    AS contact_name,
        c.phone   AS contact_phone,
        cv.id     AS conversation_id
      FROM appointments a
      JOIN contacts c ON c.id = a.contact_id
      LEFT JOIN conversations cv ON cv.id = a.conversation_id
      ${whereClause}
      ORDER BY a.scheduled_date ASC, a.scheduled_time ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /appointments/today
// Atalho para a agenda do dia atual
// ──────────────────────────────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        a.id,
        a.scheduled_date,
        a.scheduled_time,
        a.duration_minutes,
        a.service_type,
        a.notes,
        a.status,
        a.reminder_sent,
        c.name  AS contact_name,
        c.phone AS contact_phone
      FROM appointments a
      JOIN contacts c ON c.id = a.contact_id
      WHERE a.tenant_id = $1
        AND a.scheduled_date = CURRENT_DATE
        AND a.status != 'cancelled'
      ORDER BY a.scheduled_time ASC
    `, [req.tenantId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /appointments/:id/status
// Confirma, cancela ou marca como concluído
// ──────────────────────────────────────────────────────────────
router.patch('/:id/status', requireRole('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${allowed.join(', ')}` });
    }

    const result = await query(`
      UPDATE appointments
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, status, scheduled_date, scheduled_time
    `, [status, id, req.tenantId]);

    if (!result.rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /appointments/:id
// Cancela um agendamento (soft delete via status)
// ──────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      UPDATE appointments
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [id, req.tenantId]);

    if (!result.rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
