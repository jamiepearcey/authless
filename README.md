# Authless - Turborepo Monorepo

A full-stack TypeScript monorepo built with Turborepo, featuring Next.js, tRPC, Prisma, and NextAuth.js.

## 🏗️ Architecture

- **Frontend**: Next.js 14+ with App Router in `apps/web`
- **API**: tRPC server hosted in Next.js API Routes in `apps/web` (port 3000)
- **Database**: Prisma with SQLite (dev) / PostgreSQL (prod) ready
- **Authentication**: NextAuth.js with Credentials + GitHub providers
- **Styling**: Tailwind CSS + shadcn/ui components
- **Type Safety**: End-to-end types with tRPC + Zod validation

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

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Docker (optional, for PostgreSQL)

### Option 1: Automated Setup (Recommended)

1. **Run the setup script:**
   ```bash
   pnpm run setup
   ```
   
   This will:
   - Install all dependencies
   - Create `.env` file from template
   - Set up database (SQLite or PostgreSQL)
   - Seed the database with test user

### Option 2: Manual Setup

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

## 🎯 Current Status

✅ **Working Features:**
- Next.js 14+ with App Router
- tRPC API with end-to-end types
- Prisma with SQLite database
- NextAuth.js authentication
- Tailwind CSS + shadcn/ui components
- Turborepo monorepo setup
- Database seeding
- Protected routes
- Build system

✅ **Tested & Verified:**
- Development server starts successfully
- tRPC API endpoint responds correctly
- Database migrations and seeding work
- Application builds successfully
- UI components render properly

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

## 📚 Learn More

- [Turborepo](https://turbo.build/repo)
- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
