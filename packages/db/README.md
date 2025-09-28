# Database Package

This package contains the database client, migrations, and setup utilities for the Authless application.

## Database Setup

The database package provides a unified setup system that automatically processes all PostgreSQL functions and triggers that aren't managed by Prisma migrations.

### Quick Start

```bash
# Set up entire database (Prisma + all custom functions)
pnpm run db:setup

# Test all database functions
pnpm run db:test
```

That's it! The setup command will:
1.  Verify database connection
2. 📁 Process all SQL files in `database-functions/` directory
3.  Confirm successful setup

### How It Works

The system automatically processes all `.sql` files in the `database-functions/` directory in alphabetical order. Simply add your SQL files there and run `pnpm run db:setup`.

**Current Functions:**
- `001_case_number_scrambling.sql` - Case number scrambling algorithm

### Adding New Database Functions

1. **Create your SQL file** in `packages/db/database-functions/`
   - Use numbering for execution order (e.g., `002_my_feature.sql`)
   - Include all `CREATE FUNCTION`, `CREATE TRIGGER`, etc.

2. **Run setup** - The system automatically finds and processes your file:
   ```bash
   pnpm run db:setup
   ```

3. **Test** your functions:
   ```bash
   pnpm run db:test
   ```

No manual registration needed! The system discovers and processes all SQL files automatically.

### Case Number Scrambling

The application includes a sophisticated algorithm to generate truly random-appearing but deterministic case numbers for support tickets.

**Algorithm Features:**
1. **Linear Congruential Generator (LCG)** for initial randomization
2. **XOR masking** with a fixed mask for additional scrambling
3. **Bit rotation** to further distribute values
4. **Golden ratio multiplication** for final value spreading
5. **Range normalization** to ensure reasonable case number lengths

**Example Output:**
- Input: 1 → Case Number: CSCCQKOE
- Input: 2 → Case Number: CSB77UKB  
- Input: 3 → Case Number: CSB7CQIC
- Input: 4 → Case Number: CSBCKDCP

Sequential inputs become scattered values that appear random but are completely deterministic.

## Development

### Directory Structure

```
packages/db/
├── database-functions/     # Custom SQL functions (auto-processed)
│   └── 001_case_number_scrambling.sql
├── migrations/            # Legacy migration files
├── src/
│   ├── setup-functions.ts # Setup automation logic
│   └── ...
└── package.json
```

### Database Operations

```bash
# Generate Prisma client
pnpm run prisma:generate

# Push schema changes
pnpm run prisma:push

# Run migrations
pnpm run prisma:migrate

# Open Prisma Studio
pnpm run prisma:studio

# Seed database
pnpm run db:seed
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```