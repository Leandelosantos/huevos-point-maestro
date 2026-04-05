const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuperadminAuditLog = sequelize.define('SuperadminAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  adminUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'admin_user_id',
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  targetTenant: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'target_tenant',
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address',
  },
}, {
  tableName: 'superadmin_audit_log',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = SuperadminAuditLog;