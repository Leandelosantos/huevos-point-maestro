const pg = require('pg'); // Import explícito para que Vercel/nft lo incluya en el bundle
const { Sequelize } = require('sequelize');
const env = require('./environment');

const isProduction = env.NODE_ENV === 'production';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  dialectModule: pg, // Pasamos pg directamente para evitar el require dinámico interno de Sequelize
  dialectOptions: {
    ssl: isProduction
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  logging: false,
  define: { underscored: true, timestamps: true },
});

module.exports = sequelize;