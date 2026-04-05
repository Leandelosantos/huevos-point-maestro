const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/environment');

// Registrar modelos y asociaciones (requerido para Vercel serverless)
require('./models');

const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const tenantsRoutes = require('./routes/tenants');

const app = express();

// Confiar en proxy (Vercel)
app.set('trust proxy', 1);

// Seguridad
app.use(helmet());

// CORS — solo desde el frontend del Dashboard Maestro
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? env.CORS_ORIGIN
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting general
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes. Intentá más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/auth', authRoutes);
app.use('/tenants', tenantsRoutes);

// Health check con diagnóstico de DB
app.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ success: true, service: 'dashboard-maestro-api', status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ success: false, status: 'db_error', error: err.message });
  }
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Error handler global
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // En producción exponer message temporalmente para diagnóstico
  res.status(status).json({ success: false, message: err.message || 'Error interno del servidor' });
});

module.exports = app;