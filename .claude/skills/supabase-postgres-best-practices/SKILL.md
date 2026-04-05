---
name: supabase-postgres-best-practices
description: Optimización PostgreSQL para la DB de Huevos Point (Neon serverless). Índices existentes en sales(tenant_id, sale_date), expenses(tenant_id, expense_date). Usar para revisar queries del Dashboard Maestro, validar uso de índices, optimizar agregaciones de métricas diarias y verificar que las queries cross-tenant usen los índices compuestos correctamente.
license: MIT
metadata:
  author: supabase
  version: "1.0.0"
---

# Postgres Best Practices — Dashboard Maestro (Huevos Point)

## Índices existentes en la DB de la app de negocios
```sql
-- Índices de performance ya aplicados en la app de negocios
CREATE INDEX sales_tenant_date_idx ON sales (tenant_id, sale_date);
CREATE INDEX expenses_tenant_date_idx ON expenses (tenant_id, expense_date);
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX products_tenant_active_idx ON products (tenant_id, is_active);
CREATE INDEX audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_sa_audit_date ON superadmin_audit_log (created_at DESC);
CREATE INDEX idx_sa_audit_tenant ON superadmin_audit_log (target_tenant);
```

## Queries críticas del Dashboard Maestro — Patrones optimizados

### Métricas del día por tenant (usa índice compuesto)
```sql
-- Ventas de hoy — usa sales_tenant_date_idx
SELECT COALESCE(SUM(total_amount), 0) as total_ventas_hoy, COUNT(*) as cantidad_ventas
FROM sales
WHERE tenant_id = $1 AND sale_date = CURRENT_DATE;

-- Egresos de hoy — usa expenses_tenant_date_idx
SELECT COALESCE(SUM(amount), 0) as total_egresos_hoy, COUNT(*) as cantidad_egresos
FROM expenses
WHERE tenant_id = $1 AND expense_date = CURRENT_DATE;
```

### Lista de tenants con conteos (subqueries correlacionadas)
```sql
-- Para conteo de usuarios por tenant: usa tabla user_tenants
SELECT COUNT(*) FROM user_tenants WHERE tenant_id = $1;
-- No usar User.count con include (genera LEFT JOIN costoso)
```

## Consideraciones Neon serverless
- Connection pool: máximo 5 conexiones (plan gratuito Neon)
- Cold starts: primera query puede ser lenta (hasta 2s) — no es error
- `ssl: { require: true, rejectUnauthorized: false }` obligatorio en producción

## Comprehensive performance optimization guide for Postgres, maintained by Supabase. Contains rules across 8 categories, prioritized by impact to guide automated query optimization and schema design.

## When to Apply

Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## How to Use

Read individual rule files for detailed explanations and SQL examples:

```
rules/query-missing-indexes.md
rules/schema-partial-indexes.md
rules/_sections.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect SQL example with explanation
- Correct SQL example with explanation
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
