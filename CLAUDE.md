# CLAUDE.md — Dashboard Maestro

## Idioma
Siempre responder en español latinoamericano (Argentina).

## ¿Qué es este proyecto?
Panel de administración maestro (superadmin) de **Huevos Point SaaS**.
App independiente que gestiona negocios/sucursales directamente en la DB y consume métricas vía API pública.

## Stack
- **Backend**: Node.js + Express.js + Sequelize v6 + PostgreSQL (Neon serverless)
- **Frontend**: React 19 + Material UI v6 + Vite 6 + React Router v7
- **Auth**: JWT (mismo `JWT_SECRET` que la app de negocios)
- **Deploy**: Vercel (2 proyectos: `backend/` y `frontend/`)

## Estructura
```
dashboard-maestro/
├── backend/                  ← Express API (puerto 3002 en dev)
│   ├── api/index.js          ← Vercel serverless entry
│   ├── src/
│   │   ├── app.js
│   │   ├── config/           ← database.js, environment.js
│   │   ├── middlewares/      ← auth.js (jwtVerify + requireSuperadmin)
│   │   ├── models/           ← Tenant, User, Sale, Expense, SuperadminAuditLog
│   │   └── routes/           ← auth.js, tenants.js
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
├── frontend/                 ← React + MUI app (puerto 5174 en dev)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js   ← axios con sessionStorage dm_token/dm_user
│   │   ├── theme/theme.js    ← MUI v6, azul #1565C0
│   │   ├── utils/formatters.js
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx      ← lista de tenants
│   │   │   └── TenantDetailPage.jsx   ← detalle con métricas
│   │   └── components/
│   │       ├── Layout.jsx
│   │       └── ProtectedRoute.jsx
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
└── patch-huevos-point/       ← Cambios a aplicar en la app de negocios
    ├── AutoLoginPage.jsx      ← Copiar a client/src/pages/
    └── App.jsx.diff           ← Agregar ruta /auto-login en App.jsx
```

## Modelo de datos (DB existente — NO modificar estructura)
- `tenants`: id (INT), name, is_active, subscription_status, slug
- `users`: id, username, tenant_id, email, password, full_name, role (ENUM), is_active
- `user_tenants`: pivot M:N (user_id, tenant_id)
- `sales`: id, user_id, tenant_id, total_amount, payment_method, sale_date (DATEONLY)
- `expenses`: id, user_id, tenant_id, concept, amount, expense_date (DATEONLY)
- `superadmin_audit_log`: id, admin_user_id, action, target_tenant (INT), details (JSONB)

## JWT payload (formato exacto para cross-app compatibility)
```json
{ "id": 1, "username": "leanSuper", "fullName": "...", "role": "superadmin", "tenants": [{...}] }
```

## SessionStorage keys (frontend)
- `dm_token` → JWT del Dashboard Maestro
- `dm_user` → objeto usuario serializado

## Endpoints del backend
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/tenants                         ← lista con stats 30d
GET  /api/tenants/:id                     ← detalle con stats 30d y hoy
GET  /api/tenants/:id/today               ← solo métricas del día (polling)
GET  /api/tenants/:id/access-token        ← JWT para auto-login en app de negocios
POST /api/tenants/:id/suspend
POST /api/tenants/:id/reactivate
GET  /api/health
```

## Skills disponibles
| Skill | Cuándo usarla |
|-------|---------------|
| `senior-architect` | Decisiones de arquitectura, integración cross-app |
| `senior-backend` | APIs, Sequelize queries, auth, lógica de negocios |
| `senior-security` | JWT, CORS, validaciones, auditoría |
| `senior-devops` | Deploy Vercel, variables de entorno, Neon |
| `ui-ux-pro-max` | MUI v6, diseño del panel, componentes |
| `mobile-design` | Responsive, sidebar mobile, tablas adaptativas |
| `senior-qa` | Tests Jest/Vitest, edge cases, aislamiento cross-tenant |
| `code-reviewer` | Revisión de código, anti-patrones, convenciones |
| `supabase-postgres-best-practices` | Queries SQL, índices, Neon optimization |

## API pública de Huevos Point

**REGLA CRÍTICA:** Todas las lecturas de ventas, egresos, compras, productos y métricas
**DEBEN** consumirse a través del servicio `backend/src/services/huevosPointApi.js`,
que llama a la API pública REST. **NUNCA** usar los modelos Sequelize `Sale` o `Expense`
directamente para lecturas.

Documentación completa: [`docs/public-api.md`](docs/public-api.md)

**Qué va por API pública** (lectura):
- Ventas (`/sales`), egresos (`/expenses`), compras (`/purchases`)
- Productos (`/products`), métricas agregadas (`/metrics`)
- Sucursales (`/tenants`) — solo lectura de stats

**Qué sigue en DB directa** (escritura y metadata):
- `businesses` — CRUD completo (tabla propia del dashboard)
- `tenants` — suspend, reactivate, update (gestión de estado)
- `users` / `user_tenants` — queries de usuarios vinculados a sucursales
- `superadmin_audit_log` — registro de acciones

Variables de entorno necesarias:
- `HP_API_BASE_URL` — `https://huevos-point-gcbg.vercel.app/api/public/v1`
- `HP_API_KEY` — API key con scope `read:all` y `business_id` del negocio (ver `docs/public-api.md` sección 5)

## Reglas importantes
1. Solo usuarios con `role = 'superadmin'` pueden autenticarse en este panel
2. Toda acción cross-tenant se registra en `superadmin_audit_log`
3. El `JWT_SECRET` DEBE ser el mismo que la app de negocios
4. Usar `sessionStorage` (no `localStorage`) — igual que la app de negocios
5. `tenantId` siempre con `parseInt()` y validado > 0
6. Métricas del día: filtrar por `saleDate === today` / `expenseDate === today` en los arrays de la API
7. Para auto-login: `window.open(url, '_blank', 'noopener,noreferrer')`
8. Nuevas sucursales creadas desde la app de negocios pueden llegar con `business_id = NULL` — asignarlas al negocio correspondiente via Supabase MCP

## Cómo correr en desarrollo
```bash
# Backend
cd backend && cp .env.example .env  # rellenar con credenciales reales
npm install && npm run dev           # http://localhost:3002

# Frontend
cd frontend && cp .env.example .env.local
# VITE_API_URL=http://localhost:3002/api (en dev usa proxy de vite.config.js)
npm install && npm run dev           # http://localhost:5174
```
