#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import fg from "fast-glob";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

// ------------------------- Dynamic Babel imports -------------------------
let parse: any, traverse: any, generate: any, t: any;

async function loadBabel() {
  if (!parse) {
    const parser = await import("@babel/parser");
    const traverser = await import("@babel/traverse");
    const generator = await import("@babel/generator");
    const types = await import("@babel/types");

    parse = parser.parse;
    traverse = traverser.default;
    generate = generator.default;
    t = types;
  }
}

// ------------------------- Types -------------------------
interface TextMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  context: "string_literal" | "jsx_text" | "object_value" | "template_literal";
  confidence: number; // 0-1
}

interface ScanOptions {
  minWords: number;
  maxLength: number;
  excludePatterns: RegExp[];
  includePatterns: RegExp[];
  filePatterns: string[];
}

const DEFAULT_OPTIONS: ScanOptions = {
  minWords: 3,
  maxLength: 200,
  excludePatterns: [
  // CSS classes, IDs, and selectors
  /^[a-z0-9._-]+$/i,
  /^[a-z]+(-[a-z]+)*$/i,
  /^[A-Z_][A-Z0-9_]*$/i,
  /^[a-z]+_[a-z]+$/i,
  /^[a-z]+-[a-z]+$/i,
  // URLs and paths
  /^https?:\/\//i,
  /^\/[\/\w-]*$/i,
  /^\w+\.\w+$/i,
  // Template literals and expressions
  /^\$\{.*\}$/i,
  /^#[a-f0-9]{3,8}$/i,
  // CSS values and units
  /^\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|cm|mm|in)$/i,
  /^(auto|none|inherit|initial|unset|transparent|currentColor)$/i,
  // JavaScript values
  /^(true|false|null|undefined)$/i,
  /console\.(log|error|warn|info|debug)/i,
  /^\w+\(\)/i,
  // File extensions and technical terms
  /\.(ts|tsx|js|jsx|json|css|scss|sass|less|html|svg|png|jpg|jpeg|gif|webp)$/i,
  /^(api|v1|v2|beta|alpha|dev|staging|prod|test|spec|mock|fixture)$/i,
  // Single words that are unlikely to be labels
  /^[a-z]{1,2}$/i,
  /^[A-Z][a-z]{1,2}$/i],

  includePatterns: [
  // Multi-word sentences that start with capital letter
  /([A-Z][a-z]+(?:\s+[a-z]+){2,})/i,
  /(^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  // Sentences ending with punctuation
  /([a-z]+(?:\s+[a-z]+){2,}[.!?])/i,
  // Action-oriented text
  /(click|enter|select|choose|save|cancel|submit|continue|back|next|login|signup|signin|logout|register|forgot|reset|update|delete|edit|create|add|remove|close|open|start|stop|pause|resume)/i,
  // UI text indicators
  /(error|warning|success|info|message|text|title|description|label|placeholder|tooltip|hint|help|note|tip|alert|notification|status|loading|processing|complete|finished|ready|done)/i,
  // Question patterns
  /(\?$|\?[^a-zA-Z]|^[A-Z][^.!?]*\?)/i,
  // Imperative sentences
  /(^[A-Z][a-z]+(?:\s+[a-z]+)*[.!]?$)/i],

  filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
};

