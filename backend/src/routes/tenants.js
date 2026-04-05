const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');
const { authMiddleware } = require('../middlewares/auth');
const { Tenant, User, Sale, Expense, SuperadminAuditLog } = require('../models');
const env = require('../config/environment');

const router = Router();

// Todas las rutas requieren autenticación superadmin
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
// Lista todos los tenants con stats de los últimos 30 días y conteos.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

    const tenants = await Tenant.findAll({ order: [['name', 'ASC']] });

    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, salesLast30Days, expensesLast30Days] = await Promise.all([
          // Contar usuarios via user_tenants (M:N)
          sequelize.query(
            'SELECT COUNT(*) as count FROM user_tenants WHERE tenant_id = :tenantId',
            { replacements: { tenantId: tenant.id }, type: sequelize.QueryTypes.SELECT }
          ).then((rows) => parseInt(rows[0]?.count || 0, 10)),

          Sale.sum('totalAmount', {
            where: { tenantId: tenant.id, saleDate: { [Op.gte]: dateThreshold } },
          }),

          Expense.sum('amount', {
            where: { tenantId: tenant.id, expenseDate: { [Op.gte]: dateThreshold } },
          }),
        ]);

        const sales30d = parseFloat(salesLast30Days) || 0;
        const expenses30d = parseFloat(expensesLast30Days) || 0;

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
// Detalle completo de un tenant (métricas 30d + usuarios + ventas recientes).
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
    const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [users, totalSales30d, totalExpenses30d, totalSalesToday, totalExpensesToday, recentSales] =
      await Promise.all([
        // Usuarios via M:N (user_tenants)
        sequelize.query(
          `SELECT u.id, u.username, u.full_name as "fullName", u.email, u.role, u.is_active as "isActive", u.created_at as "createdAt"
           FROM users u
           INNER JOIN user_tenants ut ON ut.user_id = u.id
           WHERE ut.tenant_id = :tenantId
           ORDER BY u.full_name ASC`,
          { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
        ),

        Sale.sum('totalAmount', {
          where: { tenantId, saleDate: { [Op.gte]: dateThreshold } },
        }),

        Expense.sum('amount', {
          where: { tenantId, expenseDate: { [Op.gte]: dateThreshold } },
        }),

        // Ventas de hoy — usa índice sales_tenant_date_idx
        Sale.sum('totalAmount', {
          where: { tenantId, saleDate: today },
        }),

        // Egresos de hoy — usa índice expenses_tenant_date_idx
        Expense.sum('amount', {
          where: { tenantId, expenseDate: today },
        }),

        Sale.findAll({
          where: { tenantId, saleDate: { [Op.gte]: dateThreshold } },
          attributes: ['id', 'totalAmount', 'paymentMethod', 'saleDate', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 20,
        }),
      ]);

    const sales30d = parseFloat(totalSales30d) || 0;
    const expenses30d = parseFloat(totalExpenses30d) || 0;
    const salesToday = parseFloat(totalSalesToday) || 0;
    const expensesToday = parseFloat(totalExpensesToday) || 0;

    auditAccess(req, 'VIEW_TENANT_DETAIL', tenantId);

    res.json({
      success: true,
      data: {
        tenant,
        users,
        recentSales,
        totalSales30d: sales30d,
        totalExpenses30d: expenses30d,
        netBalance30d: sales30d - expenses30d,
        totalSalesToday: salesToday,
        totalExpensesToday: expensesToday,
        netBalanceToday: salesToday - expensesToday,
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

    const [salesToday, expensesToday, salesCount] = await Promise.all([
      Sale.sum('totalAmount', { where: { tenantId, saleDate: today } }),
      Expense.sum('amount', { where: { tenantId, expenseDate: today } }),
      Sale.count({ where: { tenantId, saleDate: today } }),
    ]);

    const totalVentas = parseFloat(salesToday) || 0;
    const totalEgresos = parseFloat(expensesToday) || 0;

    res.json({
      success: true,
      data: {
        tenantId,
        date: today,
        totalVentasHoy: totalVentas,
        totalEgresosHoy: totalEgresos,
        netoCajaHoy: totalVentas - totalEgresos,
        cantidadVentas: salesCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tenants/:tenantId/access-token
// Genera un JWT de auto-login para ingresar a la app de negocios como superadmin
// en el contexto del tenant indicado.
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

    // Cargar todos los tenants para el payload (igual que la app de negocios espera)
    const allTenants = await Tenant.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    // JWT con el formato EXACTO que espera la app de negocios
    // El superadmin del Dashboard Maestro ingresa como superadmin en la app
    const accessPayload = {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: 'superadmin',
      tenants: allTenants.map((t) => ({ id: t.id, name: t.name })),
      // Campo extra para identificar que viene del Dashboard Maestro
      _source: 'dashboard-maestro',
    };

    // Token de corta duración para el auto-login (1 hora máximo)
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
// Suspende un tenant.
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
// Reactiva un tenant suspendido.
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

module.exports = router;