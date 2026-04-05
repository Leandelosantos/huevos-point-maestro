const { Router } = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const env = require('../config/environment');
const { User, Tenant, SuperadminAuditLog } = require('../models');

const router = Router();

// Brute-force protection: 10 intentos cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Intentá en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Autentica un usuario con role=superadmin.
 * Retorna JWT compatible con la app de negocios.
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario superadmin por username
    const user = await User.findOne({
      where: { username, role: 'superadmin', isActive: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    // Cargar todos los tenants para incluir en el JWT (igual que la app de negocios)
    const allTenants = await Tenant.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    // JWT con el mismo formato que espera la app de negocios
    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: 'superadmin',
      tenants: allTenants.map((t) => ({ id: t.id, name: t.name })),
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    // Auditar login del dashboard maestro
    await SuperadminAuditLog.create({
      adminUserId: user.id,
      action: 'DASHBOARD_MAESTRO_LOGIN',
      targetTenant: null,
      details: { source: 'dashboard-maestro' },
      ipAddress: req.ip,
    }).catch(() => {}); // No bloquear login si el log falla

    res.json({
      success: true,
      data: {
        token,
        user: payload,
      },
      message: 'Sesión iniciada correctamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Solo registra el logout en auditoría. El cliente elimina el token de sessionStorage.
 */
router.post('/logout', async (req, res) => {
  // El token puede estar o no (logout sin auth válida es OK)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      await SuperadminAuditLog.create({
        adminUserId: decoded.id,
        action: 'DASHBOARD_MAESTRO_LOGOUT',
        targetTenant: null,
        details: { source: 'dashboard-maestro' },
        ipAddress: req.ip,
      }).catch(() => {});
    } catch {
      // Token inválido al logout — ok, igual devolvemos 200
    }
  }

  res.json({ success: true, message: 'Sesión cerrada' });
});

module.exports = router;