const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  subscriptionStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    field: 'subscription_status',
  },
  slug: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'business_id',
  },
}, {
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
});

module.exports = Tenant;