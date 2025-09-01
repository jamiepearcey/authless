# Authless London - Architecture & Development Guide

A comprehensive guide to the project's architecture, conventions, and development workflow.

## 🏗️ **Project Architecture Overview**

This project follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  • Next.js Web App (/apps/web)                            │
│  • API Routes (/apps/web/app/api)                         │
│  • UI Components (/packages/ui)                           │
│  • Authentication (NextAuth.js)                           │
│  • Database Client (Prisma)                               │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                           │
│  • Realtime Service (/services/realtime-service)           │
│  • Audit Service (/services/audit-service)                 │
│  • Email Service (future)                                  │
│  • Webhook Service (future)                                │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Package Layer                            │
│  • @jetstream/service-wrapper                              │
│  • @jetstream/realtime-consumer                           │
│  • @jetstream/audit-consumer                              │
│  • @jetstream/email-consumer                              │
│  • @jetstream/webhook-consumer                            │
│  • @db/base                                                │
│  • @ui                                                     │
│  • @trpc                                                   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  • NATS JetStream (Event Streaming)                       │
│  • PostgreSQL (Database)                                   │
│  • Centrifugo (Realtime Communication)                     │
│  • Redis (Caching)                                         │
│  • Stripe (Payments)                                       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 **Directory Structure**

```
authless/
├── apps/                          # Application layer
│   └── web/                      # Next.js web application
│       ├── app/                  # App Router pages
│       ├── components/           # React components
│       ├── hooks/                # Custom React hooks
│       └── lib/                  # Utility libraries
├── packages/                      # Package layer (domain-agnostic)
│   ├── ui/                       # Shared UI components
│   ├── db/                       # Database schema & client
│   ├── trpc/                     # tRPC API layer
│   ├── jetstream-service-wrapper/ # Service infrastructure
│   ├── realtime-consumer/        # Realtime event processing
│   ├── audit-consumer/           # Audit event processing
│   ├── email-consumer/           # Email processing
│   ├── webhook-consumer/         # Webhook processing
│   └── integration-tests/        # End-to-end testing
├── services/                      # Service layer (domain-specific)
│   ├── realtime-service/         # Realtime service
│   ├── audit-service/            # Audit service
│   └── [future-services]/        # Additional services
├── docs/                         # Documentation
├── scripts/                      # Build & deployment scripts
└── pnpm-workspace.yaml          # Workspace configuration
```

## 🎯 **Layer Responsibilities**

### **Application Layer (`/apps`)**
- **Purpose**: User-facing web application
- **Responsibilities**:
  - User interface and experience
  - API route handlers
  - Authentication and authorization
  - Business logic orchestration
  - State management
- **Technologies**: Next.js, React, TypeScript, tRPC

### **Service Layer (`/services`)**
- **Purpose**: Domain-specific business services
- **Responsibilities**:
  - Domain logic implementation
  - Service configuration
  - Custom event handlers
  - Business rules and workflows
  - Service-specific routing
- **Pattern**: Factory pattern with `JetStreamServiceWrapper`

### **Package Layer (`/packages`)**
- **Purpose**: Reusable, domain-agnostic packages
- **Responsibilities**:
  - Infrastructure implementation
  - Common utilities and helpers
  - Shared types and interfaces
  - Cross-cutting concerns
- **Convention**: `@jetstream/*` namespace

### **Infrastructure Layer**
- **Purpose**: External services and data stores
- **Responsibilities**:
  - Event streaming (NATS)
  - Data persistence (PostgreSQL)
  - Realtime communication (Centrifugo)
  - External integrations (Stripe, etc.)

## 🔄 **Data Flow Patterns**

### **Event-Driven Architecture**
```
1. Application Event → NATS Stream
2. Consumer Package → Event Processing
3. Service Layer → Domain Logic
4. Infrastructure → External Systems
5. Response → Back to Application
```

### **Service Communication**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Web App   │───▶│   Service   │───▶│  Consumer  │
│             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   tRPC      │    │   NATS      │    │ PostgreSQL  │
│   API       │    │ JetStream   │    │   Database  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🗄️ **Database Schema**

### **Core Tables**
- **`User`**: User accounts and profiles
- **`Tenant`**: Multi-tenancy support
- **`SupportCase`**: Support ticket management
- **`AuditEvent`**: Audit trail and compliance
- **`ContactMessage`**: Contact form submissions

### **Key Relationships**
- **User** ↔ **Tenant** (Many-to-Many)
- **SupportCase** → **Tenant** (Belongs to)
- **SupportCase** → **User** (Created by)
- **AuditEvent** → **User** (Actor)
- **AuditEvent** → **Tenant** (Context)

### **Schema Conventions**
- **Naming**: PascalCase for models, camelCase for fields
- **Timestamps**: `createdAt`, `updatedAt` on all models
- **IDs**: UUID primary keys with optional `caseNumber` (base32)
- **Relations**: Explicit foreign key relationships
- **Indexes**: Strategic indexing for performance

## 🎨 **UI Component System**

### **Component Hierarchy**
```
@ui (Base Components)
├── Button, Input, Card, etc.
├── Layout components
└── Utility components

Web App Components
├── Page-specific components
├── Feature components
└── Layout components
```

### **Design System**
- **Colors**: Consistent color palette
- **Typography**: Unified font hierarchy
- **Spacing**: 4px grid system
- **Components**: Reusable, composable patterns
- **Responsive**: Mobile-first design approach

## 🔌 **API Design**

### **tRPC Architecture**
- **Routers**: Organized by domain
- **Procedures**: Type-safe API endpoints
- **Middleware**: Authentication, validation, rate limiting
- **Error Handling**: Structured error responses