// ------------------------- Heuristics -------------------------
function calculateConfidence(text: string, context: TextMatch["context"]): number {
  let score = 0;

  // Base score by context
  switch (context) {
    case "jsx_text": score = 0.8; break;
    case "string_literal": score = 0.4; break;
    case "object_value": score = 0.6; break;
    case "template_literal": score = 0.5; break;
  }

  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  
  // Length scoring
  if (wordCount >= 5) score += 0.2;
  else if (wordCount >= 3) score += 0.1;
  else if (wordCount <= 1) score -= 0.3; // Single words are less likely to be labels

  // Capitalization and punctuation
  if (/^[A-Z].*[.!?]$/.test(trimmed)) score += 0.2;
  if (/^[A-Z][a-z]/.test(trimmed)) score += 0.1;
  
  // Question marks indicate user-facing text
  if (/\?/.test(trimmed)) score += 0.2;
  
  // Exclamation marks can indicate important UI text
  if (/!/.test(trimmed)) score += 0.1;

  // Action-oriented words boost confidence
  if (/\b(click|enter|select|choose|save|cancel|submit|continue|back|next|login|signup|signin|logout|register|forgot|reset|update|delete|edit|create|add|remove|close|open|start|stop|pause|resume)\b/i.test(trimmed)) {
    score += 0.3;
  }

  // UI text indicators boost confidence
  if (/\b(error|warning|success|info|message|text|title|description|label|placeholder|tooltip|hint|help|note|tip|alert|notification|status|loading|processing|complete|finished|ready|done)\b/i.test(trimmed)) {
    score += 0.2;
  }

  // Penalize technical patterns
  for (const pattern of DEFAULT_OPTIONS.excludePatterns) {
    if (pattern.test(trimmed)) {
      score -= 0.6; // Increased penalty
      break;
    }
  }

  // Boost confidence for label-like patterns
  for (const pattern of DEFAULT_OPTIONS.includePatterns) {
    if (pattern.test(trimmed)) {
      score += 0.25; // Slightly increased boost
      break;
    }
  }

  // Additional penalties for technical content
  if (/[{}[\]()]/.test(trimmed)) score -= 0.3; // Code-like characters
  if (/[<>]/.test(trimmed)) score -= 0.4; // HTML/JSX-like characters
  if (/[;:,]/.test(trimmed)) score -= 0.2; // Code punctuation
  
  // Penalize very short technical strings
  if (trimmed.length <= 3 && /^[a-z0-9_-]+$/i.test(trimmed)) score -= 0.4;

  return Math.max(0, Math.min(1, score));
}

function predictOptimalConfidence(matches: TextMatch[]): number {
  if (matches.length === 0) return 0.7;
  const avg = matches.reduce((s, m) => s + m.confidence, 0) / matches.length;
  const sorted = matches.map((m) => m.confidence).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const heuristic = 0.75;
  const optimal = avg * 0.4 + median * 0.4 + heuristic * 0.2;
  return Math.max(0.6, Math.min(0.9, optimal));
}

// ------------------------- Scanning -------------------------
export async function scanFile(filePath: string, options: Partial<ScanOptions> = {}): Promise<TextMatch[]> {
  const opts: ScanOptions = { ...DEFAULT_OPTIONS, ...options };

  await loadBabel();

  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.trim()) return [];

    const ast = parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      sourceFilename: filePath,
      errorRecovery: true,
      tokens: false
    });

    const potentials: Array<{path: any;text: string;context: TextMatch["context"];confidence: number;}> = [];

    traverse(ast, {
      StringLiteral(p: any) {
        const text = p.node.value;
        if (typeof text === "string" && text.trim()) {
          potentials.push({ path: p, text, context: "string_literal", confidence: calculateConfidence(text, "string_literal") });
        }
      },
      JSXText(p: any) {
        const text = (p.node.value ?? "").replace(/\s+/g, " ").trim();
        if (text) potentials.push({ path: p, text, context: "jsx_text", confidence: calculateConfidence(text, "jsx_text") });
      },
      ObjectProperty(p: any) {
        if (t.isStringLiteral(p.node.value)) {
          const text = p.node.value.value;
          const key =
          t.isIdentifier(p.node.key) ? p.node.key.name :
          t.isStringLiteral(p.node.key) ? p.node.key.value : "";
          
          // Enhanced message key detection
          const isMessageKey = /^(title|message|text|label|placeholder|description|error|success|warning|info|tooltip|hint|help|note|tip|alert|notification|status|loading|processing|complete|finished|ready|done|name|alt|aria-label|aria-description|aria-placeholder)$/i.test(key);
          
          // Penalize technical property names
          const isTechnicalKey = /^(id|class|className|style|onClick|onChange|onSubmit|onBlur|onFocus|type|value|defaultValue|required|disabled|readonly|maxLength|minLength|pattern|form|action|method|target|rel|href|src|alt|width|height|size|rows|cols|tabIndex|role|data-|aria-|_|__)$/i.test(key);
          
          let base = calculateConfidence(text, "object_value");
          
          if (isMessageKey) {
            base += 0.3; // Boost for message-like keys
          } else if (isTechnicalKey) {
            base -= 0.4; // Penalize technical keys
          }
          
          potentials.push({ path: p, text, context: "object_value", confidence: base });
        }
      },
      TemplateLiteral(p: any) {
        if (p.node.expressions.length === 0) {
          const text = p.node.quasis[0]?.value?.cooked ?? "";
          if (text.trim()) potentials.push({ path: p, text, context: "template_literal", confidence: calculateConfidence(text, "template_literal") });
        }
      },
      JSXAttribute(p: any) {
        // Only scan JSX attributes that are likely to contain user-facing text
        if (t.isStringLiteral(p.node.value)) {
          const text = p.node.value.value;
          const name = p.node.name.name;
          
          // Skip technical attributes
          if (/^(id|class|className|style|onClick|onChange|onSubmit|onBlur|onFocus|type|value|defaultValue|required|disabled|readonly|maxLength|minLength|pattern|form|action|method|target|rel|href|src|width|height|size|rows|cols|tabIndex|role|data-|aria-|_|__)$/i.test(name)) {
            return;
          }
          
          // Boost confidence for message-like attributes
          const isMessageAttr = /^(title|alt|aria-label|aria-description|aria-placeholder|placeholder|label|description|tooltip|hint|help|note|tip|alert|notification|status|loading|processing|complete|finished|ready|done)$/i.test(name);
          
          let confidence = calculateConfidence(text, "string_literal");
          if (isMessageAttr) {
            confidence += 0.3;
          }
          
          potentials.push({ path: p, text, context: "string_literal", confidence });
        }
      }
    });

    return potentials.map((p) => ({
      file: filePath,
      line: p.path.node.loc?.start?.line ?? 0,
      column: p.path.node.loc?.start?.column ?? 0,
      text: p.text,
      context: p.context,
      confidence: p.confidence
    }));
  } catch (err) {
    console.error(`Failed to scan ${filePath}:`, err);
    return [];
  }
}

