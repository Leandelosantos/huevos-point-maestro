const jwt = require('jsonwebtoken');
const env = require('../config/environment');

/**
 * Verifica el JWT del Dashboard Maestro.
 * El token se emite en POST /api/auth/login solo para usuarios superadmin.
 */
function jwtVerify(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

/**
 * Solo permite acceso a usuarios con rol superadmin.
 * Debe ir después de jwtVerify.
 */
function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: se requiere rol superadmin' });
  }
  next();
}

/**
 * Middleware combinado: verificación JWT + exigencia de rol superadmin.
 */
const authMiddleware = [jwtVerify, requireSuperadmin];

module.exports = { jwtVerify, requireSuperadmin, authMiddleware };