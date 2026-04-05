let sequelize;
let initError;

try {
  const { Sequelize } = require('sequelize');
  const env = require('./environment');
  const isProduction = env.NODE_ENV === 'production';

  sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: isProduction
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    logging: false,
    define: { underscored: true, timestamps: true },
  });
} catch (e) {
  initError = e.message;
  console.error('[database.js] INIT ERROR:', e.message);
}

// Exportar el error para diagnóstico si falla
if (initError) {
  module.exports = { _initError: initError };
} else {
  module.exports = sequelize;
}