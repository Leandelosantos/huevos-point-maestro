const { Router } = require('express');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
const { authMiddleware } = require('../middlewares/auth');
const { Tenant, SuperadminAuditLog } = require('../models');
const env = require('../config/environment');
const {
  fetchAllPages,
  getStats,
  aggregateSalesByTenant,
  aggregateExpensesByTenant,
  DEFAULT_KEY,
} = require('../services/huevosPointApi');

const router = Router();

router.use(authMiddleware);

/**
 * Loguea acceso cross-tenant en superadmin_audit_log (non-blocking).
 */
async function auditAccess(req, action, targetTenantId, details = {}) {
  await SuperadminAuditLog.create({
    adminUserId: req.user.id,
    action,
    targetTenant: targetTenantId || null,
    details: { ...details, source: 'dashboard-maestro', ip: req.ip },
    ipAddress: req.ip,
  }).catch(() => {});
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tenants
// Lista todos los tenants con stats de los últimos 30 días.
// Métricas de ventas/egresos desde la API pública de Huevos Point.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];

    const tenants = await Tenant.findAll({ order: [['name', 'ASC']] });

    // Traer ventas/egresos desde la API pública (una sola llamada)
    const { sales, expenses } = await getStats(from, to);
    const salesByTenant = aggregateSalesByTenant(sales);
    const expensesByTenant = aggregateExpensesByTenant(expenses);

    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCountRow] = await sequelize.query(
          'SELECT COUNT(*) as count FROM user_tenants WHERE tenant_id = :tenantId',
          { replacements: { tenantId: tenant.id }, type: sequelize.QueryTypes.SELECT }
        );
        const userCount = parseInt(userCountRow?.count || 0, 10);

        const sales30d = salesByTenant[tenant.id] || 0;
        const expenses30d = expensesByTenant[tenant.id] || 0;

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          isActive: tenant.isActive,
          subscriptionStatus: tenant.subscriptionStatus,
          userCount,
          salesLast30Days: sales30d,
          expensesLast30Days: expenses30d,
          netLast30Days: sales30d - expenses30d,
          createdAt: tenant.createdAt,
        };
      })
    );

    auditAccess(req, 'LIST_TENANTS', null);

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tenants/:tenantId
// Detalle completo de un tenant (métricas 30d + hoy + usuarios + ventas recientes).
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:tenantId', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Usuarios desde DB (no está en la API pública)
    const usersPromise = sequelize.query(
      `SELECT u.id, u.username, u.full_name as "fullName", u.email, u.role,
              u.is_active as "isActive", u.created_at as "createdAt"
       FROM users u
       INNER JOIN user_tenants ut ON ut.user_id = u.id
       WHERE ut.tenant_id = :tenantId
       ORDER BY u.full_name ASC`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );

    // Ventas y egresos desde la API pública (una sola llamada cubre 30d + hoy)
    const salesPromise = fetchAllPages('/sales', { from, to: today }, DEFAULT_KEY).catch(() => []);
    const expensesPromise = fetchAllPages('/expenses', { from, to: today }, DEFAULT_KEY).catch(() => []);

    const [users, allSales, allExpenses] = await Promise.all([
      usersPromise,
      salesPromise,
      expensesPromise,
    ]);

    // Filtrar solo los registros de este tenant
    const tenantSales30d = allSales.filter((s) => s.tenantId === tenantId);
    const tenantExpenses30d = allExpenses.filter((e) => e.tenantId === tenantId);
    const tenantSalesToday = tenantSales30d.filter((s) => s.saleDate === today);
    const tenantExpensesToday = tenantExpenses30d.filter((e) => e.expenseDate === today);

    const totalSales30d = tenantSales30d.reduce((acc, s) => acc + parseFloat(s.totalAmount || 0), 0);
    const totalExpenses30d = tenantExpenses30d.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalSalesToday = tenantSalesToday.reduce((acc, s) => acc + parseFloat(s.totalAmount || 0), 0);
    const totalExpensesToday = tenantExpensesToday.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // Últimas 20 ventas ordenadas por fecha de creación desc
    const recentSales = [...tenantSales30d]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    auditAccess(req, 'VIEW_TENANT_DETAIL', tenantId);

    res.json({
      success: true,
      data: {
        tenant,
        users,
        recentSales,
        totalSales30d,
        totalExpenses30d,
        netBalance30d: totalSales30d - totalExpenses30d,
        totalSalesToday,
        totalExpensesToday,
        netBalanceToday: totalSalesToday - totalExpensesToday,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tenants/:tenantId/today
// Solo métricas del día actual para el dashboard (polling liviano).
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:tenantId/today', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const today = new Date().toISOString().split('T')[0];

    const [todaySales, todayExpenses] = await Promise.all([
      fetchAllPages('/sales', { from: today, to: today }, DEFAULT_KEY).catch(() => []),
      fetchAllPages('/expenses', { from: today, to: today }, DEFAULT_KEY).catch(() => []),
    ]);

    const tenantSales = todaySales.filter((s) => s.tenantId === tenantId);
    const tenantExpenses = todayExpenses.filter((e) => e.tenantId === tenantId);

    const totalVentas = tenantSales.reduce((acc, s) => acc + parseFloat(s.totalAmount || 0), 0);
    const totalEgresos = tenantExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    res.json({
      success: true,
      data: {
        tenantId,
        date: today,
        totalVentasHoy: totalVentas,
        totalEgresosHoy: totalEgresos,
        netoCajaHoy: totalVentas - totalEgresos,
        cantidadVentas: tenantSales.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tenants/:tenantId/access-token
// Genera un JWT de auto-login para ingresar a la app de negocios.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:tenantId/access-token', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name', 'isActive'] });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ success: false, message: 'No se puede ingresar a un tenant suspendido' });
    }

    const allTenants = await Tenant.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const accessPayload = {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: 'superadmin',
      tenants: allTenants.map((t) => ({ id: t.id, name: t.name })),
      _source: 'dashboard-maestro',
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, { expiresIn: '1h' });
    const redirectUrl = `${env.APP_URL}/auto-login?token=${accessToken}&tenant=${tenantId}`;

    auditAccess(req, 'ENTER_TENANT', tenantId, { targetTenantName: tenant.name });

    res.json({
      success: true,
      data: {
        redirectUrl,
        tenantId,
        tenantName: tenant.name,
        expiresIn: '1h',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/tenants/:tenantId/suspend
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:tenantId/suspend', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    }

    await tenant.update({ isActive: false, subscriptionStatus: 'suspended' });

    auditAccess(req, 'SUSPEND_TENANT', tenantId, { tenantName: tenant.name });

    res.json({
      success: true,
      data: { id: tenant.id, name: tenant.name, isActive: false },
      message: 'Tenant suspendido correctamente',
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/tenants/:tenantId/reactivate
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:tenantId/reactivate', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    }

    await tenant.update({ isActive: true, subscriptionStatus: 'active' });

    auditAccess(req, 'REACTIVATE_TENANT', tenantId, { tenantName: tenant.name });

    res.json({
      success: true,
      data: { id: tenant.id, name: tenant.name, isActive: true },
      message: 'Tenant reactivado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/tenants/:tenantId/users
// Crea un usuario en la app de negocios para esta sucursal.
// Proxy autenticado: genera un JWT de superadmin y llama a POST /api/users de HP.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:tenantId/users', async (req, res, next) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || tenantId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de tenant inválido' });
    }

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name'] });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    }

    const { fullName, username, password, role, email } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre completo es requerido' });
    }
    if (!username?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de usuario es requerido' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'La contraseña es requerida' });
    }
    if (!['employee', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    // Generar JWT de corta duración para autenticarse en la app de negocios
    const allTenants = await Tenant.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
    const accessPayload = {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: 'superadmin',
      tenants: allTenants.map((t) => ({ id: t.id, name: t.name })),
      _source: 'dashboard-maestro',
    };
    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, { expiresIn: '5m' });

    // Payload para la app de negocios
    const userPayload = {
      fullName: fullName.trim(),
      username: username.trim(),
      password,
      role,
      tenantIds: role === 'superadmin' ? [] : [tenantId],
    };
    if (email?.trim()) userPayload.email = email.trim();

    // Llamar a POST /api/users en la app de negocios
    const hpResponse = await fetch(`${env.APP_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': String(tenantId),
      },
      body: JSON.stringify(userPayload),
    });

    const hpData = await hpResponse.json();

    if (!hpResponse.ok) {
      return res.status(hpResponse.status).json({
        success: false,
        message: hpData.message || 'Error al crear el usuario en la app de negocios',
      });
    }

    auditAccess(req, 'CREATE_USER', tenantId, {
      newUsername: username.trim(),
      role,
      tenantName: tenant.name,
    });

    res.status(201).json({
      success: true,
      data: hpData.data,
      message: 'Usuario creado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
