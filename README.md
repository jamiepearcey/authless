# Authless - The SaaS Kernel That Ships Day One

> **Self-hostable SaaS foundation** with enterprise authentication, multi-tenancy, SSO, i18n, real-time notifications, support system, feature flags, and audit logging. Escape per-user pricing traps and deploy in 2 minutes.

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-10.0+-2596be?logo=trpc)](https://trpc.io)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2d3748?logo=prisma)](https://prisma.io)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker)](https://docker.com)

**Authless** packages enterprise-grade SaaS foundations into a single `docker compose` command, letting you focus on your product instead of reinventing authentication, multi-tenancy, and operational infrastructure.

## ✨ Key Features

### 🔐 Enterprise Authentication
- **Passkeys/WebAuthn** with device management
- **Multi-factor Authentication**: TOTP, WhatsApp/SMS 2FA with rate limiting  
- **OAuth Providers**: Google, GitHub + custom provider support
- **Tenant SSO**: OpenID Connect for enterprise customers
- **Session Management**: Device revocation, breach checks, security monitoring

### 👥 Multi-Tenancy + Domains  
- **Domain Resolution**: Subdomain and custom domain support
- **Tenant Admin Console** with complete user management
- **Magic Links & Secure Invites** with role-based access control
- **Data Isolation** and tenant-scoped operations
- **Bulk Operations** for user management at scale

### 🌐 LLM-Powered Internationalization
- **Auto-Detection**: CLI finds English strings with confidence scoring
- **Stable ID Generation** with intelligent heuristics
- **LLM Translation**: GPT-powered translations with developer approval workflow
- **One-Click Expansion** to new languages
- **Production i18n Architecture** ready for global deployment

### 🔔 Real-Time Notifications
- **Self-Hosted Engine**: Ably alternative with no vendor fees (Centrifugo)
- **In-App Notifications**: Tray + dedicated page with real-time updates
- **Multi-Channel**: Email, WhatsApp via webhook workflows
- **Smart Targeting**: Users, roles, tenants, or platform-wide
- **User Preferences**: Granular opt-outs and digest scheduling

### 💬 Support + Contact System
- **Smart Routing**: User-facing forms with global + tenant rules
- **Email Threading**: Mailgun integration with inbound reply handling  
- **SLA Management**: Tracking, escalation workflows, and compliance
- **Admin Tools**: Complete deletion, audit trails, and case management
- **Webhook Integration**: n8n orchestration for external providers

### ⚙️ Feature Flags + Audit
- **Multi-Level Toggles**: Global platform and per-tenant overrides
- **Tier System**: Core, Secondary, and Tenancy-only features
- **Performance Optimized**: Cache + pub/sub invalidation
- **Compliance Ready**: Complete audit trails for security requirements
- **Discussion Threads**: Attachable to any resource for collaboration

## 🏗️ Technical Architecture

- **Frontend**: Next.js 14+ with App Router, Server Components, and Edge Runtime
- **API**: tRPC with end-to-end type safety, hosted in Next.js API Routes
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod) support
- **Authentication**: NextAuth.js with Passkeys, OAuth, and SSO
- **Real-time**: Self-hosted Centrifugo WebSocket server
- **Styling**: Tailwind CSS + shadcn/ui components
- **Type Safety**: Full-stack TypeScript with tRPC + Zod validation
- **Deployment**: Docker + Kubernetes ready with monitoring
- **Integration**: Webhook-first architecture with n8n automation

## 📁 Structure

```
├── apps/
│   ├── web/          # Next.js frontend + tRPC API (port 3000)
│   └── api/          # Separate Next.js app (port 3001, optional)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── trpc/         # tRPC routers & context
│   ├── db/           # Prisma schema & client
│   ├── shared/       # Types, schemas, utils
│   └── config/       # Shared configs
├── scripts/
│   └── setup.sh      # Automated setup script
├── docker-compose.yml # PostgreSQL setup
└── Dockerfile        # Application containerization
```

## 💰 Pricing

**Escape the per-user pricing trap forever.**

| Tier | Price | Use Case |
|------|-------|----------|
| **Free (Maker)** | £0 | Full core kernel with attribution. Perfect for individuals, charities, and revenue <£100k |
| **Commercial** | £399 one-time* | No attribution, advanced features, priority support. Perpetual license + 12mo updates |
| **Agency/Studio** | £999/year | Unlimited client projects with transfer tools and white-glove setup |
| **Enterprise** | Custom | SLA guarantees, security reviews, compliance documentation, dedicated support |

**\*Founding Cohort Special**: First 100 buyers get Commercial for £299 (save £100)

