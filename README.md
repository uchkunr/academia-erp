# Academia

A high-performance, modular Educational Resource Planning (ERP) API built on Bun, Elysia, and Prisma.

Academia provides the core backend services for academic administration, ledger tracking, and biometric hardware integrations.

## Architectural Overview

The system is designed with a monolithic modular structure to isolate domains while minimizing architectural complexity.

- **High-Throughput Execution** - Built on Bun and Elysia for low-latency request handling, AOT compilation, and fast routing.
- **Biometric Integration** - Features an event-driven sync service for Hikvision face-recognition terminals (DS-K1T341CM).
- **Financial Ledger Integrity** - Ledger-based balance tracking, course pricing tariffs, and audit logs.
- **Type-Safe Domain Validation** - Static-time and run-time validation schemas powered by Zod and Elysia.

## Domain Structure

The codebase is organized into modular features:

- `auth` - Role-based access control (RBAC) and token verification.
- `users` / `students` - Directory services for staff and students.
- `courses` / `groups` / `lessons` - Class scheduling, room allocation, and curriculum.
- `attendance` / `grades` - Real-time attendance parsing and academic records.
- `payments` / `finance` - Ledger transaction entries, discount models, and cashier close-outs.
- `reports` - Profitability calculations and performance analytics.
- `devices` - Biometric terminal registry and configuration.

## System Setup

### Prerequisites

- Bun v1.x
- PostgreSQL

### Local Bootstrap

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configuration:

   ```bash
   cp .env.example .env
   ```

3. Database Initialization:

   ```bash
   bun run db:generate
   bun run db:push
   bun run db:seed
   ```

4. Launch Server:
   ```bash
   bun run dev
   ```
   - API Endpoint: `http://localhost:3000`
   - OpenAPI Specs: `http://localhost:3000/openapi`

### Verification & Compilation

- **Format & Lint**: `bun run lint`
- **Unit Tests**: `bun run test`
- **Build Node**: `bun run build:node`
- **Build Bun Standalone**: `bun run build:bun`

## Docker Orchestration

The project includes a multi-stage distroless build for minimal production images:

```bash
docker-compose up -d --build
```

Services exposed:

- `api` (Academia core) - Port 3000
- `db` (PostgreSQL 18) - Port 5432

## Contribution

For development workflows and commit formatting guidelines, refer to [CONTRIBUTING.md](CONTRIBUTING.md).
