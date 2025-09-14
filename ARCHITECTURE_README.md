# Authless - Advanced SaaS Architecture Foundation & Implementation Guide

**⚠️ WORK IN PROGRESS**: This architecture documentation reflects the current implementation state. Many services are in various stages of completion.

## 🏗️ **Project Structure Overview**

```
authless/
├── apps/                          # Next.js web applications
│   └── web/                     # Main web application ✅
├── packages/                     # Shared packages and libraries
│   ├── ui/                      # UI component library ✅
│   ├── trpc/                    # tRPC API definitions ✅
│   ├── db/                      # Database schema and client ✅
│   ├── stripe/                  # Payment integration ✅
│   ├── i18n-core/               # LLM translation system ⚠️ 60%
│   ├── outbox-processor/        # Publishes events from outbox to jetstream ✅
│   ├── jetstream-service-wrapper/ # Infrastructure package ✅
│   ├── realtime-consumer/       # Domain-specific consumer ⚠️ 75%
│   ├── audit-consumer/          # Domain-specific consumer ⚠️ 75%
│   ├── email-consumer/          # Domain-specific consumer ⚠️ 80%
│   └── webhook-consumer/        # Domain-specific consumer ⚠️ 70%
├── services/                     # Standalone services
│   ├── realtime-service/        # Realtime event processing service ⚠️ 80%
│   ├── audit-service/           # Audit event processing service ⚠️ 75%
│   ├── email-service/           # Email workflows ⚠️ 80%
│   └── webhook-service/         # External integrations ⚠️ 70%
├── workflows/                    # Temporal workflow definitions ⚠️ 40%
└── pnpm-workspace.yaml          # Workspace configuration ✅
```

## 🎯 **Architecture Principles** ✅ (Implemented)

### **Separation of Concerns**
- **Domain-specific logic** → Lives in `services/` and `packages/*-consumer/`
- **Domain-agnostic infrastructure** → Lives in `packages/jetstream-service-wrapper/`
- **Shared business logic** → Lives in `packages/trpc/` (no `packages/shared/` currently)
- **UI components** → Live in `packages/ui/`
- **Database access** → Centralized in `packages/db/`

### **Service Pattern** ⚠️ (75% Complete)
- **Services** (`services/*/`) contain domain-specific business logic
- **Consumers** (`packages/*-consumer/`) contain domain-specific event processing
- **Wrapper** (`packages/jetstream-service-wrapper/`) provides infrastructure (NATS, health checks, metrics)
- **Integration** between services and consumers is partially implemented
- **Health monitoring** and **metrics** are implemented but not fully configured

## 📦 **Package Layer (`packages/`)**

### **Infrastructure Packages**
- **`@jetstream/service-wrapper`**: Core infrastructure for all services
  - NATS JetStream integration
  - Health checks and graceful shutdown
  - Prometheus metrics
  - Retry policies and DLQ handling
  - Service lifecycle management

### **Domain Consumer Packages**
- **`@jetstream/realtime-consumer`**: Real-time event processing
- **`@jetstream/audit-consumer`**: Audit event processing
- **`@jetstream/email-consumer`**: Email processing with React Email templates
- **`@jetstream/webhook-consumer`**: Webhook delivery and processing

### **Shared Packages**
- **`@db/base`**: Database schema, Prisma client, migrations
- **`@trpc`**: API definitions, routers, and procedures
- **`@ui`**: Reusable UI components
- **`@shared`**: Common utilities, types, and constants

## 🚀 **Service Layer (`services/`)**

### **Service Architecture Pattern**
```typescript
// Every service follows this pattern:
export class DomainService {
  private wrapper: JetStreamServiceWrapper;
  
  constructor(config: ServiceConfig) {
    // Initialize domain-specific resources
    // Create JetStreamServiceWrapper with domain logic
    this.wrapper = new JetStreamServiceWrapper(this.createJetStreamService(), config);
  }
  
  private createJetStreamService(): JetStreamService {
    return {
      hooks: { beforeStart, afterStop, onError },
      processMessage: async (data, ctx) => { /* domain logic */ },
      healthCheck: async () => { /* domain health checks */ }
    };
  }
}
```

### **Service Responsibilities**
- **Domain Logic**: Business rules, data processing, external integrations
- **Configuration**: Service-specific settings and environment variables
- **Resource Management**: Database connections, external service clients
- **Error Handling**: Domain-specific error handling and retry logic

## 🏠 **Application Layer (`apps/web/`)**

### **Next.js Application Structure**
- **Pages**: Route-based components (`app/*/page.tsx`)
- **Components**: Reusable UI components
- **API Routes**: Server-side API endpoints (`app/api/*/route.ts`)
- **Hooks**: Custom React hooks for business logic
- **Services**: Client-side service integrations

### **Key Conventions**
- Use `@ui` package for all UI components
- Use `@trpc` for all API calls
- Use `@db/base` for direct database access (if needed)
- Keep business logic in hooks and services, not in components

## 🔄 **Data Flow Architecture** ✅ (Core Implementation Complete)

### **Event-Driven Flow** (Outbox Pattern)
```
1. Application Event → OutboxEvent (PostgreSQL)
2. Outbox Processor → NATS JetStream (Reliable Publishing)
3. Consumer Package → Processes Event from Stream
4. Service Layer → Business Logic + Storage
5. Database → Persistent Storage (Audit Trail)
6. Real-time → Centrifugo → Web Clients
```

### **API Flow** (Direct tRPC)
```
1. Web Client → tRPC Call
2. tRPC Router → Business Logic
3. Database → Direct Data Access
4. Response → Client
```