export async function scanProject(rootPath: string, options: Partial<ScanOptions> = {}): Promise<TextMatch[]> {
  const opts: ScanOptions = { ...DEFAULT_OPTIONS, ...options };

  const absoluteRoot = path.resolve(process.cwd(), rootPath);
  console.log(`Resolved root path: ${absoluteRoot}`);

  const files = await fg(opts.filePatterns, {
    cwd: absoluteRoot,
    absolute: true,
    ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts",
    "**/*.test.{ts,tsx,js,jsx}",
    "**/*.spec.{ts,tsx,js,jsx}"]

  });

  console.log(`Scanning ${files.length} files for translatable text...`);

  const allMatches: TextMatch[] = [];
  let processed = 0;

  const poolSize = Math.min(8, os.cpus()?.length ?? 4);
  let index = 0;

  async function scanWorker() {
    while (index < files.length) {
      const my = index++;
      const file = files[my];
      const matches = await scanFile(file, opts);
      allMatches.push(...matches);
      processed++;
      if (processed % 10 === 0) console.log(`Processed ${processed}/${files.length} files...`);
    }
  }

  await Promise.all(Array.from({ length: poolSize }, scanWorker));

  allMatches.sort((a, b) => b.confidence - a.confidence);
  console.log(`Found ${allMatches.length} potential translatable strings`);
  return allMatches;
}

// ------------------------- Transform (real & virtual) -------------------------
function groupByFile(matches: TextMatch[], minConfidence: number) {
  const groups = new Map<string, TextMatch[]>();
  for (const m of matches) {
    if (m.confidence >= minConfidence) {
      const arr = groups.get(m.file);
      if (arr) arr.push(m);else
      groups.set(m.file, [m]);
    }
  }
  return groups;
}

async function transformFileVirtual(filePath: string, matches: TextMatch[]) {
  const original = fs.readFileSync(filePath, "utf8");
  await loadBabel();

  const ast = parse(original, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    sourceFilename: filePath,
    errorRecovery: true
  });

  let modified = false;
  let hasImport = false;

  traverse(ast, {
    ImportDeclaration(p: any) {
      if (p.node.source.value === "@i18n-core") {
        const tImport = p.node.specifiers.find(
          (s: any) => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === "t"
        );
        if (tImport) hasImport = true;
      }
    }
  });

  if (!hasImport && matches.length > 0) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier("t"), t.identifier("t"))],
      t.stringLiteral("@i18n-core")
    );
    ast.program.body.unshift(importDecl);
    modified = true;
  }

  const byKey = new Map<string, TextMatch>();
  for (const m of matches) byKey.set(`${m.context}:${m.line}:${m.text}`, m);

  traverse(ast, {
    JSXText(p: any) {
      const text = (p.node.value ?? "").replace(/\s+/g, " ").trim();
      const line = p.node.loc?.start?.line ?? 0;
      const key = `jsx_text:${line}:${text}`;
      if (text && byKey.has(key)) {
        const call = t.callExpression(t.identifier("t"), [t.stringLiteral(text)]);
        p.replaceWith(t.jsxExpressionContainer(call));
        modified = true;
      }
    },
    ObjectProperty(p: any) {
      if (t.isStringLiteral(p.node.value)) {
        const text = p.node.value.value;
        const line = p.node.loc?.start?.line ?? 0;
        const key = `object_value:${line}:${text}`;
        if (byKey.has(key)) {
          p.node.value = t.callExpression(t.identifier("t"), [t.stringLiteral(text)]);
          modified = true;
        }
      }
    }
  });

  if (!modified) return { modified: false, code: original, original };

  const code = generate(ast, { retainLines: true, compact: false, comments: true }).code;
  return { modified: true, code, original };
}

