/**
 * Hierarquia de roles (maior índice = mais permissão)
 */
const ROLE_HIERARCHY = {
  viewer: 0,
  service: 1,
  seller: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

/**
 * Retorna middleware que exige role mínima.
 * Ex: require('rbac')('manager') → bloqueia seller, viewer, service
 */
function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 99;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Acesso negado. Requer perfil: ${minRole}`,
      });
    }
    next();
  };
}

/**
 * Verifica se usuário tem uma das roles permitidas.
 * Ex: requireAnyRole(['owner','admin'])
 */
function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

module.exports = { requireRole, requireAnyRole };
