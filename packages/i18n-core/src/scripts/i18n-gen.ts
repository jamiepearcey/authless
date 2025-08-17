#!/usr/bin/env node
import path from "node:path";
import { findApps } from "./find-apps";
import { processApp } from "./process-app";

// Enhanced CLI flags with better argument parsing
const argv = process.argv.slice(2);

function readFlag(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

function readFlagArray(name: string): string[] | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const values: string[] = [];
  let j = i + 1;
  while (j < argv.length && !argv[j].startsWith('--')) {
    values.push(argv[j]);
    j++;
  }
  return values.length > 0 ? values : undefined;
}

function readBooleanFlag(name: string): boolean {
  return argv.includes(`--${name}`);
}

function showHelp() {
  console.log(`
i18n:generate - Generate locale files for multiple apps in a monorepo

Usage: pnpm i18n:generate [options]

Options:
  --root <path>              Start searching from this directory (default: current directory)
  --apps-glob <pattern>      Glob pattern to limit app discovery (e.g., "apps/*")
  --settings <path>          Explicit path to a single settings file
  --ignore <pattern>         Additional ignore patterns (can be specified multiple times)
  --verbose                  Enable verbose logging
  --dry-run                  Preview changes without modifying files
  --help                     Show this help message

Examples:
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
`);
}

(async () => {
  // Show help if requested
  if (readBooleanFlag("help")) {
    showHelp();
    return;
  }

  const startDir = readFlag("root") || process.cwd();
  const appsGlob = readFlag("apps-glob");
  const settingsPath = readFlag("settings");
  const ignorePatterns = readFlagArray("ignore");
  const verbose = readBooleanFlag("verbose");
  const dryRun = readBooleanFlag("dry-run");

  if (verbose) {
    console.log("🔍 i18n:generate - Enhanced app discovery and processing");
    console.log(`Root directory: ${startDir}`);
    if (appsGlob) console.log(`Apps glob: ${appsGlob}`);
    if (settingsPath) console.log(`Settings path: ${settingsPath}`);
    if (ignorePatterns) console.log(`Ignore patterns: ${ignorePatterns.join(", ")}`);
    if (dryRun) console.log("DRY RUN MODE - No files will be modified");
    console.log("");
  }

  try {
    const apps = await findApps({
      startDir,
      appsGlob,
      settingsPath,
      ignore: ignorePatterns,
    });

    if (verbose) {
      console.log(`📁 Found ${apps.length} app(s) to process:`);
      apps.forEach((app, index) => {
        const relativePath = path.relative(startDir, app.appRoot);
        console.log(`  ${index + 1}. ${relativePath} (${app.settingsPath})`);
      });
      console.log("");
    }

    for (const [index, app] of apps.entries()) {
      const relativePath = path.relative(startDir, app.appRoot);
      console.log(`\n=== i18n: processing app ${index + 1}/${apps.length}: ${relativePath} ===`);
      
      if (dryRun) {
        console.log(`[DRY RUN] Would process ${relativePath} with settings: ${app.settingsPath}`);
        continue;
      }

      try {
        await processApp(app.appRoot, app.settingsPath);
        console.log(`✅ Successfully processed ${relativePath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to process ${relativePath}:`, errorMessage);
        // Continue with other apps instead of failing completely
        continue;
      }
    }

    console.log(`\n🎉 i18n:generate completed successfully!`);
    console.log(`Processed ${apps.length} app(s) from ${startDir}`);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ i18n:generate failed:", errorMessage);
    if (verbose) {
      console.error("\nStack trace:", err);
    }
    process.exit(1);
  }
})().catch((err) => {
  console.error("❌ Unexpected error:", err.message || err);
  process.exit(1);
});