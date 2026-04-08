/**
 * Cliente del servicio Huevos Point Public API v1.
 *
 * REGLA DE ORO: Todas las lecturas de ventas, egresos, compras, productos y
 * métricas DEBEN pasar por este módulo. Nunca usar los modelos Sequelize Sale
 * o Expense directamente para lecturas — siempre consumir la API pública.
 *
 * Documentación completa: docs/public-api.md
 */

const env = require('../config/environment');

const BASE_URL = env.HP_API_BASE_URL;
const DEFAULT_KEY = env.HP_API_KEY;

// ──────────────────────────────────────────────────────────────────────────────
// HTTP fetch interno
// ──────────────────────────────────────────────────────────────────────────────

async function apiFetch(path, params = {}, apiKey) {
  const key = apiKey || DEFAULT_KEY;
  if (!key) return null;

  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HP API error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ──────────────────────────────────────────────────────────────────────────────
// Paginación automática — recorre todas las páginas y devuelve un array plano
// ──────────────────────────────────────────────────────────────────────────────

async function fetchAllPages(path, params = {}, apiKey) {
  if (!apiKey && !DEFAULT_KEY) return [];

  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await apiFetch(path, { ...params, limit, offset }, apiKey);
    if (!result || !Array.isArray(result.data)) break;
    all.push(...result.data);
    if (!result.meta?.hasMore) break;
    offset += limit;
  }

  return all;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de agregación
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Agrupa ventas por tenantId y suma totalAmount.
 * @returns {{ [tenantId: number]: number }}
 */
function aggregateSalesByTenant(sales) {
  return sales.reduce((acc, s) => {
    const id = s.tenantId;
    acc[id] = (acc[id] || 0) + parseFloat(s.totalAmount || 0);
    return acc;
  }, {});
}

/**
 * Agrupa egresos por tenantId y suma amount.
 * @returns {{ [tenantId: number]: number }}
 */
function aggregateExpensesByTenant(expenses) {
  return expenses.reduce((acc, e) => {
    const id = e.tenantId;
    acc[id] = (acc[id] || 0) + parseFloat(e.amount || 0);
    return acc;
  }, {});
}

// ──────────────────────────────────────────────────────────────────────────────
// API pública — métodos de alto nivel
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Trae todas las ventas y egresos en el rango de fechas.
 * Devuelve arrays vacíos en vez de lanzar si la API no está disponible.
 *
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 * @param {string} [apiKey]  Clave de API (usa HP_API_KEY por defecto)
 * @returns {{ sales: object[], expenses: object[] }}
 */
async function getStats(from, to, apiKey) {
  if (!apiKey && !DEFAULT_KEY) return { sales: [], expenses: [] };

  const [sales, expenses] = await Promise.all([
    fetchAllPages('/sales', { from, to }, apiKey).catch(() => []),
    fetchAllPages('/expenses', { from, to }, apiKey).catch(() => []),
  ]);

  return { sales, expenses };
}

/**
 * Trae métricas agregadas (totales) para el rango dado.
 * Útil para una sola sucursal con clave tenant-scoped.
 *
 * @param {string} from
 * @param {string} to
 * @param {string} [apiKey]
 */
async function getMetrics(from, to, apiKey) {
  if (!apiKey && !DEFAULT_KEY) return null;
  const result = await apiFetch('/metrics', { from, to }, apiKey);
  return result?.data ?? null;
}

module.exports = {
  fetchAllPages,
  aggregateSalesByTenant,
  aggregateExpensesByTenant,
  getStats,
  getMetrics,
  DEFAULT_KEY,
};
