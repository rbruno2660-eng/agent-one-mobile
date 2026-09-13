const authMiddleware = require('./auth');

/**
 * Middleware exclusivo para rotas /superadmin/*.
 * Verifica autenticação e exige is_superadmin = true.
 */
async function superadminMiddleware(req, res, next) {
  // Primeiro valida o JWT normalmente
  await new Promise((resolve) => authMiddleware(req, res, resolve));

  // Se authMiddleware terminou com resposta (erro), para aqui
  if (res.headersSent) return;

  if (!req.user?.is_superadmin) {
    return res.status(403).json({ error: 'Acesso restrito ao super admin.' });
  }

  next();
}

module.exports = superadminMiddleware;
