const Tenant = require('./Tenant');
const User = require('./User');
const Sale = require('./Sale');
const Expense = require('./Expense');
const SuperadminAuditLog = require('./SuperadminAuditLog');

// Associations
Tenant.hasMany(Sale, { foreignKey: 'tenantId', as: 'sales' });
Sale.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Expense, { foreignKey: 'tenantId', as: 'expenses' });
Expense.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// User ↔ Tenant: M:N via user_tenants pivot
Tenant.belongsToMany(User, {
  through: { model: 'user_tenants', timestamps: false },
  foreignKey: 'tenant_id',
  otherKey: 'user_id',
  as: 'users',
});
User.belongsToMany(Tenant, {
  through: { model: 'user_tenants', timestamps: false },
  foreignKey: 'user_id',
  otherKey: 'tenant_id',
  as: 'tenants',
});

SuperadminAuditLog.belongsTo(Tenant, { foreignKey: 'targetTenant', as: 'tenant' });

module.exports = { Tenant, User, Sale, Expense, SuperadminAuditLog };