// ------------------------- Open diffs in Cursor / VS Code -------------------------
type Editor = "cursor" | "code";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function tempVirtualRoot(custom?: string) {
  if (custom) {
    ensureDir(custom);
    return path.resolve(custom);
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), "i18n-virtual-"));
}

function writeVirtualFile(virtualRoot: string, realPath: string, content: string) {
  const rel = path.relative(process.cwd(), realPath);
  const outPath = path.join(virtualRoot, rel);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, content, "utf8");
  return outPath;
}

async function buildPairsForDiff(matches: TextMatch[], minConfidence: number, virtualRoot: string): Promise<DiffPair[]> {
  const groups = groupByFile(matches, minConfidence);
  const pairs: DiffPair[] = [];

  for (const [file, ms] of groups) {
    const { modified, code, original } = await transformFileVirtual(file, ms);
    if (modified && code !== original) {
      const right = writeVirtualFile(virtualRoot, file, code!);
      pairs.push({
        left: file,
        right,
        file: path.relative(process.cwd(), file),
        matches: ms
      });
    }
  }
  return pairs;
}

function openEditorDiffs(pairs: Array<{left: string;right: string;}>, editor: Editor, limit = 20) {
  const bin = editor === "cursor" ? "cursor" : "code";
  const toOpen = pairs.slice(0, Math.max(1, limit));

  if (toOpen.length === 0) {
    console.log("✨ No diffs to show.");
    return;
  }

  for (const { left, right } of toOpen) {
    const res = spawnSync(bin, ["--diff", left, right], { stdio: "ignore" });
    if (res.status !== 0) {
      console.warn(`Opening diff failed for ${left}. Is "${bin}" installed on PATH?`);
      console.warn(
        editor === "code" ?
        `VS Code: use Command Palette → “Shell Command: Install 'code' command in PATH”.` :
        `Cursor: ensure 'cursor' CLI is available.`
      );
      break;
    }
  }

  if (pairs.length > toOpen.length) {
    console.log(`Opened ${toOpen.length} diffs (limited). Remaining: ${pairs.length - toOpen.length}.`);
  } else {
    console.log(`Opened ${pairs.length} diff tab(s) in ${bin}.`);
  }
}

async function promptForConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const choice = answer.toLowerCase().trim();
      resolve(choice === 'y' || choice === 'yes');
    });
  });
}

// ------------------------- Native IDE Diff GUI Integration -------------------------
interface DiffPair {
  left: string; // Original file path
  right: string; // Virtual transformed file path
  file: string; // Relative file path for display
  matches: TextMatch[];
}

