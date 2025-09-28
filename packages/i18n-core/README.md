# i18n-core

A comprehensive internationalization (i18n) solution for Next.js applications with automated text detection and translation.

## Features

- **Automated Text Detection**: Intelligently scans your codebase for translatable text using heuristics
- **Smart Import Management**: Automatically adds `import { t } from "@i18n-core"` when needed
- **AI Validation**: Optional GROQ API integration to validate detected text is actually human language
- **Batch Translation**: Efficiently translates missing values in batches
- **Deduplication**: Prevents duplicate message IDs across the application
- **Template Variables**: Supports `{var}` syntax for dynamic content

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @i18n-core
```

### 2. Create Locale Files

Create `locales/en.json` (your default language):

```json
{
  "welcome.message": "Welcome to our application",
  "auth.login.button": "Sign In",
  "auth.login.error": "Invalid credentials"
}
```

### 3. Use the Translation Function

```tsx
import { t } from "@i18n-core";

export function WelcomePage() {
  return (
    <div>
      <h1>{t("Welcome to our application", "welcome.message")}</h1>
      <button>{t("Sign In", "auth.login.button")}</button>
    </div>
  );
}
```

## The Three-Step i18n Process

This package provides a complete three-step workflow for internationalizing your Next.js application:

### Step 1: Auto-Scan for Translatable Text

**Purpose**: Intelligently detect user-facing text in your codebase that should be translated.

**Command**:
```bash
# Basic scan
pnpm i18n:scan --root=./apps/web

# With confidence threshold (recommended: 0.7)
pnpm i18n:scan --root=./apps/web --confidence=0.7

# Dry run to preview changes without modifying files
pnpm i18n:scan --root=./apps/web --confidence=0.7 --dry-run

# Interactive mode with IDE diff viewer
pnpm i18n:scan --root=./apps/web --confidence=0.7 --interactive --open-diff=cursor
```

**Arguments**:
- `--root`: Path to your app directory (required)
- `--confidence`: Minimum confidence threshold (0.0-1.0, default: 0.7)
- `--dry-run`: Preview changes without modifying files
- `--interactive`: Enable interactive mode with IDE diff viewer
- `--open-diff`: Specify diff viewer (e.g., `cursor`, `vscode`)

**What it does**:
- Scans your TypeScript/JSX files for potential translatable text
- Uses advanced heuristics to identify UI labels, button text, error messages, etc.
- Automatically filters out technical content (CSS classes, IDs, URLs, etc.)
- Provides confidence scores for each detected text
- Can generate diffs for review in your IDE

**Heuristics include**:
- **UI Context**: Higher confidence for button text, labels, placeholders
- **Sentence Patterns**: Natural language with proper capitalization
- **Technical Filtering**: Excludes IDs, CSS classes, URLs, file paths
- **Length Analysis**: Prefers multi-word sentences over single words
- **Punctuation**: Boosts confidence for text ending with periods, question marks

### Step 2: Process App and Generate Locale Files

**Purpose**: Convert detected text into structured locale files with unique IDs.

**Command**:
```bash
# From the i18n-core package directory
pnpm exec tsx src/scripts/process-app.ts /path/to/your/app /path/to/locales.settings.json
```

**Arguments**:
- First argument: Path to your app directory
- Second argument: Path to your `locales.settings.json` file

**What it does**:
- Processes all `t()` function calls and `<T>` JSX elements
- Generates unique, stable IDs for each translatable text
- Creates locale files in the specified directory
- Maintains the source locale (usually English) as the reference
- Creates empty entries for target locales

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
  ],
  "ignoreGlobs": [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/*.d.ts"
  ]
}
```

### Step 3: Populate Locale Files with Translations

**Purpose**: Fill in missing translations using AI-powered translation services.

**Command**:
```bash
# Translate from English to German
pnpm i18n:translate --from=en --to=de --groq-key=YOUR_GROQ_API_KEY --locales-dir=./public/i18n

# Translate from English to French
pnpm i18n:translate --from=en --to=fr --groq-key=YOUR_GROQ_API_KEY --locales-dir=./public/i18n
```

**Arguments**:
- `--from`: Source locale (default: "en")
- `--to`: Target locale (required)
- `--groq-key`: Your GROQ API key (required)
- `--locales-dir`: Directory containing locale files (default: "locales")

