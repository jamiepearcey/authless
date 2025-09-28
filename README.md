# Authless — SaaS Architecture Foundation (WIP)

**Work in Progress**: This project is an advanced SaaS architecture **foundation** under active development.  
It demonstrates event-driven microservices, multi-tenancy, real-time capabilities, and authentication patterns.  
The goal is to provide a **reference implementation and learning resource**, not a turnkey product.

---

## What is this?

Authless is a **self-hosted, production-inspired architecture reference** that shows how to assemble:
- Event-driven communication with reliable delivery,
- Tenant-aware data and routing,
- Real-time updates,
- A TypeScript-first developer workflow.

Some parts are complete, others are in progress, and several are still planned. Treat this as a **blueprint** you can study or extend.

---

## Core Architecture Highlights

- **Event-driven** — NATS JetStream with outbox pattern  
- **Multi-tenancy** — PostgreSQL with tenant isolation; PgBouncer for pooling  
- **Auth** — Passkeys (WebAuthn), MFA, session management (SSO planned)  
- **Realtime** — Centrifugo WebSocket server  
- **Microservices** — Audit, Email, Webhook, Realtime (partially implemented)  
- **DX** — TypeScript end-to-end (tRPC + Zod), pnpm/Turbo, Docker Compose

> **Current focus:** microservice functionality, testing, and hardening.

---

## Project Status (high level)

| Area                   | Status        | Notes                                           |
|------------------------|---------------|-------------------------------------------------|
| Event bus + outbox     | Mostly done| JetStream integration, retries, metrics         |
| Multi-tenant database  | Mostly done| Isolation via Postgres + Prisma schema          |
| Authentication         | Mostly done| Passkeys & MFA; SSO to come                     |
| Realtime (Centrifugo)  | Mostly done| Server wired; UI integration ongoing            |
| Microservices          | Mostly done| Audit/Email/Webhook/Realtime present            |
| Temporal workflows     | Planned    | Base config present; domain flows TBD           |
| Testing & hardening    | Planned    | Integration/E2E tests, security headers, limits |

The table above reflects practical readiness based on current implementation status.

---

## Architecture Overview

- **Web app** (Next.js + tRPC) writes domain events to an **Outbox** table.  
- **Outbox processor** publishes reliably to **JetStream**.  
- **Consumers** (Audit, Email, Webhook, Realtime) react to events.  
- **PostgreSQL** remains source of truth with an audit trail.  
- **Centrifugo** pushes real-time updates to clients.  
- **Temporal** is available for workflow orchestration (prototype stage).

---

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/your-org/authless.git
   cd authless
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your settings
   ```

3. **Start infrastructure:**
   ```bash
   ./dev.sh
   ```

4. **Access the application:**
   - Web app: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

### Default Credentials

- **Admin user:** admin@authless.uk / password123
- **Regular user:** user@authless.uk / password123

---

## Development

### Project Structure

```
├── apps/web/                 # Next.js web application
├── packages/                 # Shared packages
│   ├── db/                  # Database schema and migrations
│   ├── trpc/                # tRPC API definitions
│   ├── ui/                  # Shared UI components
│   └── shared/              # Common utilities
├── services/                # Microservices
│   ├── audit-service/       # Audit logging service
│   ├── email-service/       # Email processing
│   ├── webhook-service/     # Webhook handling
│   └── realtime-service/    # Real-time updates
└── workflows/               # Temporal workflows
```

### Key Commands

```bash
# Start all services
./dev.sh

# Run tests
pnpm test

# Database operations
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Build for production
pnpm build
```

---

## Architecture Details

### Event-Driven Communication

The system uses NATS JetStream for reliable event delivery:

1. **Domain events** are written to an `Outbox` table
2. **Outbox processor** publishes events to JetStream
3. **Consumers** process events asynchronously
4. **Retry logic** handles failures gracefully

### Multi-Tenancy

- **Tenant isolation** via PostgreSQL schemas
- **PgBouncer** for connection pooling
- **Tenant-aware routing** in the web application
- **Role-based access control** (RBAC)

### Authentication

- **Passkeys (WebAuthn)** for passwordless authentication
- **Multi-factor authentication** (MFA) support - SMS, OTP, Email
- **Password auth, Invite links etc
- **Session management** with secure cookies
- **SSO integration** (in-progress)

### Real-time Updates

- **Centrifugo** WebSocket server
- **Event-driven** real-time notifications
- **Tenant-aware** message routing

---

## Contributing

This is a learning project. Contributions are welcome, but please understand:

1. **Focus on learning** and sharing knowledge
2. **Document your changes** thoroughly
3. **Follow existing patterns** and conventions
4. **Test your changes** before submitting

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing tRPC patterns
- Write tests for new functionality
- Update documentation as needed

---

## License

This project is licensed under a custom license that reserves commercial rights. See [LICENSE](LICENSE) for details.

**For commercial use, please contact the author for licensing terms.**

---

## Acknowledgments

This project draws inspiration from various open-source projects and architectural patterns. It's designed as a learning resource to help developers understand complex SaaS architectures.

---

*Clone, explore, and learn from a production-quality foundation that showcases advanced patterns typically taking months to implement correctly.*