### **Current Implementation Status**
- **Outbox Pattern**: ✅ Complete with PostgreSQL LISTEN/NOTIFY
- **NATS Integration**: ✅ JetStream with deduplication and DLQ
- **Service Consumers**: ⚠️ 75% complete (basic functionality working)
- **Real-time Updates**: ⚠️ 80% complete (Centrifugo integration active)

## 🗄️ **Database Schema (`packages/db/`)**

### **Core Tables**
- **`users`**: User accounts and authentication
- **`tenants`**: Multi-tenant organization data
- **`support_cases`**: Support ticket management
- **`audit_events`**: Audit trail and compliance
- **`OutboxEvent`**: Event sourcing and reliability

### **Key Conventions**
- Use Prisma for all database access
- All tables have `id`, `createdAt`, `updatedAt`
- Multi-tenant tables include `tenantId`
- Audit tables follow the audit event schema
- Use migrations for schema changes

## 🎨 **UI Component System (`packages/ui/`)**

### **Component Categories**
- **Forms**: Inputs, buttons, form controls
- **Layout**: Containers, grids, navigation
- **Data Display**: Tables, cards, lists
- **Feedback**: Alerts, notifications, loading states
- **Navigation**: Sidebars, breadcrumbs, menus

### **Design System**
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animations and transitions
- **Radix UI**: Accessible component primitives
- **Consistent Spacing**: 4px base unit system
- **Color Palette**: Semantic color usage

## 🔌 **API Design (`packages/trpc/`)**

### **Router Structure**
```typescript
// Main router combines all domain routers
export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  tenants: tenantRouter,
  support: supportRouter,
  // ... other domains
});
```

### **Procedure Conventions**
- **Query**: Read operations (GET)
- **Mutation**: Write operations (POST/PUT/DELETE)
- **Subscription**: Real-time updates
- **Input Validation**: Zod schemas for all inputs
- **Error Handling**: Consistent error responses

## 🚦 **Environment & Configuration**

### **Required Environment Variables** (Actual Ports from docker-compose.yml)
```bash
# Database (PostgreSQL via PgBouncer)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/authless"

# NATS JetStream (Custom ports to avoid conflicts)
NATS_URL="nats://localhost:4223"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# External Services
CENTRIFUGO_URL="http://localhost:8000"
CENTRIFUGO_API_KEY="your-api-key-change-in-production"

# Temporal
TEMPORAL_ADDRESS="localhost:7233"

# Stripe (if using payments)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### **Configuration Patterns**
- Use environment variables for all configuration
- Provide sensible defaults for development
- Validate configuration at startup
- Use typed configuration interfaces

## 🧪 **Testing Strategy**

### **Test Types**
- **Unit Tests**: Individual function/component testing
- **Integration Tests**: Service integration testing
- **E2E Tests**: Full user journey testing
- **Contract Tests**: API contract validation

### **Test Conventions**
- Use Vitest for unit and integration tests
- Use Playwright for E2E tests
- Mock external dependencies
- Test both success and error paths

## 🚀 **Development Workflow** (Updated Commands)

### **Complete Development Setup**
```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, NATS, Centrifugo, Temporal)
docker compose up -d

# Initialize database
pnpm run db:migrate

# Start web app only (recommended for frontend work)
pnpm run dev:web

# OR start web app + essential services
pnpm run dev:essential

# OR start everything (web app + all microservices)
pnpm run dev:all
```

### **Service Development** ⚠️ (Manual Process)
```bash
# Build specific service
cd services/audit-service
pnpm run build

# Start service individually
pnpm run start:dev

# Test service integration
node tests/manual-verification.js
```

### **Package Development**
```bash
# Build core packages
pnpm run build --filter @jetstream/service-wrapper
pnpm run build --filter @outbox/processor

# Watch mode for development
pnpm --filter @jetstream/service-wrapper dev
```

## 🔍 **Debugging & Monitoring**

### **Health Checks**
- **Lightship**: Service health monitoring
- **Prometheus**: Metrics collection
- **Custom Health Checks**: Domain-specific health indicators

### **Logging**
- **Pino**: Structured logging
- **Log Levels**: error, warn, info, debug
- **Context**: Include relevant IDs and metadata

### **Metrics**
- **Processing Rates**: Messages per second
- **Latency**: Processing time distributions
- **Error Rates**: Failure and retry metrics
- **Resource Usage**: Memory, CPU, connections

## 🚨 **Common Patterns & Anti-Patterns**

### **✅ Do This**
- Use the service wrapper pattern for all services
- Keep domain logic in services, not in consumers
- Use typed interfaces for all configurations
- Implement proper error handling and retries
- Use the UI package for all components

### **❌ Don't Do This**
- Don't put business logic in consumer packages
- Don't bypass the service wrapper
- Don't use `any` types without good reason
- Don't hardcode configuration values
- Don't create UI components outside the UI package

## 🔧 **Troubleshooting Guide**

### **Common Issues**
1. **Module Resolution**: Check `pnpm-workspace.yaml` includes all directories
2. **Type Errors**: Ensure all packages are built and dependencies are correct
3. **Service Startup**: Check environment variables and NATS connectivity
4. **Database Issues**: Verify Prisma schema and migrations

### **Debug Commands**
```bash
# Check workspace status
pnpm list --depth=0

# Build all packages
pnpm run build --recursive

# Check for circular dependencies
pnpm run check:circular

# Run integration tests
pnpm run test:integration
```

## 📚 **Further Reading**

- **JetStream Service Wrapper**: `packages/jetstream-service-wrapper/README.md`
- **Realtime Service**: `services/realtime-service/README.md`
- **Audit Service**: `services/audit-service/README.md`
- **UI Components**: `packages/ui/README.md`
- **Database Schema**: `packages/db/README.md`

---

**Remember**: This architecture emphasizes separation of concerns, reusability, and maintainability. Always consider where new code belongs before implementing it!