**🎯 At 10,000 users:**
- Hosted Auth Services: **£2,000+/month forever**
- Custom Development: **£150,000+ upfront** + maintenance
- **Authless**: **£400 one-time** (or free if qualifying)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Docker (optional, for PostgreSQL)

### Option 1: Automated Setup (Recommended)

1. **Clone and setup:**
   ```bash
   git clone https://github.com/authless-org/authless.git
   cd authless
   pnpm run setup
   ```
   
   This will:
   - Install all dependencies
   - Create `.env` file from template
   - Set up database (SQLite or PostgreSQL)
   - Seed the database with test user
   - Start the development server

2. **Open your browser:**
   - Frontend: http://localhost:3000
   - Admin Console: http://localhost:3000/admin

### Option 2: Docker Deployment (Production-Ready)

1. **One-command deployment:**
   ```bash
   git clone https://github.com/authless-org/authless.git
   cd authless
   docker compose up -d
   ```

2. **Run setup wizard:**
   - Visit http://localhost:3000/setup
   - Configure database and create admin user
   - Select features to enable
   - Deploy in 2 minutes!

### Option 3: Manual Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment setup:**
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```

3. **Database setup (SQLite):**
   ```bash
   pnpm run db:switch:sqlite
   pnpm run db:generate
   pnpm run db:migrate
   pnpm run db:seed:simple
   ```

4. **Database setup (PostgreSQL with Docker):**
   ```bash
   pnpm run docker:up
   # Wait for PostgreSQL to be ready
   pnpm run db:switch:postgresql
   pnpm run db:generate
   pnpm run db:migrate
   pnpm run db:seed:simple
   ```

5. **Start development:**
   ```bash
   pnpm run dev
   ```

6. **Open your browser:**
   - Frontend: http://localhost:3000
   - tRPC API: http://localhost:3000/api/trpc

## 🛠️ Available Scripts

### Development
- `pnpm run dev` - Start all apps in development mode
- `pnpm run build` - Build all apps and packages
- `pnpm run lint` - Lint all workspaces

### Internationalization (i18n)

This monorepo includes a comprehensive i18n system in the `packages/i18n-core` package. The system provides a three-step workflow for internationalizing your application:

#### Step 1: Auto-Scan for Translatable Text
```bash
cd packages/i18n-core
pnpm i18n:scan --root=../../apps/web --confidence=0.7 --dry-run
```

**Arguments:**
- `--root`: Path to your app directory (required)
- `--confidence`: Minimum confidence threshold (0.0-1.0, default: 0.7)
- `--dry-run`: Preview changes without modifying files
- `--interactive`: Enable interactive mode with IDE diff viewer
- `--open-diff`: Specify diff viewer (e.g., `cursor`, `vscode`)

**What it does:**
- Intelligently detects user-facing text using advanced heuristics
- Filters out technical content (CSS classes, IDs, URLs)
- Provides confidence scores for accuracy
- Can generate diffs for review in your IDE

#### Step 2: Generate Locale Files

**Option A: Process Single App (Direct)**
```bash
pnpm exec tsx src/scripts/process-app.ts /path/to/your/app /path/to/locales.settings.json
```

**Option B: Process Multiple Apps (Monorepo)**
```bash
# Process all apps in the monorepo
pnpm i18n:generate

# Process only web apps
pnpm i18n:generate --apps-glob "apps/web*"

# Process from a specific directory
pnpm i18n:generate --root ../../apps

