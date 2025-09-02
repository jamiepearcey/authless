# Authless - Self-Hosted SaaS Foundation

**Escape the per-user pricing trap. Build enterprise-grade SaaS without the £2,500/month bills.**

Authless is a comprehensive, self-hosted SaaS foundation that provides everything you need to build modern B2B applications. No vendor lock-in, no per-user fees, no compromise on enterprise features.

## 🚀 What Is This?

**Authless is the SaaS starter you wish existed** - a complete, production-ready foundation that typically takes 8-12+ weeks of senior engineering work. Instead of paying £500-2,500/month for 10K users to hosted auth services, pay once and own your infrastructure.

### **Core Value Proposition**
- ✅ **Self-hosted** - Complete control over your infrastructure  
- ✅ **No per-user fees** - Escape the pricing trap that kills profitability
- ✅ **Enterprise-ready** - Multi-tenancy, SSO, compliance, audit trails
- ✅ **Production-proven** - Battle-tested patterns and architecture
- ✅ **Developer-friendly** - Full TypeScript, comprehensive tooling

### **Target Market**
- 🎯 B2B SaaS startups avoiding per-user pricing traps
- 🎯 Enterprise software teams building multi-tenant platforms  
- 🎯 Agencies/studios building multiple client projects
- 🎯 Companies with revenue >£100K needing commercial features

## 🏗️ **Product Architecture**

### **Frontend Stack**
- **Next.js 14** - App Router, SSR, TypeScript, TailwindCSS
- **Multi-tenant routing** - Subdomains, custom domains, tenant isolation
- **Real-time UI** - Live notifications, WebSocket connections
- **Internationalization** - LLM-powered translation workflows
- **Admin panels** - Tenant management, user management, support

### **Backend Stack** 
- **tRPC API** - End-to-end type safety with Zod validation
- **PostgreSQL + Prisma** - Relational database with type-safe ORM
- **Event-driven architecture** - NATS JetStream for reliable messaging
- **Microservices** - Domain-specific services with clear boundaries

### **Infrastructure**
- **NATS JetStream** - Self-hosted message streaming (Kafka alternative)
- **Centrifugo** - Self-hosted real-time server (Pusher/Ably alternative)
- **PostgreSQL + PgBouncer** - Database with connection pooling
- **Docker Compose** - Complete local development environment

## 🔥 **Key Features**

### **1. Enterprise Authentication**
- **Passkeys/WebAuthn** with device management
- **Multi-factor auth** - TOTP, WhatsApp/SMS with rate limiting  
- **OAuth providers** - Google, GitHub + custom integrations
- **Enterprise SSO** - OpenID Connect for enterprise customers
- **Session management** - Device tracking, bulk revocation
- **Security monitoring** - Breach alerts, suspicious activity

### **2. Multi-Tenancy + Domain Management**  
- **Domain resolution** - Subdomains & custom domains
- **Tenant admin console** - Complete self-service management
- **Magic link invitations** - Secure user onboarding
- **Role-based access** - Granular permissions system
- **Data isolation** - Complete tenant separation
- **Bulk operations** - User management at scale

### **3. LLM-Powered Internationalization**
- **Automatic detection** - CLI finds English strings in codebase
- **Stable translation IDs** - Content-aware ID generation
- **LLM translations** - GPT fills missing translations with context
- **Developer workflow** - Approval system for translations
- **One-click expansion** - Add new languages instantly
- **Production-ready** - Complete i18n architecture

### **4. Real-Time Notifications**
- **Self-hosted alternative** to Ably/Pusher (no vendor fees)
- **In-app notification tray** + management interface
- **Multi-channel delivery** - Email, WhatsApp via webhooks
- **Smart targeting** - Users, roles, tenants, global broadcast
- **User preferences** - Opt-out management, digest scheduling
- **Webhook workflows** - Extensible notification pipeline

### **5. Support + Contact System**
- **Customer support forms** - Intelligent routing & categorization
- **Email threading** - Inbound replies via webhook integration
- **SLA tracking** - Escalation workflows and metrics
- **Admin interface** - Complete case management
- **Multi-level routing** - Global + tenant-specific configuration
- **Integration-ready** - Webhook-based extensibility

### **6. Feature Flags + Compliance**
- **Multi-level flags** - Global, tenant, and user-specific
- **Precedence system** - Configurable override hierarchy  
- **Cache optimization** - Pub/sub invalidation for performance
- **Audit compliance** - Complete event trail for regulations
- **Discussion system** - Collaborative features on any resource
- **Admin controls** - Platform-wide feature management

