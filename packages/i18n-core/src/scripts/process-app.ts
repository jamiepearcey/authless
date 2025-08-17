import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
const traverseFn = (traverse as any).default;
import * as babelTypes from "@babel/types";
import generate from "@babel/generator";
const generateFn = (generate as any).default;
import { normalizeSeed, slug, hash53, routeNs } from "./i18n-id";

type Found = {id: string;seed: string;file: string;line: number;};
type AppSettings = {
  sourceLocale: string;
  defaultLocale: string;
  locales: string[];
  localesDir: string;
  sourceGlobs?: string[];
  ignoreGlobs?: string[];
};

function parseAst(code: string, filename: string) {
  return parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
    sourceFilename: filename
  });
}

async function format(code: string) {
  try {
    const prettier = await import("prettier");
    return prettier.format(code, { parser: "babel-ts" });
  } catch {
    return code;
  }
}

function componentChain(anc: any[]) {
  const names: string[] = [];
  for (let i = anc.length - 1; i >= 0 && names.length < 2; i--) {
    const n = anc[i].node;
    if (babelTypes.isFunctionDeclaration(n) && n.id) names.unshift(n.id.name);else
    if (babelTypes.isVariableDeclarator(n) && babelTypes.isIdentifier(n.id)) names.unshift(n.id.name);else
    if (babelTypes.isClassDeclaration(n) && n.id) names.unshift(n.id.name);
  }
  return names.join(".");
}

function siblingSlot(p: any) {
  const parent: any = p.parentPath?.node;
  if (!parent || !Array.isArray(parent.children)) return "t1";
  const siblings = parent.children.filter(
    (c: any) =>
    babelTypes.isJSXElement(c) &&
    babelTypes.isJSXIdentifier(c.openingElement.name) &&
    c.openingElement.name.name === "T"
  );
  const idx = siblings.indexOf(p.node);
  return `t${idx + 1}`;
}

function makeId(absFile: string, appRoot: string, p: any, seed: string) {
  const ns = routeNs(absFile, appRoot);
  const chain = componentChain(p.getAncestry());
  const slot = babelTypes.isJSXElement(p.node) ? siblingSlot(p) : undefined;
  const src = normalizeSeed(seed);
  const s = slug(src);
  const h = hash53(src);
  return [ns, chain, slot, `${s}__${h}`].filter(Boolean).join(".");
}

