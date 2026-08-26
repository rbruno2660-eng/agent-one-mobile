const router = require('express').Router();
const { z } = require('zod');
const authService = require('../services/auth.service');
const authMiddleware = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    if (err.message === 'Credenciais inválidas') return res.status(401).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatório' });
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// POST /auth/change-password (autenticado)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos' });
    res.status(400).json({ error: err.message });
  }
});

// GET /auth/me (autenticado)
router.get('/me', authMiddleware, (req, res) => {
  const { password, ...user } = req.user;
  res.json(user);
});

module.exports = router;
