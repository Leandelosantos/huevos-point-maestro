---
name: senior-architect
description: Arquitectura del Dashboard Maestro (superadmin panel) de Huevos Point SaaS. Stack: Node.js + Express + Sequelize + PostgreSQL (Neon) + React 19 + MUI v6 + Vite + Vercel serverless. Shared Schema multi-tenant. JWT cross-app compatible con huevos-point backend. Usar para decisiones de arquitectura, diagramas, trade-offs de integración cross-tenant, y patrones de diseño del sistema.
---

## Contexto del proyecto: Dashboard Maestro — Huevos Point

### ¿Qué es?
Panel administrativo maestro (superadmin) que es una app separada e independiente, desplegada sobre la misma DB PostgreSQL que la app de negocios existente.

### Stack definitivo
- **Backend**: Node.js + Express.js + Sequelize v6 + pg (PostgreSQL Neon serverless)
- **Frontend**: React 19 + Material UI v6 + Vite 6 + React Router v7
- **Auth**: JWT con el mismo `JWT_SECRET` que la app de negocios (para auto-login cross-app)
- **Storage de sesión**: `sessionStorage` (igual que la app de negocios)
- **Deploy**: Vercel serverless — 2 proyectos: `dashboard-maestro-api` y `dashboard-maestro-web`

### Modelo de datos real (DB existente)
| Tabla | Columnas clave |
|-------|----------------|
| `tenants` | id (INT PK), name, is_active (BOOL), subscription_status, slug, created_at |
| `users` | id, username, tenant_id (nullable), email, password, full_name, role (ENUM), is_active |
| `user_tenants` | user_id, tenant_id (pivot M:N) |
| `sales` | id, user_id, tenant_id, total_amount (DECIMAL), payment_method, sale_date (DATE) |
| `expenses` | id, user_id, tenant_id, concept, amount (DECIMAL), expense_date (DATE) |
| `products` | id, tenant_id, name, price, stock, is_active |
| `superadmin_audit_log` | id, admin_user_id, action, target_tenant (INT FK), details (JSONB), ip_address |

### JWT payload (formato exacto que espera la app de negocios)
```json
{
  "id": 1,
  "username": "leanSuper",
  "fullName": "Lean Super Admin",
  "role": "superadmin",
  "tenants": [{ "id": 1, "name": "Sucursal Roosevelt" }, { "id": 2, "name": "Sucursal Amenabar" }]
}
```

### Endpoints existentes en la app de negocios (NO duplicar)
- `POST /api/auth/login` — login con username/password
- `GET /api/superadmin/dashboard` — stats globales (30d)
- `GET /api/superadmin/tenants` — lista tenants con stats 30d
- `GET /api/superadmin/tenants/:id` — detalle tenant (30d)
- `POST /api/superadmin/tenants/:id/suspend`
- `POST /api/superadmin/tenants/:id/reactivate`

### Lo que agrega el Dashboard Maestro (endpoints nuevos)
- `GET /api/tenants/:id/today` — métricas del día (ventas hoy, egresos hoy, neto hoy)
- `GET /api/tenants/:id/access-token` — genera JWT de auto-login para la app de negocios

### Decisiones arquitectónicas tomadas
1. "Tenants" en DB = "sucursales" — no existe entidad "negocio" todavía
2. Color primario azul `#1565C0` para diferenciar visualmente del verde `#2D6A4F` de la app
3. El backend del Dashboard Maestro se conecta directamente a la DB (no proxy)
4. Toda acción del superadmin se loguea en `superadmin_audit_log`


# Senior Architect

Complete toolkit for senior architect with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Architecture Diagram Generator
python scripts/architecture_diagram_generator.py [options]

# Script 2: Project Architect
python scripts/project_architect.py [options]

# Script 3: Dependency Analyzer
python scripts/dependency_analyzer.py [options]
```

## Core Capabilities

### 1. Architecture Diagram Generator

Automated tool for architecture diagram generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/architecture_diagram_generator.py <project-path> [options]
```

### 2. Project Architect

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/project_architect.py <target-path> [--verbose]
```

### 3. Dependency Analyzer

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/dependency_analyzer.py [arguments] [options]
```

## Reference Documentation

### Architecture Patterns

Comprehensive guide available in `references/architecture_patterns.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### System Design Workflows

Complete workflow documentation in `references/system_design_workflows.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Tech Decision Guide

Technical reference guide in `references/tech_decision_guide.md`:

- Technology stack details
- Configuration examples
- Integration patterns
- Security considerations
- Scalability guidelines

## Tech Stack

**Languages:** TypeScript, JavaScript, Python, Go, Swift, Kotlin
**Frontend:** React, Next.js, React Native, Flutter
**Backend:** Node.js, Express, GraphQL, REST APIs
**Database:** PostgreSQL, Prisma, NeonDB, Supabase
**DevOps:** Docker, Kubernetes, Terraform, GitHub Actions, CircleCI
**Cloud:** AWS, GCP, Azure

## Development Workflow

### 1. Setup and Configuration

```bash
# Install dependencies
npm install
# or
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

### 2. Run Quality Checks

```bash
# Use the analyzer script
python scripts/project_architect.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/architecture_patterns.md`
- `references/system_design_workflows.md`
- `references/tech_decision_guide.md`

## Best Practices Summary

### Code Quality
- Follow established patterns
- Write comprehensive tests
- Document decisions
- Review regularly

### Performance
- Measure before optimizing
- Use appropriate caching
- Optimize critical paths
- Monitor in production

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Keep dependencies updated

### Maintainability
- Write clear code
- Use consistent naming
- Add helpful comments
- Keep it simple

## Common Commands

```bash
# Development
npm run dev
npm run build
npm run test
npm run lint

# Analysis
python scripts/project_architect.py .
python scripts/dependency_analyzer.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/tech_decision_guide.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/architecture_patterns.md`
- Workflow Guide: `references/system_design_workflows.md`
- Technical Guide: `references/tech_decision_guide.md`
- Tool Scripts: `scripts/` directory
