import { t } from "@i18n-core";import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

export type AppTarget = {
  appRoot: string; // directory that owns locales.settings.json
  settingsPath: string; // absolute path to locales.settings.json
};

export type FindOptions = {
  /** Start searching from here (defaults to process.cwd()). */
  startDir?: string;
  /** Override glob used to find apps (relative to detected monorepo root). */
  appsGlob?: string | string[];
  /** If provided, use this settings file only (absolute or relative). */
  settingsPath?: string;
  /** Extra ignore globs. */
  ignore?: string[];
};

/** Find a “monorepo root” (pnpm/yarn/turbo) or fall back to git root or filesystem root. */
function findMonorepoRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  while (true) {
    const pkg = path.join(dir, "package.json");
    const pnpm = path.join(dir, "pnpm-workspace.yaml");
    const yarn = path.join(dir, "yarn.lock");
    const turbo = path.join(dir, "turbo.json");
    if (
    fs.existsSync(pnpm) ||
    fs.existsSync(turbo) ||
    fs.existsSync(pkg) && (() => {
      try {
        const j = JSON.parse(fs.readFileSync(pkg, "utf8"));
        return !!(j.workspaces || j.packages);
      } catch {return false;}
    })())
    return dir;

    // fallback: git root
    if (fs.existsSync(path.join(dir, ".git"))) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) return start; // give up
    dir = parent;
  }
}

/** Look for all apps that contain locales.settings.json, starting from a monorepo root. */
export async function findApps(opts: FindOptions = {}): Promise<AppTarget[]> {
  // 1) If an explicit settings path is given, use only that.
  if (opts.settingsPath) {
    const p = path.resolve(opts.startDir ?? process.cwd(), opts.settingsPath);
    if (!fs.existsSync(p)) throw new Error(`settings file not found: ${p}`);
    return [{ appRoot: path.dirname(p), settingsPath: p }];
  }

  // 2) Determine repo root (monorepo root if present)
  const repoRoot = findMonorepoRoot(opts.startDir ?? process.cwd());

  // 3) Find every locales.settings.json under the repo root (or an appsGlob subset)
  const patterns = Array.isArray(opts.appsGlob) ? opts.appsGlob : [opts.appsGlob ?? "**/*"];
  const settingsGlobs = patterns.map((g) => path.posix.join(g.replace(/\\/g, "/"), "locales.settings.json"));

  const ignore = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/.turbo/**",
  ...(opts.ignore ?? [])];


  const matches = await fg(settingsGlobs, {
    cwd: repoRoot,
    ignore,
    absolute: true,
    dot: false,
    followSymbolicLinks: true
  });

  // 4) De‑dupe & normalize
  const seen = new Set<string>();
  const apps: AppTarget[] = [];
  for (const sp of matches) {
    const norm = path.resolve(sp);
    if (seen.has(norm)) continue;
    seen.add(norm);
    apps.push({ appRoot: path.dirname(norm), settingsPath: norm });
  }

  if (apps.length === 0) {
    throw new Error(
      `No locales.settings.json found.\n` +
      `Searched from: ${repoRoot}\n` +
      `Patterns: ${settingsGlobs.join(", ")}\n` +
      `Tip: create one in each Next.js app (next to its app/ or pages/ folder).`
    );
  }

  return apps;
}