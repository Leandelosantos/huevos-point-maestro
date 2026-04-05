const { Router } = require('express');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { authMiddleware } = require('../middlewares/auth');
const { Business, Tenant, Sale, Expense, SuperadminAuditLog } = require('../models');

const router = Router();

router.use(authMiddleware);

async function auditAccess(req, action, details = {}) {
  await SuperadminAuditLog.create({
    adminUserId: req.user.id,
    action,
    targetTenant: null,
    details: { ...details, source: 'dashboard-maestro', ip: req.ip },
    ipAddress: req.ip,
  }).catch(() => {});
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/businesses
// Lista todos los negocios con stats agregadas de sus sucursales.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

    const businesses = await Business.findAll({ order: [['name', 'ASC']] });

    const results = await Promise.all(
      businesses.map(async (business) => {
        const tenants = await Tenant.findAll({ where: { businessId: business.id } });
        const tenantIds = tenants.map((t) => t.id);

        const [salesTotal, expensesTotal] = tenantIds.length
          ? await Promise.all([
              Sale.sum('totalAmount', {
                where: { tenantId: { [Op.in]: tenantIds }, saleDate: { [Op.gte]: dateThreshold } },
              }),
              Expense.sum('amount', {
                where: { tenantId: { [Op.in]: tenantIds }, expenseDate: { [Op.gte]: dateThreshold } },
              }),
            ])
          : [0, 0];

        const sales30d = parseFloat(salesTotal) || 0;
        const expenses30d = parseFloat(expensesTotal) || 0;

        return {
          id: business.id,
          name: business.name,
          slug: business.slug,
          isActive: business.isActive,
          tenantCount: tenants.length,
          activeTenantCount: tenants.filter((t) => t.isActive).length,
          salesLast30Days: sales30d,
          expensesLast30Days: expenses30d,
          netLast30Days: sales30d - expenses30d,
          createdAt: business.createdAt,
        };
      })
    );

    auditAccess(req, 'LIST_BUSINESSES');

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/businesses/:businessId
// Detalle de un negocio con lista de sus tenants y stats 30d por sucursal.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:businessId', async (req, res, next) => {
  try {
    const businessId = parseInt(req.params.businessId, 10);
    if (!businessId || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de negocio inválido' });
    }

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

    const tenants = await Tenant.findAll({
      where: { businessId },
      order: [['name', 'ASC']],
    });

    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, salesLast30Days, expensesLast30Days] = await Promise.all([
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

    // Stats globales del negocio
    const totalStats = {
      tenantCount: tenants.length,
      activeTenantCount: tenants.filter((t) => t.isActive).length,
      salesLast30Days: tenantsWithStats.reduce((acc, t) => acc + t.salesLast30Days, 0),
      expensesLast30Days: tenantsWithStats.reduce((acc, t) => acc + t.expensesLast30Days, 0),
      netLast30Days: tenantsWithStats.reduce((acc, t) => acc + t.netLast30Days, 0),
    };

    auditAccess(req, 'VIEW_BUSINESS_DETAIL', { businessId, businessName: business.name });

    res.json({
      success: true,
      data: {
        business,
        tenants: tenantsWithStats,
        totalStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/businesses/:businessId
// Edita el nombre del negocio y los nombres de sus sucursales.
// Body: { businessName, tenants: [{ id, name }] }
// ──────────────────────────────────────────────────────────────────────────────
router.put('/:businessId', async (req, res, next) => {
  try {
    const businessId = parseInt(req.params.businessId, 10);
    if (!businessId || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de negocio inválido' });
    }

    const { businessName, tenants } = req.body;

    if (!businessName || !String(businessName).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del negocio es requerido' });
    }

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    const trimmedName = String(businessName).trim();
    const slug = trimmedName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await sequelize.transaction(async (t) => {
      await business.update({ name: trimmedName, slug }, { transaction: t });

      if (Array.isArray(tenants)) {
        for (const item of tenants) {
          const tenantId = parseInt(item.id, 10);
          if (!tenantId || !item.name?.trim()) continue;
          await Tenant.update(
            { name: item.name.trim() },
            { where: { id: tenantId, businessId }, transaction: t }
          );
        }
      }
    });

    auditAccess(req, 'EDIT_BUSINESS', { businessId, businessName: trimmedName });

    res.json({ success: true, message: 'Negocio actualizado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/businesses/:businessId
// Elimina el negocio y sus sucursales. Bloquea si hay ventas o egresos.
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:businessId', async (req, res, next) => {
  try {
    const businessId = parseInt(req.params.businessId, 10);
    if (!businessId || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de negocio inválido' });
    }

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    const tenants = await Tenant.findAll({ where: { businessId } });
    const tenantIds = tenants.map((t) => t.id);

    if (tenantIds.length > 0) {
      const [salesCount, expensesCount] = await Promise.all([
        Sale.count({ where: { tenantId: { [Op.in]: tenantIds } } }),
        Expense.count({ where: { tenantId: { [Op.in]: tenantIds } } }),
      ]);

      if (salesCount > 0 || expensesCount > 0) {
        return res.status(409).json({
          success: false,
          message: `No se puede eliminar: el negocio tiene ${salesCount} venta(s) y ${expensesCount} egreso(s) registrados.`,
        });
      }
    }

    await sequelize.transaction(async (t) => {
      if (tenantIds.length > 0) {
        await Tenant.destroy({ where: { businessId }, transaction: t });
      }
      await business.destroy({ transaction: t });
    });

    auditAccess(req, 'DELETE_BUSINESS', { businessId, businessName: business.name });

    res.json({ success: true, message: 'Negocio eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/businesses
// Crea un nuevo negocio junto con su primera sucursal.
// Body: { businessName, tenantName }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { businessName, tenantName } = req.body;

    if (!businessName || !String(businessName).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del negocio es requerido' });
    }
    if (!tenantName || !String(tenantName).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la primera sucursal es requerido' });
    }

    const trimmedBusinessName = String(businessName).trim();
    const trimmedTenantName   = String(tenantName).trim();

    // Slug automático desde el nombre del negocio
    const slug = trimmedBusinessName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Crear negocio y sucursal en una transacción
    const result = await sequelize.transaction(async (t) => {
      const business = await Business.create(
        { name: trimmedBusinessName, slug },
        { transaction: t }
      );

      const tenant = await Tenant.create(
        {
          name: trimmedTenantName,
          businessId: business.id,
          isActive: true,
          subscriptionStatus: 'active',
        },
        { transaction: t }
      );

      return { business, tenant };
    });

    auditAccess(req, 'CREATE_BUSINESS', {
      businessId: result.business.id,
      businessName: trimmedBusinessName,
      firstTenantName: trimmedTenantName,
    });

    res.status(201).json({
      success: true,
      data: {
        business: result.business,
        tenant: result.tenant,
      },
      message: 'Negocio creado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