# Dry run to preview changes
pnpm i18n:generate --dry-run --verbose
```

**Arguments for Direct Processing:**
- First argument: Path to your app directory
- Second argument: Path to your `locales.settings.json` file

**Arguments for Monorepo Processing:**
- `--root`: Start searching from this directory (default: current directory)
- `--apps-glob`: Glob pattern to limit app discovery (e.g., "apps/*")
- `--settings`: Explicit path to a single settings file
- `--ignore`: Additional ignore patterns (can be specified multiple times)
- `--verbose`: Enable verbose logging
- `--dry-run`: Preview changes without modifying files

**What it does:**
- Processes all `t()` function calls and `<T>` JSX elements
- Generates unique, stable IDs for each translatable text
- Creates locale files in the specified directory
- Maintains the source locale (usually English) as the reference
- Creates empty entries for target locales
- **Monorepo Support**: Can process multiple apps simultaneously
- **Smart Discovery**: Automatically finds apps with `locales.settings.json`

**Required**: A `locales.settings.json` file in your app root:
```json
{
  "sourceLocale": "en",
  "defaultLocale": "en",
  "locales": ["en", "fr", "de"],
  "localesDir": "public/i18n",
  "sourceGlobs": [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}"
  ]
}
```

#### Step 3: Populate with Translations
```bash
pnpm i18n:translate --from=en --to=de --groq-key=YOUR_GROQ_API_KEY --locales-dir=./public/i18n
pnpm i18n:translate --from=en --to=fr --groq-key=YOUR_GROQ_API_KEY --locales-dir=./public/i18n
```

**Arguments:**
- `--from`: Source locale (default: "en")
- `--to`: Target locale (required)
- `--groq-key`: Your GROQ API key (required)
- `--locales-dir`: Directory containing locale files (default: "locales")

**What it does:**
- Identifies empty or missing translations in target locale files
- Uses GROQ API (powered by Llama 3.1) for high-quality translations
- Processes translations in batches for efficiency
- Updates locale files with proper translations
- Maintains consistent terminology and tone

**Required**: A GROQ API key (get one at [groq.com](https://groq.com))

#### Complete Workflow Example

Here's how to use all three steps together:

**Option A: Single App Workflow**
```bash
# 1. Scan your app for translatable text
cd packages/i18n-core
pnpm i18n:scan --root=../../apps/web --confidence=0.7 --dry-run

# 2. Generate locale files
pnpm exec tsx src/scripts/process-app.ts ../../apps/web ../../apps/web/locales.settings.json

# 3. Translate missing values
pnpm i18n:translate --from=en --to=de --groq-key=YOUR_KEY --locales-dir=../../apps/web/public/i18n
pnpm i18n:translate --from=en --to=fr --groq-key=YOUR_KEY --locales-dir=../../apps/web/public/i18n
```

**Option B: Monorepo Workflow**
```bash
# 1. Scan your app for translatable text
cd packages/i18n-core
pnpm i18n:scan --root=../../apps/web --confidence=0.7 --dry-run

# 2. Generate locale files for all apps
pnpm i18n:generate --verbose

# 3. Translate missing values for all apps
pnpm i18n:translate --from=en --to=de --groq-key=YOUR_KEY --locales-dir=../../apps/web/public/i18n
pnpm i18n:translate --from=en --to=fr --groq-key=YOUR_KEY --locales-dir=../../apps/web/public/i18n
```

**Current Supported Languages**: English (en), German (de), French (fr)

**Current Status**: The web app (`apps/web`) is fully internationalized with:
- ✅ English source locale with 276 translatable strings
- ✅ German translations (100% complete)
- ✅ French translations (100% complete)
- ✅ Automatic language detection and switching
- ✅ Responsive UI components with proper i18n support


For detailed documentation, see [packages/i18n-core/README.md](packages/i18n-core/README.md).

### Entry Point Comparison

| Script | Use Case | Best For |
|--------|----------|-----------|
| `pnpm i18n:scan` | Detect translatable text | Initial setup, finding new text |
| `pnpm i18n:generate` | Process multiple apps | Monorepo management, batch processing |
| `pnpm exec tsx src/scripts/process-app.ts` | Process single app | Direct app processing, debugging |
| `pnpm i18n:translate` | Generate translations | Localization, language support |

**When to Use Each**:
- **`i18n:scan`**: Always start here to find translatable text
- **`i18n:generate`**: Use in monorepos or when processing multiple apps
- **`process-app.ts`**: Use for single app processing or detailed control
- **`i18n:translate`**: Use after generating locale files to add translations

### Database
- `pnpm run db:generate` - Generate Prisma client
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:seed:simple` - Seed database with test data
- `pnpm run db:studio` - Open Prisma Studio
- `pnpm run db:reset` - Reset database
- `pnpm run db:switch:sqlite` - Switch to SQLite schema
- `pnpm run db:switch:postgresql` - Switch to PostgreSQL schema

### Docker
- `pnpm run docker:up` - Start PostgreSQL with Docker
- `pnpm run docker:down` - Stop Docker services
- `pnpm run docker:logs` - View Docker logs
- `pnpm run docker:build` - Build application Docker image
- `pnpm run docker:run` - Run application in Docker

### Setup
- `pnpm run setup` - Run automated setup script
- `pnpm run clean` - Clean all build artifacts

## 🔐 Test Authentication

- **Test User:** `test@example.com` / `password123`
- **Protected Route:** `/protected` (requires authentication)
- **Sign In:** Click "Sign In" button in header

## 🎯 Production-Ready Features

