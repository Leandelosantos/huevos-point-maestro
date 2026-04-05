---
name: senior-devops
description: Deploy del Dashboard Maestro en Vercel serverless. 2 proyectos separados: backend (Express + Sequelize) y frontend (Vite + React). Variables de entorno críticas (JWT_SECRET compartido con app de negocios, DATABASE_URL Neon). Usar para configurar vercel.json, variables de entorno, dominios y deploy.
---

## DevOps Dashboard Maestro — Guía de deploy en Vercel

### Estructura de deploy
- **Proyecto 1**: `dashboard-maestro-api` → backend Express (carpeta `backend/`)
- **Proyecto 2**: `dashboard-maestro-web` → frontend Vite React (carpeta `frontend/`)

### backend/vercel.json
```json
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
}
```

### frontend/vercel.json
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Variables de entorno del backend (Vercel → Settings → Environment Variables)
| Variable | Valor | Crítico |
|----------|-------|---------|
| `DB_HOST` | host Neon PostgreSQL | ✅ |
| `DB_PORT` | 5432 | ✅ |
| `DB_NAME` | nombre de la DB | ✅ |
| `DB_USER` | usuario DB | ✅ |
| `DB_PASSWORD` | password DB | ✅ |
| `JWT_SECRET` | **MISMO** que la app de negocios | ⚠️ CRÍTICO |
| `JWT_EXPIRES_IN` | 8h | ✅ |
| `NODE_ENV` | production | ✅ |
| `CORS_ORIGIN` | URL del frontend del Dashboard Maestro | ✅ |
| `APP_URL` | `https://huevos-point-gcbg.vercel.app` | ✅ |

### Variables de entorno del frontend (Vercel → Settings → Environment Variables)
| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | URL del backend del Dashboard Maestro |

### Patrón de entry point para Vercel (backend/api/index.js)
```javascript
require('pg');
const app = require('../src/app');
module.exports = app;
```

### Consideraciones Neon PostgreSQL (serverless)
- Usar `ssl: { require: true, rejectUnauthorized: false }` en producción
- Pool: max 5 conexiones (Neon tiene límites en plan gratuito)
- Timeout de conexión: 30s

### Dev local
```bash
# Backend
cd backend && npm install && npm run dev  # puerto 3001

# Frontend
cd frontend && npm install && npm run dev  # puerto 5174
```

### .env para desarrollo local
Copiar el `.env` de la app de negocios existente — mismas credenciales de DB y JWT_SECRET.


# Senior Devops

Complete toolkit for senior devops with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Pipeline Generator
python scripts/pipeline_generator.py [options]

# Script 2: Terraform Scaffolder
python scripts/terraform_scaffolder.py [options]

# Script 3: Deployment Manager
python scripts/deployment_manager.py [options]
```

## Core Capabilities

### 1. Pipeline Generator

Automated tool for pipeline generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/pipeline_generator.py <project-path> [options]
```

### 2. Terraform Scaffolder

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/terraform_scaffolder.py <target-path> [--verbose]
```

### 3. Deployment Manager

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/deployment_manager.py [arguments] [options]
```

## Reference Documentation

### Cicd Pipeline Guide

Comprehensive guide available in `references/cicd_pipeline_guide.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Infrastructure As Code

Complete workflow documentation in `references/infrastructure_as_code.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Deployment Strategies

Technical reference guide in `references/deployment_strategies.md`:

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
python scripts/terraform_scaffolder.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/cicd_pipeline_guide.md`
- `references/infrastructure_as_code.md`
- `references/deployment_strategies.md`

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
python scripts/terraform_scaffolder.py .
python scripts/deployment_manager.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/deployment_strategies.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/cicd_pipeline_guide.md`
- Workflow Guide: `references/infrastructure_as_code.md`
- Technical Guide: `references/deployment_strategies.md`
- Tool Scripts: `scripts/` directory
