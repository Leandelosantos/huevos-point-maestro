const app = require('./app');
const env = require('./config/environment');
const sequelize = require('./config/database');

const PORT = env.PORT;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[db] Conexión a PostgreSQL establecida correctamente.');
    app.listen(PORT, () => {
      console.log(`[server] Dashboard Maestro API corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[db] Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
}

start();