### ✅ Authentication & Security
- **Passkeys/WebAuthn**: Full device management, registration, and authentication
- **Multi-Factor Auth**: TOTP authenticators, WhatsApp/SMS 2FA with rate limiting
- **OAuth Integration**: Google, GitHub providers with extensible framework
- **Tenant SSO**: Complete SAML/OIDC implementation with domain-based detection
- **Session Management**: Device revocation, breach detection, security monitoring
- **Password Security**: Breach checks, strength validation, secure reset flows

### ✅ Multi-Tenancy & Domains
- **Domain Resolution**: Subdomain and custom domain routing with middleware
- **Tenant Management**: Complete admin console with user management
- **Invitation System**: Magic links, secure invites, role-based access control
- **Data Isolation**: Tenant-scoped queries, secure data separation
- **Bulk Operations**: User imports, exports, and management at scale

### ✅ Real-Time & Notifications  
- **Centrifugo Integration**: Self-hosted WebSocket server for real-time features
- **Notification System**: In-app tray, dedicated page, real-time delivery
- **Multi-Channel**: Email, WhatsApp via n8n webhook orchestration
- **Smart Targeting**: User, role, tenant, and platform-wide notifications
- **User Preferences**: Granular opt-outs, digest scheduling, preference management

### ✅ Support & Communication
- **Contact Forms**: User-facing support with intelligent routing
- **Email Threading**: Mailgun integration with inbound reply processing
- **Case Management**: SLA tracking, escalation workflows, admin tools
- **Audit Trails**: Complete support interaction logging for compliance
- **Webhook Integration**: External provider integration via n8n

### ✅ Feature Management & Audit
- **Feature Flags**: Global and tenant-level toggles with tier system
- **Performance**: Redis caching, pub/sub invalidation, optimized queries
- **Audit Logging**: Comprehensive compliance-ready audit trails
- **Discussion System**: Attachable discussion threads for any resource
- **Admin Interface**: Complete feature flag management console

### ✅ Internationalization
- **LLM-Powered i18n**: Auto-detection, stable ID generation, AI translations
- **Developer Workflow**: CLI tooling, approval process, diff management  
- **Production Ready**: 276+ translated strings, German/French support
- **Language Detection**: Automatic locale detection and switching

### ✅ Infrastructure & DevOps
- **Docker Ready**: Complete containerization with docker-compose
- **Database Support**: SQLite (dev), PostgreSQL (prod) with migrations
- **Type Safety**: End-to-end TypeScript with tRPC and Zod validation
- **Testing**: Comprehensive unit, integration, and E2E test suites
- **Monitoring**: Built-in observability, logging, and health checks
- **Security**: OWASP compliance, rate limiting, input validation

## 🎯 Perfect For

- **B2B SaaS Startups**: Launch with enterprise features from day one
- **Enterprise Software Teams**: Skip 8-12 weeks of foundation development  
- **Multi-Tenant Platforms**: Built-in tenant isolation and management
- **Global Applications**: LLM-powered internationalization included
- **Agencies & Studios**: Unlimited client projects with transfer tooling
- **Compliance-Heavy Industries**: Audit logs, security reviews, documentation

## 🚀 Deployment Options

### Recommended: Coolify + Hetzner/OVH
Perfect balance of cost, performance, and simplicity:

```bash
# 1. One-click Coolify deployment on Hetzner
# 2. Connect GitHub repository  
# 3. Set environment variables
# 4. Deploy with SSL via Cloudflare
```

**Monthly cost**: ~€50-200 for unlimited users vs £2,000+ with hosted auth services

### Docker + Any VPS
Works on any Linux server:

```bash
git clone authless && cd authless
docker compose up -d
# Visit setup wizard at your-domain.com/setup
```

### Kubernetes
Enterprise-grade scaling with included Helm charts:

```bash
helm install authless ./charts/authless
kubectl apply -f k8s/
```

### Cloud Providers
Deployment guides included for:
- **AWS**: ECS, EKS, RDS integration
- **Google Cloud**: Cloud Run, GKE, Cloud SQL
- **Azure**: Container Apps, AKS, Azure SQL
- **DigitalOcean**: App Platform, Kubernetes

## 🔧 Development

### Adding new packages

1. Create directory in `packages/`
2. Add `package.json` with proper workspace configuration
3. Update root `tsconfig.json` paths if needed

### Adding new apps

1. Create directory in `apps/`
2. Add `package.json` with proper workspace configuration
3. Update root `tsconfig.json` paths

### tRPC Endpoints

- **Client**: Configured in `apps/web/lib/trpc.ts`
- **Server**: Available at `/api/trpc` in web app
- **Types**: Exported from `packages/trpc`