export async function processApp(appRoot: string, settingsPath: string) {
  try {
    const SETTINGS: AppSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    
    const LOCALES_DIR = path.resolve(appRoot, SETTINGS.localesDir || "locales");
    const SOURCE_LOCALE = SETTINGS.sourceLocale || "en";
    const TARGET_LOCALES = SETTINGS.locales.filter((l) => l !== SOURCE_LOCALE);
    const sourceGlobs = SETTINGS.sourceGlobs || ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"];
    const ignoreGlobs = SETTINGS.ignoreGlobs ?? [
    "**/node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "**/*.d.ts"];


  const files = await fg(sourceGlobs, { cwd: appRoot, ignore: ignoreGlobs, absolute: true });
  
  const catalog: Record<string, Found> = {};
  const existingIds = new Set<string>();
  const globalSeedToId = new Map<string, string>(); // Global map of seed text to generated ID

  function record(id: string, seed: string, file: string, line: number) {
    if (existingIds.has(id) && catalog[id] && catalog[id].seed !== seed) {
      let k = 2;
      while (existingIds.has(`${id}~${k}`)) k++;
      id = `${id}~${k}`;
    }
    existingIds.add(id);
    catalog[id] = { id, seed, file, line };
    return id;
  }

  fs.mkdirSync(LOCALES_DIR, { recursive: true });

  for (const abs of files) {
    try {
      const rel = path.relative(appRoot, abs);
      
      const code = fs.readFileSync(abs, "utf8");
      const ast = parseAst(code, rel);
      let modified = false;


      traverseFn(ast, {
        JSXElement(p: any) {
          const name = p.node.openingElement.name;
          if (!babelTypes.isJSXIdentifier(name) || name.name !== "T") return;
          const child = p.node.children.find((c: any) => babelTypes.isJSXText(c)) as babelTypes.JSXText | undefined;
          const seed = child?.value?.trim();
          if (!seed) return;

          const open = p.node.openingElement;
          const idAttr = open.attributes.find(
            (a: any) => babelTypes.isJSXAttribute(a) && babelTypes.isJSXIdentifier(a.name, { name: "id" })
          ) as babelTypes.JSXAttribute | undefined;

          if (idAttr && idAttr.value && babelTypes.isStringLiteral(idAttr.value)) {
            record(idAttr.value.value, normalizeSeed(seed), rel, p.node.loc?.start.line ?? 0);
            return;
          }

          const norm = normalizeSeed(seed);
          let finalId: string;
          if (globalSeedToId.has(norm)) {
            finalId = globalSeedToId.get(norm)!;
            // Update the existing entry with this file/line
            if (catalog[finalId]) {
              catalog[finalId].file = `${catalog[finalId].file}, ${rel}:${p.node.loc?.start.line ?? 0}`;
            }
          } else {
            const genId = makeId(abs, appRoot, p, seed);
            finalId = record(genId, norm, rel, p.node.loc?.start.line ?? 0);
            globalSeedToId.set(norm, finalId);
          }
          open.attributes.push(babelTypes.jsxAttribute(babelTypes.jsxIdentifier("id"), babelTypes.stringLiteral(finalId)));
          modified = true;
        },

        CallExpression(p: any) {
          const callee = p.node.callee;
          if (!babelTypes.isIdentifier(callee) || callee.name !== "t") return;
          const args = p.node.arguments;
          if (!args.length) return;
          
          const seed = babelTypes.isStringLiteral(args[0]) ? args[0].value : undefined;
          if (!seed) return;

          // Check if this already has an ID (second string argument)
          if (args.length >= 2 && babelTypes.isStringLiteral(args[1])) {
            // Already has an ID, just record it in the catalog
            const id = args[1].value;
            const norm = normalizeSeed(seed);
            record(id, norm, rel, p.node.loc?.start.line ?? 0);
            globalSeedToId.set(norm, id);
            // Skip further processing since this already has an ID
            return;
          }

          // Only process t("text") calls without an ID
          const norm = normalizeSeed(seed);
          
          // Check if we already have an ID for this seed text globally
          let finalId: string;
          if (globalSeedToId.has(norm)) {
            finalId = globalSeedToId.get(norm)!;
            // Update the existing entry with this file/line
            if (catalog[finalId]) {
              catalog[finalId].file = `${catalog[finalId].file}, ${rel}:${p.node.loc?.start.line ?? 0}`;
            }
          } else {
            const genId = makeId(abs, appRoot, p, seed);
            finalId = record(genId, norm, rel, p.node.loc?.start.line ?? 0);
            globalSeedToId.set(norm, finalId);
          }

          // Check if there are vars (third argument)
          // If we have 3+ arguments and the second is undefined/null, treat it as vars placeholder
          const hasVars = args.length >= 3 &&
          babelTypes.isIdentifier(args[1]) && args[1].name === "undefined" ||
          babelTypes.isNullLiteral(args[1]);

          if (hasVars) {
            // Shift vars to the right and insert ID in second position
            const vars = args[2]; // vars is the third argument
            args[1] = babelTypes.stringLiteral(finalId);
            args[2] = vars;
          } else {
            // Add the ID as the second argument
            args.push(babelTypes.stringLiteral(finalId));
          }

          modified = true;
        }
      });

      if (modified) {
        const output = generateFn(ast).code;
        fs.writeFileSync(abs, await format(output));
        console.log(`[i18n] updated ${rel}`);
      }
    } catch (error) {
      console.warn(`[i18n] Failed to process ${path.relative(appRoot, abs)}:`, error);
      continue;
    }
  }

  // write per‑app artifacts
  fs.mkdirSync(LOCALES_DIR, { recursive: true });

  // Write source locale file with seed text
  const SOURCE_LOCALE_PATH = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
  const sourceLocaleData: Record<string, string> = {};
  for (const [id, entry] of Object.entries(catalog)) {
    sourceLocaleData[id] = entry.seed;
  }
  fs.writeFileSync(SOURCE_LOCALE_PATH, JSON.stringify(sourceLocaleData, null, 2) + "\n");

  // Write target locale files
  for (const lc of TARGET_LOCALES) {
    const fp = path.join(LOCALES_DIR, `${lc}.json`);
    const existing = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : {};
    const next = { ...existing };
    for (const id of Object.keys(catalog)) if (!(id in next)) next[id] = "";
    for (const k of Object.keys(next)) if (!catalog[k]) delete next[k];
    fs.writeFileSync(fp, JSON.stringify(next, null, 2) + "\n");
  }



  console.log(`[i18n] ${Object.keys(catalog).length} messages in ${path.relative(process.cwd(), appRoot)}`);
  } catch (error) {
    console.error(`[i18n] processApp failed:`, error);
    throw error;
  }
}