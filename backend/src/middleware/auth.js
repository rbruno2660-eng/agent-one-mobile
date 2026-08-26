const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

/**
 * Middleware de autenticação JWT.
 * Injeta req.user e req.tenantId.
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado' });
    }

    const token = header.split(' ')[1];
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Busca usuário ativo
    const result = await query(
      `SELECT id, tenant_id, name, email, role, status FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    const user = result.rows[0];
    req.user = user;
    req.tenantId = user.tenant_id;

    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}

module.exports = authMiddleware;
