---
name: senior-qa
description: QA del Dashboard Maestro — tests del backend Express con Jest + Supertest, tests del frontend con Vitest + Testing Library. Casos críticos: aislamiento cross-tenant, auto-login JWT, métricas del día, auditoría. Usar para escribir tests, revisar edge cases y validar el flujo completo superadmin.
---

## QA Dashboard Maestro — Estrategia de tests

### Backend (Jest + Supertest)
Tests críticos a cubrir:
1. `POST /api/auth/login` — login válido superadmin, credenciales inválidas, usuario no superadmin
2. `GET /api/tenants` — requiere auth, devuelve lista, estructura de respuesta correcta
3. `GET /api/tenants/:id/today` — métricas del día correctas (ventas - egresos = neto)
4. `GET /api/tenants/:id/access-token` — JWT generado es válido y tiene el formato correcto
5. Auditoría: verificar que `superadmin_audit_log` se crea en acciones cross-tenant

### Frontend (Vitest + Testing Library)
Tests críticos:
1. `LoginPage` — submit correcto, manejo de error 401, loading state
2. `DashboardPage` — renderiza lista de tenants, skeleton mientras carga
3. `TenantDetailPage` — muestra métricas del día, botones suspend/reactivate
4. `AuthContext` — login guarda en sessionStorage, logout limpia sessionStorage

### Edge cases importantes
- Tenant con 0 ventas y 0 egresos hoy → neto = 0 (no NaN ni null)
- Tenant con egresos > ventas → neto negativo (mostrar en rojo)
- tenantId inválido (string, negativo) → 400 Bad Request
- Token expirado → redirect a /login
- Superadmin intenta acceder a ruta de otro rol → 403

### Test de aislamiento cross-tenant
```javascript
// Verificar que las métricas de tenant A NO incluyen datos de tenant B
test('tenant A metrics only include tenant A data', async () => {
  const res = await request(app)
    .get('/api/tenants/1/today')
    .set('Authorization', `Bearer ${superadminToken}`);
  
  expect(res.body.data.total_ventas_hoy).toBe(expectedTenantARevenue);
  // No debe incluir ventas del tenant 2
});
```

### Cobertura mínima objetivo
- Backend: 75% de líneas en rutas y servicios
- Frontend: 60% de líneas en páginas y contextos


# Senior Qa

Complete toolkit for senior qa with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Test Suite Generator
python scripts/test_suite_generator.py [options]

# Script 2: Coverage Analyzer
python scripts/coverage_analyzer.py [options]

# Script 3: E2E Test Scaffolder
python scripts/e2e_test_scaffolder.py [options]
```

## Core Capabilities

### 1. Test Suite Generator

Automated tool for test suite generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/test_suite_generator.py <project-path> [options]
```

### 2. Coverage Analyzer

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/coverage_analyzer.py <target-path> [--verbose]
```

### 3. E2E Test Scaffolder

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/e2e_test_scaffolder.py [arguments] [options]
```

## Reference Documentation

### Testing Strategies

Comprehensive guide available in `references/testing_strategies.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Test Automation Patterns

Complete workflow documentation in `references/test_automation_patterns.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Qa Best Practices

Technical reference guide in `references/qa_best_practices.md`:

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
python scripts/coverage_analyzer.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/testing_strategies.md`
- `references/test_automation_patterns.md`
- `references/qa_best_practices.md`

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
python scripts/coverage_analyzer.py .
python scripts/e2e_test_scaffolder.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/qa_best_practices.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/testing_strategies.md`
- Workflow Guide: `references/test_automation_patterns.md`
- Technical Guide: `references/qa_best_practices.md`
- Tool Scripts: `scripts/` directory
