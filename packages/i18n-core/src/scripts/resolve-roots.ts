import { t } from "@i18n-core"; // scripts/resolve-roots.ts
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

export type ResolvedConfig = {
  appRoot: string; // the Next.js app folder (cwd if simple app)
  localesDir: string; // absolute path for locale JSONs
  sourceGlobs: string[]; // where to scan for t()/ <T>
  ignoreGlobs: string[]; // what to ignore
  settingsPath: string; // path to the settings JSON used
};

// find the repo (git) root as an upper bound
function findGitRoot(start = process.cwd()) {
  let dir = start;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

function looksLikeNextApp(dir: string) {
  const hasApp = fs.existsSync(path.join(dir, "app"));
  const hasPages = fs.existsSync(path.join(dir, "pages"));
  const hasNextConfig = ["next.config.js", "next.config.mjs", "next.config.ts"].
  some((f) => fs.existsSync(path.join(dir, f)));
  const pkgPath = path.join(dir, "package.json");
  const hasNextDep = fs.existsSync(pkgPath) && (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch {return false;}
  })();

  return (hasApp || hasPages) && (hasNextConfig || hasNextDep);
}

export function resolveConfig(cliRoot?: string): ResolvedConfig {
  // 1) prefer settings at CWD
  const cwd = cliRoot ? path.resolve(cliRoot) : process.cwd();
  const settingsAtCwd = path.join(cwd, "locales.settings.json");
  if (fs.existsSync(settingsAtCwd)) {
    const s = JSON.parse(fs.readFileSync(settingsAtCwd, "utf8"));
    const appRoot = cwd;
    return {
      appRoot,
      localesDir: path.resolve(appRoot, s.localesDir ?? "locales"),
      sourceGlobs: s.sourceGlobs ?? ["app/**/*.{ts,tsx}"],
      ignoreGlobs: s.ignoreGlobs ?? ["**/node_modules/**", ".next/**", "dist/**", "build/**", "**/*.d.ts"],
      settingsPath: settingsAtCwd
    };
  }

  // 2) search for settings in subdirs (monorepo)
  const gitRoot = findGitRoot(cwd);
  const foundSettings = fg.sync(["**/locales.settings.json"], {
    cwd: gitRoot,
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    absolute: true,
    followSymbolicLinks: true,
    suppressErrors: true
  });

  if (foundSettings.length === 1) {
    const settingsPath = foundSettings[0];
    const appRoot = path.dirname(settingsPath);
    const s = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return {
      appRoot,
      localesDir: path.resolve(appRoot, s.localesDir ?? "locales"),
      sourceGlobs: s.sourceGlobs ?? ["app/**/*.{ts,tsx}"],
      ignoreGlobs: s.ignoreGlobs ?? ["**/node_modules/**", ".next/**", "dist/**", "build/**", "**/*.d.ts"],
      settingsPath
    };
  }

  if (foundSettings.length > 1) {
    // multiple apps—pick the one that looks like a Next app or matches CWD
    const nextLike = foundSettings.
    map((p) => path.dirname(p)).
    filter(looksLikeNextApp);
    const appRoot = nextLike[0] ?? path.dirname(foundSettings[0]);
    const s = JSON.parse(fs.readFileSync(path.join(appRoot, "locales.settings.json"), "utf8"));
    return {
      appRoot,
      localesDir: path.resolve(appRoot, s.localesDir ?? "locales"),
      sourceGlobs: s.sourceGlobs ?? ["app/**/*.{ts,tsx}"],
      ignoreGlobs: s.ignoreGlobs ?? ["**/node_modules/**", ".next/**", "dist/**", "build/**", "**/*.d.ts"],
      settingsPath: path.join(appRoot, "locales.settings.json")
    };
  }

  // 3) no settings file anywhere: auto-detect a Next app
  // search for next apps under git root
  const candidates = fg.sync(["**/"], {
    cwd: gitRoot,
    onlyDirectories: true,
    deep: 3,
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"]
  }).map((p) => path.resolve(gitRoot, p)).
  filter(looksLikeNextApp);

  const appRoot = candidates[0] ?? cwd;
  return {
    appRoot,
    localesDir: path.resolve(appRoot, "locales"),
    sourceGlobs: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignoreGlobs: ["**/node_modules/**", ".next/**", "dist/**", "build/**", "**/*.d.ts"],
    settingsPath: "(auto)"
  };
} // scripts/i18n-gen.ts