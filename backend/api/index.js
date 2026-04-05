// Fuerza a Vercel a incluir el driver pg (Sequelize lo carga dinámicamente)
require('pg');

const app = require('../src/app');

module.exports = app;