**What it does**:
- Identifies empty or missing translations in target locale files
- Uses GROQ API (powered by Llama 3.1) for high-quality translations
- Processes translations in batches for efficiency
- Updates locale files with proper translations
- Maintains consistent terminology and tone

**Required**: A GROQ API key (get one at [groq.com](https://groq.com))

## Complete Workflow Example

Here's how to use all three steps together:

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

## Current Status

The i18n system is fully functional and has been tested with the web application:

### Completed Features
- **Auto-scan script**: Successfully detects translatable text with configurable confidence
- **Process-app script**: Generates locale files with unique IDs
- **Translation script**: Uses GROQ API for high-quality translations
- **Web app integration**: Fully internationalized with 276 translatable strings

### Translation Status
- **English (en)**: 276 strings (source locale)
- **German (de)**: 276 strings (complete)
- **French (fr)**: 276 strings (complete)

### Script Performance
- **Auto-scan**: Processes ~50 files in ~2 seconds
- **Process-app**: Generates locale files in ~1 second
- **Translation**: Processes 10 strings per batch with 200ms delays

### Usage Examples

#### Basic Usage
```bash
# Scan for translatable text
pnpm i18n:scan --root=../../apps/web --confidence=0.7

# Generate locale files
pnpm exec tsx src/scripts/process-app.ts ../../apps/web ../../apps/web/locales.settings.json

# Translate to German
pnpm i18n:translate --from=en --to=de --groq-key=gsk_xxx --locales-dir=../../apps/web/public/i18n
```

#### Advanced Usage
```bash
# Interactive scan with diff viewer
pnpm i18n:scan --root=../../apps/web --confidence=0.7 --interactive --open-diff=cursor

# Translate to multiple languages
pnpm i18n:translate --from=en --to=de,fr,es --groq-key=gsk_xxx --locales-dir=../../apps/web/public/i18n

# High-confidence scan (fewer false positives)
pnpm i18n:scan --root=../../apps/web --confidence=0.8 --dry-run
```

#### Configuration Example
```json
// locales.settings.json
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

## Script Relationships and Entry Points

### Understanding the Script Hierarchy

The i18n system provides multiple entry points for different use cases:

1. **`i18n:scan`** - Entry point for text detection
2. **`i18n:generate`** - Entry point for multi-app processing
3. **`i18n:process`** - Core processing logic (used by `i18n:generate`)
4. **`i18n:translate`** - Entry point for translation generation

### Alternative Entry Points

#### Generate Message IDs for Multiple Apps

The `i18n:generate` script is a powerful entrypoint that can process multiple apps in a monorepo simultaneously:

```bash
# Process all apps in the monorepo
pnpm i18n:generate

# Process only web apps
pnpm i18n:generate --apps-glob "apps/web*"

# Process from a specific directory
pnpm i18n:generate --root ../../apps

# Process a single app with explicit settings
pnpm i18n:generate --settings ./apps/web/locales.settings.json

# Dry run to preview changes
pnpm i18n:generate --dry-run

# Verbose output with custom ignore patterns
pnpm i18n:generate --verbose --ignore "**/test/**" --ignore "**/temp/**"
```

**Arguments**:
- `--root`: Start searching from this directory (default: current directory)
- `--apps-glob`: Glob pattern to limit app discovery (e.g., "apps/*")
- `--settings`: Explicit path to a single settings file
- `--ignore`: Additional ignore patterns (can be specified multiple times)
- `--verbose`: Enable verbose logging
- `--dry-run`: Preview changes without modifying files
- `--help`: Show help message

**Use Cases**:
- **Monorepo Management**: Process multiple Next.js apps at once
- **Batch Processing**: Apply i18n changes across all apps
- **CI/CD Integration**: Automated processing in build pipelines
- **Development Workflow**: Quick updates across multiple apps

**When to Use**:
- Use `i18n:generate` when working with multiple apps in a monorepo
- Use the direct `i18n:process` script when working with a single app
- Use `i18n:generate --dry-run` to preview changes before applying

### Script Selection Guide

| Use Case | Recommended Script | Alternative |
|----------|-------------------|-------------|
| **Initial setup** | `i18n:scan` | - |
| **Single app processing** | `process-app.ts` | `i18n:generate --settings` |
| **Multiple apps** | `i18n:generate` | - |
| **Translation** | `i18n:translate` | - |
| **Preview changes** | `i18n:scan --dry-run` | `i18n:generate --dry-run` |
| **Debugging** | `process-app.ts` | `i18n:generate --verbose` |
| **CI/CD** | `i18n:generate` | - |

## How It Works

### Text Detection Heuristics

The auto-scanner uses multiple heuristics to identify translatable text:

1. **Sentence Patterns**: Looks for natural language patterns
2. **UI Context**: Higher confidence for button text, labels, etc.
3. **Word Count**: Filters out single words or very long text
4. **Technical Filtering**: Excludes IDs, URLs, CSS classes, etc.
5. **Confidence Scoring**: Combines multiple factors for accuracy

### Import Management

The system automatically:
- Detects existing `import { t } from "@i18n-core"`
- Adds the import when `t()` function is used
- Places imports at the top of the file
- Prevents duplicate imports

### AI Validation (Optional)

When enabled with `--ai-validate`:
- Sends detected text to GROQ API for validation
- Asks "Is this human-readable language that should be translated?"
- Falls back to heuristic validation if AI fails
- Provides additional safety against false positives

## Configuration

### Scan Options

```typescript
interface ScanOptions {
  minWords: number;           // Minimum word count (default: 3)
  maxLength: number;          // Maximum text length (default: 200)
  excludePatterns: RegExp[];  // Custom exclusion patterns
  includePatterns: RegExp[];  // Custom inclusion patterns
  filePatterns: string[];     // File glob patterns
  enableAIValidation?: boolean; // Enable AI validation
  groqApiKey?: string;        // GROQ API key for validation
}
```

### Default Settings

```typescript
const DEFAULT_OPTIONS: ScanOptions = {
  minWords: 3,
  maxLength: 200,
  excludePatterns: [
    /^[a-z0-9-]+$/i,           // IDs, CSS classes
    /^https?:\/\/.+/,          // URLs
    /^[0-9]+$/,                // Numbers
    /^[A-Z_]+$/,               // Constants
    /^[a-z]+\.(ts|tsx|js|jsx)$/, // File extensions
  ],
  includePatterns: [
    /^[A-Z][a-z]+(?:\s+[a-z]+)*$/, // Sentence patterns
    /^(title|message|text|label|placeholder|description|error|success|warning|info|tooltip|hint)$/i, // UI keys
  ],
  filePatterns: ["**/*.{ts,tsx,js,jsx}"],
};
```

## File Structure

```
locales/
├── en.json          # Default language (source of truth)
├── de.json          # German translations
├── fr.json          # French translations
└── ...

# Each locale file contains:
{
  "message.id": "Translated text",
  "another.id": "Another translation"
}
```

## Best Practices

1. **Keep Seed Text Human-Readable**: The first argument to `t()` should be clear, natural language
2. **Use Descriptive IDs**: Make IDs meaningful and hierarchical (e.g., `auth.login.button`)
3. **Review Auto-Detections**: Always review what the scanner finds before applying
4. **Test Translations**: Verify translations make sense in context
5. **Use AI Validation**: Enable AI validation for production use to catch false positives

## Safety Features

- **Import Detection**: Prevents broken imports that would crash your app
- **Error Handling**: Gracefully handles malformed files and parsing errors
- **Fallback Validation**: AI validation falls back to heuristics if API fails
- **Dry Run Mode**: Test transformations without modifying files
- **Comprehensive Testing**: Extensive unit tests for critical functionality

## Troubleshooting

### Import Not Added

If the `import { t } from "@i18n-core"` is not being added:

1. Check that the file has translatable text
2. Verify the file is being scanned (check console output)
3. Ensure the file is a supported type (`.ts`, `.tsx`, `.js`, `.jsx`)
4. Check for syntax errors in the file

### False Positives

If the scanner is detecting non-translatable text:

1. Adjust confidence threshold with `--confidence`
2. Enable AI validation with `--ai-validate`
3. Review and customize exclusion patterns
4. Use dry-run mode to preview changes

### Performance Issues

For large codebases:

1. Use more specific `--root` paths
2. Adjust file patterns to exclude unnecessary directories
3. Use higher confidence thresholds to reduce processing
4. Consider running scans incrementally on changed files

## Development

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode for development
```

### Building

```bash
pnpm build             # Build the package
pnpm type-check        # TypeScript type checking
```

## License

MIT
