const { Sequelize } = require('sequelize');
const env = require('./environment');

const isProduction = env.NODE_ENV === 'production';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  dialectOptions: {
    ssl: isProduction
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  // Pool conservador para Neon serverless (límite conexiones plan free)
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: isProduction ? false : false, // silencioso en ambos entornos para el dashboard
  define: {
    underscored: true,
    timestamps: true,
  },
});

module.exports = sequelize;