async function openNativeDiffWorkflow(pairs: DiffPair[], editor: Editor, limit: number, virtualRoot: string): Promise<void> {
  console.log(`\n🎯 Opening ${pairs.length} diffs in ${editor} for native GUI review...`);
  console.log("=".repeat(60));
  console.log("📋 Instructions for native diff review:");
  console.log("   1. Review each diff in the IDE's native diff viewer");
  console.log("   2. Use the IDE's built-in accept/reject buttons for individual changes");
  console.log("   3. Save the files with your accepted changes");
  console.log("   4. Return here when finished to apply changes and cleanup");
  console.log("=".repeat(60));

  // Open diffs in IDE
  openEditorDiffs(pairs, editor, limit);

  // Wait for user to complete review in IDE
  const apply = await promptForConfirmation(
    "Have you finished reviewing and accepting changes in the IDE? Apply accepted changes to source files? (y/n): "
  );

  if (apply) {
    console.log("\n🚀 Applying accepted changes from IDE to source files...");

    for (const pair of pairs) {
      try {
        // Read the potentially modified virtual file (user may have made additional changes)
        const virtualContent = fs.readFileSync(pair.right, "utf8");
        const originalContent = fs.readFileSync(pair.left, "utf8");

        // Only apply if the virtual file is different from original
        if (virtualContent !== originalContent) {
          fs.writeFileSync(pair.left, virtualContent, "utf8");
          const fileName = path.relative(process.cwd(), pair.left);
          console.log(`   ✅ Applied: ${fileName}`);
        } else {
          const fileName = path.relative(process.cwd(), pair.left);
          console.log(`   ⏭️  No changes: ${fileName}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to apply ${pair.left}: ${error}`);
      }
    }

    console.log("\n🎉 Changes applied to source files!");
  } else {
    console.log("Changes not applied to source files.");
  }

  // Always cleanup temp files
  console.log("\n🧹 Cleaning up temporary files...");
  try {
    if (fs.existsSync(virtualRoot)) {
      fs.rmSync(virtualRoot, { recursive: true, force: true });
      console.log(`   ✅ Removed: ${virtualRoot}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  Warning: Could not remove ${virtualRoot}: ${error}`);
  }

  console.log("\n📊 Workflow complete! Your source files have been updated with accepted changes.");
}

// ------------------------- CLI -------------------------
async function main() {
  const args = process.argv.slice(2);
  const rootPath = args.find((a) => a.startsWith("--root="))?.split("=")[1] ?? process.cwd();
  const minConfidence = parseFloat(args.find((a) => a.startsWith("--confidence="))?.split("=")[1] ?? "0.7");
  const dryRun = args.includes("--dry-run");

  // New: native diff flags
  const openDiff = args.find((a) => a.startsWith("--open-diff="))?.split("=")[1] as Editor | undefined;
  const openLimit = parseInt(args.find((a) => a.startsWith("--open-limit="))?.split("=")[1] ?? "", 10) || 20;
  const virtualDir = args.find((a) => a.startsWith("--virtual-dir="))?.split("=")[1];
  const interactive = args.includes("--interactive");

  console.log("🔍 Auto-scanning for translatable text...");
  console.log(`Root: ${rootPath}`);
  console.log(`Min confidence: ${minConfidence}`);
  if (openDiff) console.log(`Diffs: ${openDiff} | limit=${openLimit} | virtual root=${virtualDir ?? "(temp dir)"}`);
  if (interactive) console.log(`Interactive mode: enabled`);

  const matches = await scanProject(rootPath);

  const optimalConfidence = predictOptimalConfidence(matches);
  console.log("\n📊 Summary:");
  console.log(`Total matches: ${matches.length}`);
  console.log(`High confidence (≥${minConfidence}): ${matches.filter((m) => m.confidence >= minConfidence).length}`);
  console.log(`🎯 Suggested confidence: ${optimalConfidence.toFixed(3)}`);

  // ---- Interactive mode (native IDE diff GUI) ----
  if (interactive) {
    console.log("\n🎯 Starting native IDE diff workflow...");
    const root = tempVirtualRoot(virtualDir);
    const pairs = await buildPairsForDiff(matches, minConfidence, root);

    if (pairs.length === 0) {
      console.log("✨ No changes to review!");
      return;
    }

    await openNativeDiffWorkflow(pairs, openDiff || "code", openLimit, root);
    return;
  }

  if (openDiff) {
    const root = tempVirtualRoot(virtualDir);
    const pairs = await buildPairsForDiff(matches, minConfidence, root);
    openNativeDiffWorkflow(pairs, openDiff, openLimit, root);
    return; // do not touch files
  }

  if (dryRun) {
    console.log("\n🔍 Top 20 matches (dry run):");
    matches.slice(0, 20).forEach((m) => {
      const rel = path.relative(process.cwd(), m.file);
      console.log(`  ${m.confidence.toFixed(2)} | ${rel}:${m.line} | ${m.context} | "${m.text}"`);
    });
    return;
  }

  // If you also want a non-diff apply mode, you can add it back here.
  console.log("\nNo action chosen. Use --open-diff=cursor or --open-diff=code to view diffs.");
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  // Node 18+ has global fetch, but we don't need it here.
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}