### Database

- **Schema**: Located in `packages/db/prisma/schema.prisma`
- **Client**: Singleton exported from `packages/db/src/client.ts`
- **Studio**: Run `pnpm run db:studio` to open Prisma Studio

### Authentication

- **Providers**: Credentials + GitHub (configure in `.env`)
- **Protected Routes**: Example at `/protected` in web app
- **Session**: Available via `useSession()` hook

## 🎨 UI Components

### shadcn/ui

- **Installation**: Already configured in `apps/web`
- **Usage**: Import from `@ui/*` in web app
- **Adding Components**: Use `pnpm dlx shadcn@latest add [component]`

### Tailwind CSS

- **Configuration**: Base config in `packages/config/tailwind.base.cjs`
- **Customization**: Extend in app-specific configs

## 🚀 Production

### Database

1. Update `DATABASE_URL` in `.env` to PostgreSQL connection string
2. Run `pnpm run db:switch:postgresql`
3. Run `pnpm run db:migrate` to apply migrations
4. Ensure Prisma client is generated: `pnpm run db:generate`

### Environment Variables

- Set `NEXTAUTH_SECRET` to a secure random string
- Configure OAuth providers (GitHub, etc.)
- Update `NEXTAUTH_URL` to your production domain

### Deployment

- **Frontend**: Deploy `apps/web` to Vercel/Netlify
- **Database**: Use managed PostgreSQL service

## 🐳 Docker

### PostgreSQL Development

```bash
# Start PostgreSQL
pnpm run docker:up

# Switch to PostgreSQL schema
pnpm run db:switch:postgresql

# Run migrations
pnpm run db:migrate
```

### Application Containerization

```bash
# Build Docker image
pnpm run docker:build

# Run in Docker
pnpm run docker:run
```

## 🤝 Support & Community

- **Documentation**: Complete guides, API references, and deployment instructions
- **Community**: Join our Discord for questions and discussions
- **Priority Support**: Included with Commercial and higher tiers
- **Custom Development**: Available for Enterprise customers
- **Security Issues**: security@authless.dev

## 🛣️ Roadmap

### Coming Soon
- **Audit Dashboard**: Visual audit log exploration and compliance reporting
- **Advanced SSO**: SCIM provisioning, advanced SAML features
- **Mobile SDKs**: React Native and Flutter authentication libraries  
- **Advanced Analytics**: Usage tracking, security insights, performance metrics
- **Third-Party Integrations**: Slack, Teams, Jira, and more via n8n

### Community Requested
- **Payment Integration**: Stripe billing, subscription management
- **CRM Integration**: Salesforce, HubSpot, Pipedrive connectors
- **Advanced Workflows**: Visual workflow builder for business logic
- **White-Label Options**: Complete branding customization
- **Multi-Region Support**: Data residency and geographic distribution

## 📚 Learn More

### Core Technologies
- [Next.js](https://nextjs.org/) - React framework with App Router
- [tRPC](https://trpc.io/) - End-to-end type safety
- [Prisma](https://www.prisma.io/) - Database ORM and migrations
- [NextAuth.js](https://next-auth.js.org/) - Authentication framework
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Turborepo](https://turbo.build/repo) - Monorepo build system

### Infrastructure & Integration
- [Centrifugo](https://centrifugal.dev/) - Real-time messaging server
- [n8n](https://n8n.io/) - Workflow automation
- [Docker](https://docker.com/) - Containerization
- [Coolify](https://coolify.io/) - Deployment platform
- [Cloudflare](https://cloudflare.com/) - DNS, SSL, CDN

---

## 🚀 Ready to Build?

Choose your path to SaaS freedom:

1. **Start Free**: `git clone` + `pnpm setup` + `localhost:3000/setup`
2. **Go Commercial**: [Claim founding discount](mailto:sales@authless.dev) (£299, save £100)  
3. **Enterprise**: [Book consultation](mailto:enterprise@authless.dev) for custom requirements

**🎯 Save 8-12+ weeks of development. Deploy in 2 minutes. Scale without per-user fees.**

[![Deploy Now](https://img.shields.io/badge/Deploy_Now-Free-brightgreen?style=for-the-badge&logo=rocket)](mailto:start@authless.dev)
[![Get Commercial](https://img.shields.io/badge/Get_Commercial-£299_Special-blue?style=for-the-badge&logo=crown)](mailto:sales@authless.dev)
[![Book Demo](https://img.shields.io/badge/Book_Demo-Enterprise-purple?style=for-the-badge&logo=calendar)](mailto:demo@authless.dev)