### **API Conventions**
- **Naming**: RESTful endpoint naming
- **Response Format**: Consistent JSON structure
- **Error Codes**: Standardized error codes
- **Validation**: Zod schema validation
- **Documentation**: OpenAPI/Swagger support

## ⚙️ **Environment Configuration**

### **Required Variables**
```bash
# Database
DATABASE_URL="postgresql://..."

# NATS
NATS_URL="nats://localhost:4222"

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# External Services
STRIPE_SECRET_KEY="..."
CENTRIFUGO_API_KEY="..."
```

### **Configuration Files**
- **`.env.local`**: Local development
- **`.env.example`**: Template for team members
- **`.env.production`**: Production deployment
- **`next.config.js`**: Next.js configuration
- **`tsconfig.json`**: TypeScript configuration

## 🧪 **Testing Strategy**

### **Test Types**
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing
- **Contract Tests**: Service interface testing

### **Testing Tools**
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **MSW**: API mocking
- **Testing Library**: React component testing

## 🚀 **Development Workflow**

### **Getting Started**
```bash
# Clone and install
git clone <repository>
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Start development
pnpm run dev
```

### **Development Commands**
```bash
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run test         # Run tests
pnpm run lint         # Lint code
pnpm run type-check   # TypeScript check
```

### **Package Development**
```bash
# Build specific package
cd packages/ui
pnpm run build

# Build all packages
pnpm run build:packages

# Watch mode for packages
pnpm run dev:packages
```

## 🐛 **Debugging & Monitoring**

### **Development Tools**
- **Next.js DevTools**: Built-in debugging
- **React DevTools**: Component inspection
- **Prisma Studio**: Database visualization
- **NATS CLI**: Stream monitoring

### **Logging Strategy**
- **Development**: Console logging with levels
- **Production**: Structured logging (Pino)
- **Error Tracking**: Sentry integration
- **Performance**: Web Vitals monitoring

### **Health Checks**
- **Service Health**: `/health` endpoints
- **Database**: Connection pool status
- **NATS**: Stream and consumer status
- **External Services**: API availability

## 🔧 **Common Patterns**

### **Service Pattern**
```typescript
// 1. Define service interface
interface MyService {
  start(): Promise<void>;
  stop(): Promise<void>;
  processEvent(event: Event): Promise<void>;
}

// 2. Implement with wrapper
class MyServiceImpl implements MyService {
  constructor(private wrapper: JetStreamServiceWrapper) {}
  
  async start() {
    await this.wrapper.start();
  }
  
  // ... implementation
}

// 3. Factory for creation
class MyServiceFactory {
  static createService(config: Config): MyService {
    const wrapper = new JetStreamServiceWrapper(config);
    return new MyServiceImpl(wrapper);
  }
}
```

### **Event Processing Pattern**
```typescript
// 1. Define event types
interface Event {
  type: string;
  payload: any;
  metadata: EventMetadata;
}

// 2. Route events
const router = new EventRouter();
router.addRoute('user.created', handleUserCreated);
router.addRoute('payment.completed', handlePaymentCompleted);

// 3. Process in consumer
async function processMessage(msg: JsMsg) {
  const event = JSON.parse(msg.data.toString());
  await router.routeEvent(event);
  msg.ack();
}
```

### **Database Pattern**
```typescript
// 1. Use Prisma client
const prisma = new PrismaClient();

// 2. Transactional operations
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.auditEvent.create({ data: auditData });
});

// 3. Error handling
try {
  const result = await prisma.user.findUnique({ where: { id } });
  return result;
} catch (error) {
  logger.error('Database query failed', { error, userId: id });
  throw new DatabaseError('Failed to fetch user');
}
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Build Errors**
```bash
# Clear all builds
pnpm run clean:all

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript config
pnpm run type-check
```

#### **Service Connection Issues**
```bash
# Check NATS
nats sub EVENTS

# Check database
pnpm run db:studio

# Check environment variables
echo $DATABASE_URL
echo $NATS_URL
```

#### **Package Resolution Issues**
```bash
# Check workspace config
cat pnpm-workspace.yaml

# Rebuild packages
pnpm run build:packages

# Check package.json dependencies
cat packages/*/package.json | grep "@jetstream"
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* pnpm run dev

# Verbose package builds
pnpm run build:packages --verbose

# Check service logs
tail -f logs/service.log
```

## 📚 **Additional Resources**

### **Documentation**
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **tRPC**: https://trpc.io/docs
- **NATS**: https://docs.nats.io
- **Centrifugo**: https://centrifugal.dev/docs

### **Architecture Decisions**
- **Service Wrapper Pattern**: Centralized infrastructure
- **Event-Driven Design**: Loose coupling, scalability
- **Type Safety**: Full-stack TypeScript
- **Monorepo Structure**: Shared packages, isolated apps

### **Performance Considerations**
- **Database**: Connection pooling, query optimization
- **Caching**: Redis for frequently accessed data
- **Event Processing**: Batch processing, concurrency control
- **Frontend**: Code splitting, lazy loading

---

## 🤝 **Contributing Guidelines**

1. **Follow Architecture**: Respect layer boundaries and responsibilities
2. **Type Safety**: Use TypeScript for all new code
3. **Testing**: Add tests for new functionality
4. **Documentation**: Update docs for API changes
5. **Code Style**: Follow established patterns and conventions
6. **Review Process**: Submit PRs for all changes

## 📞 **Support & Questions**

- **Architecture Questions**: Check this README first
- **Technical Issues**: Review troubleshooting section
- **Feature Requests**: Create detailed issue descriptions
- **Contributions**: Follow contributing guidelines

---

*This architecture guide is a living document. Update it as the system evolves.*
