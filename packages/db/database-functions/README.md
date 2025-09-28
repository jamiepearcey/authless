# Database Functions Directory

This directory contains SQL files that define PostgreSQL functions, triggers, and other database objects that aren't managed by Prisma migrations.

## How It Works

When you run `pnpm run db:setup`, the system:

1. 🔍 **Scans** this directory for all `.sql` files
2. **Sorts** them alphabetically for consistent execution order
3. **Executes** each file's statements in sequence
4. **Validates** successful completion

## Adding New Functions

Simply create a new `.sql` file in this directory:

```bash
# Use numbered prefixes to control execution order
001_case_number_scrambling.sql
002_your_new_feature.sql
003_another_feature.sql
```

Then run:
```bash
pnpm run db:setup
```

The system automatically discovers and processes your new file.

## Current Functions

### 001_case_number_scrambling.sql
- **Base32 encoding function** for compact case number representation
- **Sequence scrambling algorithm** using LCG, XOR masking, and bit rotation
- **Trigger function** to auto-generate case numbers on insert
- **Database trigger** for SupportCase table
- **Data migration** to update existing cases

Creates truly random-appearing but deterministic case numbers like:
- Sequential: 1, 2, 3, 4, 5...
- Scrambled: CSCCQKOE, CSB77UKB, CSB7CQIC, CSBCKDCP, CSFVH6I...

## SQL File Format

Each SQL file should contain complete, self-contained statements:

```sql
-- Your Function Description
-- Any setup comments

CREATE OR REPLACE FUNCTION your_function(param bigint) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    -- Function logic here
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Additional statements like triggers, updates, etc.
```

## Parsing Rules

The system properly handles PostgreSQL syntax including:
- **Dollar-quoted strings** (`$$ ... $$`) for function bodies
- **Multi-line statements** spanning multiple lines
- **Comment lines** starting with `--`
- **Complex functions** with DECLARE blocks and nested logic

## Testing

Test your functions after setup:

```bash
pnpm run db:test
```

This runs verification queries to ensure all functions work correctly.