# Huevos Point — Public Read-Only API (`/api/public/v1`)

API REST de solo lectura diseñada para que **sistemas satélites** (ERPs externos, dashboards de BI, integraciones contables, mobile apps internas, etc.) consuman información alojada en Huevos Point de forma segura y performante.

> **Versión:** v1
> **Base URL:** `https://huevos-point-gcbg.vercel.app/api/public/v1`
> **Autenticación:** API Key (header `Authorization: Bearer <key>` o `x-api-key: <key>`)
> **Formato:** JSON
> **Solo lectura:** No expone endpoints de escritura. Para operar sobre la BD usá el panel principal.

---

## 1. Modelo de seguridad

### 1.1 API Keys

- Cada satélite recibe **una API key** generada desde el endpoint admin (`POST /api/admin/api-keys`).
- La clave **se muestra exactamente una vez** al momento de crearla. Solo se persiste su SHA-256.
- Cada clave está limitada a uno de dos scopes de aislamiento:
  - **Business scope** (`business_id`): permite ver datos de **todas las sucursales** que pertenecen a ese negocio.
  - **Tenant scope** (`tenant_id`): permite ver datos de **una única sucursal**.
- Cada clave tiene una lista de **scopes funcionales**:
  - `read:all` → wildcard
  - `read:tenants`
  - `read:products`
  - `read:sales`
  - `read:expenses`
  - `read:purchases`
  - `read:metrics`
- Cada clave tiene su propio **rate limit por minuto** (default: 60 req/min) y opcionalmente una fecha de expiración.

### 1.2 Rate limiting

Hay **dos capas** de límites combinadas:

| Capa | Ámbito | Default |
|------|--------|---------|
| IP-level (express-rate-limit) | por IP, sobre toda la API pública | 120 req/min |
| Per-key (sliding window) | por API key | 60 req/min (configurable por clave) |

Cuando se excede cualquiera de las dos, la respuesta es `429 Too Many Requests`.

### 1.3 Headers requeridos

```http
Authorization: Bearer hp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

O bien:

```http
x-api-key: hp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

---

## 2. Formato de respuesta

Toda respuesta sigue el contrato estándar del proyecto:

### 2.1 Éxito con paginación

```json
{
  "success": true,
  "data": [ /* ... registros ... */ ],
  "meta": {
    "total": 1234,
    "limit": 25,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2.2 Éxito con dato simple

```json
{
  "success": true,
  "data": { /* ... */ }
}
```

### 2.3 Error

```json
{
  "success": false,
  "message": "API key inválida"
}
```

| Status | Significado |
|--------|-------------|
| 200    | OK |
| 400    | Parámetro inválido (ej: `from` en formato incorrecto) |
| 401    | Falta API key, key inválida, expirada o desactivada |
| 403    | API key sin scope para este endpoint |
| 429    | Rate limit excedido |
| 500    | Error interno |

---

## 3. Parámetros comunes

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit`   | int  | `25`    | Cantidad de registros por página (máx. `100`) |
| `offset`  | int  | `0`     | Desplazamiento para paginación |
| `from`    | date | —       | Filtro de fecha mínima `YYYY-MM-DD` |
| `to`      | date | —       | Filtro de fecha máxima `YYYY-MM-DD` |

---

## 4. Endpoints

### 4.1 `GET /ping`

Health check público (no requiere API key). Sirve para que el satélite verifique conectividad.

```bash
curl https://<host>/api/public/v1/ping
```

```json
{
  "success": true,
  "data": { "status": "ok", "api": "public/v1", "timestamp": "2026-04-06T18:30:00.000Z" }
}
```

---

### 4.2 `GET /tenants`

Lista de sucursales visibles para la API key.
**Scope requerido:** `read:tenants`

Respuesta incluye: `id, name, slug, businessId, subscriptionStatus, createdAt`

---

### 4.3 `GET /products`

Lista de productos del catálogo, scoping por API key.
**Scope requerido:** `read:products`

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `activeOnly` | bool | `true` | Cuando es `false` también devuelve productos soft-deleted |

Respuesta incluye: `id, tenantId, name, stockQuantity, unitPrice, isActive, createdAt, updatedAt`

---

### 4.4 `GET /sales`

Lista de ventas con sus ítems incluidos (eager-loaded).
**Scope requerido:** `read:sales`

Respuesta incluye por item: `id, tenantId, userId, totalAmount, paymentMethod, paymentSplits, saleDate, source, createdAt, items[]`

Cada item tiene: `id, productId, quantity, unitPrice, subtotal, discount, discountConcept`

---

### 4.5 `GET /expenses`

Lista de egresos.
**Scope requerido:** `read:expenses`

Respuesta incluye: `id, tenantId, userId, concept, amount, expenseDate, createdAt`

---

### 4.6 `GET /purchases`

Lista de compras.
**Scope requerido:** `read:purchases`

> Nota: el binario de comprobante (`receipt_data`) **no** se incluye.

Respuesta incluye: `id, tenantId, productId, userId, quantity, cost, price, marginAmount, provider, purchaseDate, createdAt`

---

### 4.7 `GET /metrics`

Agrega ingresos, egresos y saldo neto en un rango de fechas (suma todos los tenants visibles para la key).
**Scope requerido:** `read:metrics`

Respuesta:

```json
{
  "success": true,
  "data": {
    "totalSales": 458200.50,
    "totalSalesCount": 21,
    "totalExpenses": 122000.00,
    "totalExpensesCount": 3,
    "netBalance": 336200.50
  }
}
```

> **Importante:** este endpoint devuelve el agregado de **todos** los tenants visibles para la key. Para obtener métricas por tenant, usar `/sales` y `/expenses` y agrupar por `tenantId`.

---

## 5. Administración de API Keys (interno)

Estas rutas son solo para el panel de Huevos Point. Requieren JWT + rol `superadmin`.

### 5.1 `POST /api/admin/api-keys`

```json
{
  "name": "Dashboard Maestro",
  "businessId": 1,
  "scopes": ["read:all"],
  "rateLimitPerMin": 120
}
```

Respuesta única con `rawKey` — guardarlo en el `.env` del Dashboard Maestro como `HP_API_KEY`.

### 5.2 `GET /api/admin/api-keys`

Lista todas las keys (sin el hash).

### 5.3 `DELETE /api/admin/api-keys/:id`

Revoca una key (`is_active = false`).

---

## 6. Schema de la tabla `api_keys`

```sql
CREATE TABLE api_keys (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(120) NOT NULL,
  key_prefix          VARCHAR(12)  NOT NULL,
  key_hash            VARCHAR(255) NOT NULL UNIQUE,
  business_id         INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  tenant_id           INTEGER REFERENCES tenants(id)    ON DELETE CASCADE,
  scopes              TEXT[] NOT NULL DEFAULT ARRAY['read:all']::TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_min  INTEGER NOT NULL DEFAULT 60,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_scope_check CHECK (business_id IS NOT NULL OR tenant_id IS NOT NULL)
);
```

---

## 7. Changelog

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-04-06 | v1.0 | Versión inicial: tenants, products, sales, expenses, purchases, metrics |
