const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const aiConfigService = require('../services/ai-config.service');

router.use(authMiddleware);
router.use(requireRole('manager'));

// GET /ai-config — config + status atual em tempo real
router.get('/', async (req, res) => {
  try {
    const config = await aiConfigService.getConfig(req.tenantId);
    const is_active = await aiConfigService.isAIActive(req.tenantId);
    res.json({ ...config, is_active });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// PATCH /ai-config — atualiza modo, mensagem offline, timezone, override manual
router.patch('/', async (req, res) => {
  try {
    const { mode, manual_override, offline_message, timezone } = req.body;

    // Validações
    if (mode && !['always_on', 'always_off', 'scheduled'].includes(mode)) {
      return res.status(400).json({ error: 'mode inválido' });
    }
    if (manual_override !== undefined && !['active', 'inactive', null].includes(manual_override)) {
      return res.status(400).json({ error: 'manual_override inválido' });
    }

    const config = await aiConfigService.updateConfig(req.tenantId, {
      mode,
      manual_override,
      offline_message,
      timezone,
    });
    const is_active = await aiConfigService.isAIActive(req.tenantId);
    res.json({ ...config, is_active });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

// POST /ai-config/pause — pausa por N horas (sem alterar schedule)
router.post('/pause', async (req, res) => {
  try {
    const { hours } = req.body;
    const h = parseFloat(hours);
    if (!h || h < 0.5 || h > 48) {
      return res.status(400).json({ error: 'hours deve ser entre 0.5 e 48' });
    }
    const pause_until = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
    const config = await aiConfigService.updateConfig(req.tenantId, { pause_until, manual_override: null });
    res.json({ ...config, is_active: false });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao pausar IA' });
  }
});

// DELETE /ai-config/pause — cancela pausa antecipadamente
router.delete('/pause', async (req, res) => {
  try {
    const config = await aiConfigService.updateConfig(req.tenantId, { pause_until: null });
    const is_active = await aiConfigService.isAIActive(req.tenantId);
    res.json({ ...config, is_active });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao retomar IA' });
  }
});

// PUT /ai-config/schedule — substitui agenda completa
router.put('/schedule', async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots deve ser um array' });

    for (const s of slots) {
      if (s.day_of_week < 0 || s.day_of_week > 6) {
        return res.status(400).json({ error: `day_of_week inválido: ${s.day_of_week}` });
      }
    }

    const config = await aiConfigService.updateSchedule(req.tenantId, slots);
    const is_active = await aiConfigService.isAIActive(req.tenantId);
    res.json({ ...config, is_active });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agenda' });
  }
});

module.exports = router;
