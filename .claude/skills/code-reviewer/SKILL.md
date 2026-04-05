---
name: code-reviewer
description: Code review del Dashboard Maestro — JavaScript ES6+, Express.js, Sequelize, React 19, MUI v6. Verificar: aislamiento cross-tenant en queries, generación segura de JWT, no exposición de datos sensibles, manejo de errores async/await, patrones React (hooks, context), y convenciones del proyecto (sessionStorage, formato moneda ARS, Skeleton loading).
---

## Code Review Dashboard Maestro — Checklist

### Backend — Puntos críticos
- [ ] Toda query de negocio tiene `WHERE tenant_id = :id` (no queries sin filtro)
- [ ] `parseInt(tenantId)` siempre que se reciba un ID de param
- [ ] `try/catch` en todos los handlers async con `next(error)` al final
- [ ] El JWT generado para auto-login tiene el formato exacto esperado por la app de negocios
- [ ] `superadminAuditLog.create()` se llama en rutas cross-tenant
- [ ] Variables de entorno accedidas via `environment.js`, nunca `process.env.X` directo
- [ ] No hay `console.log` con datos sensibles (passwords, tokens, IPs de usuarios)

### Frontend — Puntos críticos
- [ ] `sessionStorage` (no `localStorage`) para token y user
- [ ] Formato moneda con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`
- [ ] `Skeleton` en lugar de spinners para loading states
- [ ] Redirect a `/login` en 401 (en el interceptor de axios)
- [ ] Manejo de null/undefined: métricas con `?? 0` para evitar NaN
- [ ] No exponer URL de la API de negocios hardcodeada (usar `import.meta.env.VITE_API_URL`)
- [ ] `window.open(url, '_blank', 'noopener,noreferrer')` para el auto-login (seguridad)

### Anti-patrones detectados en la app de negocios (no repetir)
- `console.log` en producción
- Queries Sequelize sin `where` (fetch all sin filtro)
- `sessionStorage.getItem('user')` sin verificar null antes de `JSON.parse`

### Convenciones del proyecto
- Nombre de archivos: `PascalCase.jsx` para componentes, `camelCase.js` para utils
- Responses del backend: `{ success: true, data: {...} }` o `{ success: false, message: '...' }`
- Idioma: español en mensajes de error al usuario, inglés en código y variables


# Code Reviewer

Complete toolkit for code reviewer with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Pr Analyzer
python scripts/pr_analyzer.py [options]

# Script 2: Code Quality Checker
python scripts/code_quality_checker.py [options]

# Script 3: Review Report Generator
python scripts/review_report_generator.py [options]
```

## Core Capabilities

### 1. Pr Analyzer

Automated tool for pr analyzer tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/pr_analyzer.py <project-path> [options]
```

### 2. Code Quality Checker

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/code_quality_checker.py <target-path> [--verbose]
```

### 3. Review Report Generator

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/review_report_generator.py [arguments] [options]
```

## Reference Documentation

### Code Review Checklist

Comprehensive guide available in `references/code_review_checklist.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Coding Standards

Complete workflow documentation in `references/coding_standards.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Common Antipatterns

Technical reference guide in `references/common_antipatterns.md`:

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
python scripts/code_quality_checker.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/code_review_checklist.md`
- `references/coding_standards.md`
- `references/common_antipatterns.md`

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
python scripts/code_quality_checker.py .
python scripts/review_report_generator.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/common_antipatterns.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/code_review_checklist.md`
- Workflow Guide: `references/coding_standards.md`
- Technical Guide: `references/common_antipatterns.md`
- Tool Scripts: `scripts/` directory
