---
name: senior-security
description: Seguridad del Dashboard Maestro — JWT cross-app, autenticación superadmin, auditoría de accesos, CORS restrictivo, rate limiting, helmet, validación de inputs. Usar para revisar middleware de auth, validar generación de tokens, auditar queries SQL, revisar exposición de datos sensibles entre tenants.
---

## Seguridad Dashboard Maestro — Checklist y guías

### Autenticación y JWT
- El `JWT_SECRET` es el mismo que la app de negocios — proteger con máxima prioridad
- Tokens de auto-login: expiración de 1 hora máximo
- NUNCA exponer `JWT_SECRET` en el frontend ni en logs
- Verificar `role === 'superadmin'` en cada endpoint protegido
- El JWT del auto-login debe incluir solo lo necesario (id, username, fullName, role, tenants)

### Aislamiento de datos cross-tenant
- El Dashboard Maestro SOLO puede leer datos de todos los tenants (cross-tenant read)
- Las queries de métricas deben incluir `tenant_id = :id` explícitamente
- NUNCA devolver datos de un tenant a quien pide datos de otro
- Retornar 404 (no 403) cuando no se encuentra un tenant (no confirmar existencia)

### CORS
```javascript
// Solo permitir el dominio del frontend del Dashboard Maestro
origin: process.env.CORS_ORIGIN || 'https://dashboard-maestro.vercel.app'
```

### Rate limiting
```javascript
// Login: máximo 10 intentos / 15 minutos (brute-force protection)
// General: 200 req / 15 minutos
```

### Headers de seguridad (Helmet)
- Content-Security-Policy habilitado
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### Auditoría
- Todo acceso cross-tenant se loguea en `superadmin_audit_log` con: acción, tenant afectado, IP, detalles
- El log es append-only — nunca borrar registros de auditoría

### Inputs peligrosos
- `tenantId` en params: siempre `parseInt()` + validar que sea > 0
- `limit`/`offset` en paginación: clamp a valores razonables (max 100)
- Sanitizar cualquier string antes de usarlo en queries (Sequelize maneja esto con parametrización)

### Lo que NO hacer
- NUNCA aceptar `tenant_id` del body/query del frontend para determinar acceso
- NUNCA exponer passwords, hashes o tokens en las respuestas
- NUNCA loguear el contenido del JWT o las credenciales


# Senior Security

Complete toolkit for senior security with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Threat Modeler
python scripts/threat_modeler.py [options]

# Script 2: Security Auditor
python scripts/security_auditor.py [options]

# Script 3: Pentest Automator
python scripts/pentest_automator.py [options]
```

## Core Capabilities

### 1. Threat Modeler

Automated tool for threat modeler tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/threat_modeler.py <project-path> [options]
```

### 2. Security Auditor

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/security_auditor.py <target-path> [--verbose]
```

### 3. Pentest Automator

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/pentest_automator.py [arguments] [options]
```

## Reference Documentation

### Security Architecture Patterns

Comprehensive guide available in `references/security_architecture_patterns.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Penetration Testing Guide

Complete workflow documentation in `references/penetration_testing_guide.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Cryptography Implementation

Technical reference guide in `references/cryptography_implementation.md`:

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
python scripts/security_auditor.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/security_architecture_patterns.md`
- `references/penetration_testing_guide.md`
- `references/cryptography_implementation.md`

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
python scripts/security_auditor.py .
python scripts/pentest_automator.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/cryptography_implementation.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/security_architecture_patterns.md`
- Workflow Guide: `references/penetration_testing_guide.md`
- Technical Guide: `references/cryptography_implementation.md`
- Tool Scripts: `scripts/` directory
