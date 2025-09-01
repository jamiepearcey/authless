# Authless - Architecture & Conventions Guide

## 🏗️ **Project Structure Overview**

```
authless/
├── apps/                    # Next.js web applications
│   └── web/               # Main web application
├── packages/               # Shared packages and libraries
│   ├── ui/                # UI component library
│   ├── trpc/              # tRPC API definitions
│   ├── db/                # Database schema and client
│   ├── shared/            # Shared utilities and types
│   ├── outbox-processor/ # Publishes events from outbox to jetstream bus
│   ├── jetstream-service-wrapper/  # Infrastructure package
│   ├── realtime-consumer/ # Domain-specific consumer
│   ├── audit-consumer/    # Domain-specific consumer
│   ├── email-consumer/    # Domain-specific consumer
│   └── webhook-consumer/  # Domain-specific consumer
├── services/               # Standalone services
│   ├── realtime-service/  # Realtime event processing service
│   └── audit-service/     # Audit event processing service
└── pnpm-workspace.yaml    # Workspace configuration
```

## 🎯 **Architecture Principles**

### **Separation of Concerns**
- **Domain-specific logic** → Lives in `services/` and `packages/*-consumer/`
- **Domain-agnostic infrastructure** → Lives in `packages/jetstream-service-wrapper/`
- **Shared business logic** → Lives in `packages/shared/` and `packages/trpc/`
- **UI components** → Live in `packages/ui/`

### **Service Pattern**
- **Services** (`services/*/`) contain domain-specific business logic
- **Consumers** (`packages/*-consumer/`) contain domain-specific event processing
- **Wrapper** (`packages/jetstream-service-wrapper/`) provides infrastructure (NATS, health checks, metrics)

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

## 🔄 **Data Flow Architecture**

### **Event-Driven Flow**
```
1. Application Event → NATS Stream
2. Consumer Package → Processes Event
3. Service Layer → Business Logic + Storage
4. Database → Persistent Storage
5. Real-time → Centrifugo → Web Clients
```

### **API Flow**
```
1. Web Client → tRPC Call
2. tRPC Router → Business Logic
3. Database → Data Access
4. Response → Client
```

## 🗄️ **Database Schema (`packages/db/`)**

### **Core Tables**
- **`users`**: User accounts and authentication
- **`tenants`**: Multi-tenant organization data
- **`support_cases`**: Support ticket management
- **`audit_events`**: Audit trail and compliance
- **`outbox_events`**: Event sourcing and reliability

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

### **Required Environment Variables**
```bash
# Database
DATABASE_URL="postgresql://..."

# NATS
NATS_URL="nats://localhost:4222"

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="..."

# External Services
CENTRIFUGO_URL="..."
CENTRIFUGO_API_KEY="..."
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

## 🚀 **Development Workflow**

### **Package Development**
```bash
# Install dependencies
pnpm install

# Build packages
pnpm --filter @jetstream/service-wrapper build

# Run tests
pnpm --filter @jetstream/service-wrapper test

# Watch mode
pnpm --filter @jetstream/service-wrapper dev
```

### **Service Development**
```bash
# Build service
cd services/realtime-service
pnpm run build

# Start service
pnpm run start:dev

# Run tests
pnpm run test
```

### **Application Development**
```bash
# Start web app
cd apps/web
pnpm run dev

# Build for production
pnpm run build
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
