const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/pool');

function generateAccessToken(userId, tenantId, role) {
  return jwt.sign(
    { userId, tenantId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(userId, tenantId, role) {
  return jwt.sign(
    { userId, tenantId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

async function login(email, password) {
  // Busca usuário pelo email (qualquer tenant)
  const result = await query(
    `SELECT u.*, t.status AS tenant_status
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = $1 AND u.status = 'active'
     LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    throw new Error('Credenciais inválidas');
  }

  const user = result.rows[0];

  if (user.tenant_status !== 'active') {
    throw new Error('Conta suspensa. Entre em contato com o suporte.');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error('Credenciais inválidas');
  }

  const accessToken = generateAccessToken(user.id, user.tenant_id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.tenant_id, user.role);

  // Persiste refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, refreshToken, expiresAt]
  );

  // Atualiza last_login
  await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    },
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new Error('Refresh token inválido ou expirado');
  }

  // Verifica se token está no banco e não expirou
  const result = await query(
    `SELECT rt.*, u.role, u.status FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Refresh token inválido ou expirado');
  }

  const row = result.rows[0];
  if (row.status !== 'active') {
    throw new Error('Usuário inativo');
  }

  const newAccessToken = generateAccessToken(payload.userId, payload.tenantId, row.role);
  return { accessToken: newAccessToken };
}

async function logout(refreshToken) {
  await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
}

async function changePassword(userId, currentPassword, newPassword) {
  const result = await query(`SELECT password FROM users WHERE id = $1`, [userId]);
  if (result.rows.length === 0) throw new Error('Usuário não encontrado');

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
  if (!valid) throw new Error('Senha atual incorreta');

  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, userId]);

  // Revoga todos os refresh tokens
  await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}

module.exports = { login, refresh, logout, changePassword };