## 🏛️ **Technical Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Web Application                  │  
│  • Multi-tenant routing (subdomains/custom domains)       │
│  • tRPC API layer with end-to-end type safety            │
│  • Real-time UI with WebSocket connections               │
│  • Admin panels for tenant/user management               │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event-Driven Services                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │    Audit    │  │   Email     │  │  Webhook    │       │
│  │   Service   │  │  Service    │  │  Service    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│  ┌─────────────┐  ┌─────────────────────────────────┐     │
│  │  Realtime   │  │      Outbox Processor           │     │
│  │   Service   │  │   (Reliable Event Publishing)   │     │
│  └─────────────┘  └─────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  • NATS JetStream (Event Streaming & Message Queues)      │
│  • PostgreSQL + PgBouncer (Database + Connection Pool)    │  
│  • Centrifugo (Real-time WebSocket Server)                │
│  • Stripe (Payment Processing)                            │
└─────────────────────────────────────────────────────────────┘
```

### **Event-Driven Flow**
1. **Web App** generates events (user actions, system events)
2. **Outbox Processor** publishes events to NATS JetStream reliably
3. **Microservices** consume and process domain-specific events
4. **Real-time clients** receive updates via Centrifugo WebSocket
5. **Database** maintains consistent state with audit trails

## 📁 **Project Structure**

```
authless/
├── apps/web/                     # Next.js application
│   ├── app/                      # App Router (pages & API)
│   ├── components/               # React components  
│   └── lib/                      # Utilities & configurations
├── packages/                     # Shared packages
│   ├── db/                       # Prisma schema & migrations
│   ├── trpc/                     # API layer & routers
│   ├── ui/                       # Shared UI components
│   ├── outbox-processor/         # Reliable event publishing
│   └── [domain]-consumer/        # Event processing packages
├── services/                     # Microservices
│   ├── audit-service/            # Compliance & audit trails
│   ├── email-service/            # Email workflows
│   ├── webhook-service/          # External integrations  
│   └── realtime-service/         # Real-time notifications
└── scripts/                      # Development & deployment
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and pnpm
- PostgreSQL 14+
- Docker & Docker Compose (for local development)

### **Development Setup**
```bash
# Clone and install dependencies
git clone <repository>
cd authless
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start infrastructure (PostgreSQL, NATS, Centrifugo)
docker compose up -d

# Initialize database
pnpm run db:migrate
pnpm run db:seed

# Start development server
pnpm run dev
```

### **Core Commands**
```bash
pnpm run dev              # Start all services in development
pnpm run build            # Build for production  
pnpm run test             # Run comprehensive test suite
pnpm run db:migrate       # Run database migrations
pnpm run db:studio        # Open Prisma Studio
pnpm run services:start   # Start microservices only
```

## 🧪 **Testing Strategy**

### **Test Coverage**
- **Unit tests** - Individual functions and components
- **Integration tests** - API endpoints and database operations
- **End-to-end tests** - Complete user workflows
- **Service tests** - Event-driven architecture validation

### **Behavioral Testing**
Our test suite emphasizes real-world scenarios:
- **Outbox pattern reliability** - Message delivery guarantees
- **Multi-tenant isolation** - Data security between tenants
- **Authentication flows** - Complete auth workflows
- **Real-time functionality** - WebSocket connection handling

## 💰 **Pricing & Licensing**

### **Free (Maker) Tier**
- Complete foundation with attribution requirement
- Perfect for side projects and learning
- All core features included

### **Commercial Licenses**
- **Individual**: £299 (founding cohort) / £399 (regular)
- **Agency/Studio**: £999/year (unlimited client projects)  
- **Enterprise**: Custom pricing (SLA + security reviews + setup)

### **ROI Comparison**
**Hosted Auth Services at 10K users:**
- Auth0: £1,600/month = £19,200/year
- Supabase: £500/month = £6,000/year  
- **Authless: £399 one-time** ✅

## 🏢 **Enterprise Features**

### **Security & Compliance**
- **SOC 2 ready** - Comprehensive audit trails
- **GDPR compliant** - Data protection by design
- **Enterprise SSO** - OpenID Connect, SAML support
- **Security monitoring** - Breach detection, alerting
- **Role-based access** - Granular permissions system

### **Multi-Tenancy**  
- **Complete isolation** - Data, UI, and configuration
- **Custom domains** - White-label customer portals
- **Tenant admin** - Self-service management interfaces
- **Bulk operations** - Enterprise-scale user management

### **Observability**
- **Structured logging** - Production-ready log aggregation
- **Health checks** - Service monitoring and alerting  
- **Performance metrics** - Application performance monitoring
- **Error tracking** - Comprehensive error reporting

## 🤝 **Contributing**

We welcome contributions! Please:
1. **Follow architecture** - Respect service boundaries
2. **Maintain type safety** - Use TypeScript throughout
3. **Add tests** - Cover new functionality comprehensively
4. **Update docs** - Keep documentation current
5. **Submit PRs** - Use our review process

## 📞 **Support & Community**

- **Documentation**: Comprehensive guides and API references
- **GitHub Issues**: Bug reports and feature requests  
- **Community**: Discord server for discussions
- **Enterprise Support**: SLA-backed support for commercial licenses

## 🎯 **Why Choose Authless?**

### **vs. Hosted Auth Services**
- **Cost**: One-time £399 vs £500-2,500/month forever
- **Control**: Own your infrastructure vs vendor dependency
- **Customization**: Full source access vs limited configuration
- **Data**: Your database vs their servers

### **vs. Building from Scratch**
- **Time**: Ready in days vs 8-12+ weeks of development
- **Quality**: Production-tested vs experimental implementation  
- **Features**: Complete feature set vs basic MVP
- **Maintenance**: Ongoing updates vs technical debt

### **vs. Other Starters**  
- **Completeness**: Full SaaS foundation vs basic auth only
- **Architecture**: Event-driven microservices vs monolithic structure
- **Enterprise**: Multi-tenancy, SSO, compliance vs missing features
- **Real-time**: Built-in WebSocket infrastructure vs afterthought

---

**Ready to escape the per-user pricing trap?**

Authless gives you everything you need to build enterprise-grade SaaS applications without the recurring costs that kill profitability. Own your infrastructure, control your costs, and scale without limits.

*Start building your SaaS today. Your future self (and bank account) will thank you.*