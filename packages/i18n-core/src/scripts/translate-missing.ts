#!/usr/bin/env node
import { t } from "@i18n-core";
import fs from "node:fs";
import path from "node:path";

type LocaleFile = Record<string, string>;

interface TranslateOptions {
  sourceLocale: string;
  targetLocale: string;
  groqApiKey: string;
  localesDir: string;
}

async function translateBatch(
  texts: string[],
  targetLocale: string,
  groqApiKey: string
): Promise<string[]> {
  const prompt = `You are a professional translator specializing in user interface (UI) and user experience (UX) content.

Translate the following English texts into ${targetLocale}.

CRITICAL: Return ONLY a valid JSON array of translated strings. Do not include any explanations, introductions, or extra text.

RULES:
- Return ONLY a valid JSON array of translated strings.
- Each entry must correspond to the input array in order.
- Do not add numbering, explanations, or extra text.
- Preserve placeholders like {name}, {count}, etc.
- Maintain the same tone and style as the original text.
- For UI elements, use appropriate terminology for the target language.
- Do not add quotes around the translations.
- Do not add bullet points or formatting.
- Do not concatenate multiple translations into a single string.

Input texts:
${JSON.stringify(texts)}

Response (JSON array only):`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        temperature: 0.1,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();

    // 1) Try strict JSON extraction (array or object with translations[])
    const jsonSegment = extractJsonSegment(raw);
    let translations: string[] | null = null;

    if (jsonSegment) {
      try {
        const parsed = JSON.parse(jsonSegment);
        if (Array.isArray(parsed)) {
          translations = parsed as string[];
        } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).translations)) {
          translations = (parsed as any).translations as string[];
        }
      } catch {
        // fall through to fallback parser
      }
    }

    // 2) Fallback: minimal line parser
    if (!translations) {
      const cleaned = stripCodeFences(raw);
      translations = cleaned
        .split("\n")
        .map((line: string) =>
          line
            .replace(/^\s*\d+\.\s*/, "") // "1. "
            .replace(/^[-•]\s*/, "")     // bullets
            .replace(/^\[|\]$/g, "")     // stray array brackets on single line
            .replace(/^"+|"+$/g, "")     // outer quotes
            .trim()
        )
        .filter(Boolean);

      // If single JSON-ish line slipped through, parse it
      if (translations.length === 1 && /^[\[\{]/.test(translations[0])) {
        try {
          const maybe = JSON.parse(translations[0]);
          if (Array.isArray(maybe)) translations = maybe as string[];
          else if (maybe && typeof maybe === "object" && Array.isArray((maybe as any).translations)) {
            translations = (maybe as any).translations as string[];
          }
        } catch {
          // keep fallback result
        }
      }
    }

    // 3) Guarantee length & placeholders
    translations = coerceLength(translations, texts.length, texts);
    translations = enforcePlaceholders(translations, texts);

    return translations;
  } catch (error) {
    console.error("Failed to translate batch:", error);
    return texts; // non-breaking: return originals on error
  }
}

/** Remove ``` and ```json fences if present */
function stripCodeFences(s: string): string {
  return s.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
}

/**
 * Extract the first well-formed JSON segment (array or object) from a messy string.
 * - Finds first '[' or '{'
 * - Walks until the matching closing bracket using depth counting
 * - Respects string literals and escape sequences
 */
function extractJsonSegment(s: string): string | null {
  const input = stripCodeFences(s);

  let start = -1;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "[" || ch === "{") { start = i; break; }
  }
  if (start === -1) return null;

  const open = input[start];
  const close = open === "[" ? "]" : "}";

  let depth = 0;
  let inString: false | '"' | "'" = false;
  let escape = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === inString) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch as '"' | "'";
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return input.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

/** Ensure array has exact desired length; pad with originals if needed */
function coerceLength(arr: string[] | null, len: number, originals: string[]): string[] {
  let out = Array.isArray(arr) ? arr.slice(0, len) : [];
  while (out.length < len) out.push(originals[out.length]);
  return out;
}

/** Verify placeholders like {name}, {count} are preserved exactly; if not, fall back to original */
function enforcePlaceholders(trans: string[], originals: string[]): string[] {
  const rx = /\{[^}]+\}/g;
  return trans.map((t, i) => {
    const src = originals[i] ?? "";
    const srcPH = (src.match(rx) ?? []).sort().join("|");
    const dstPH = (t.match(rx) ?? []).sort().join("|");
    return srcPH === dstPH ? t : src;
  });
}

async function translateMissingValues(options: TranslateOptions): Promise<void> {
  const { sourceLocale, targetLocale, groqApiKey, localesDir } = options;

  const sourcePath = path.join(localesDir, `${sourceLocale}.json`);
  const targetPath = path.join(localesDir, `${targetLocale}.json`);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source locale file not found: ${sourcePath}`);
    return;
  }

  const sourceData: LocaleFile = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const targetData: LocaleFile = fs.existsSync(targetPath)
    ? JSON.parse(fs.readFileSync(targetPath, "utf8"))
    : {};

  const missingKeys: string[] = [];

  for (const [key, value] of Object.entries(sourceData)) {
    if (!targetData[key] || targetData[key].trim() === "") {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length === 0) {
    console.log(`No missing translations found for ${targetLocale}`);
    return;
  }

  console.log(`Found ${missingKeys.length} missing translations for ${targetLocale}`);
  console.log("Translating...");

  const BATCH_SIZE = 10;
  for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
    const batch = missingKeys.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map((key) => sourceData[key]);

    console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} texts`);

    const translations = await translateBatch(batchTexts, targetLocale, groqApiKey);

    batch.forEach((key, index) => {
      targetData[key] = translations[index];
    });

    if (i + BATCH_SIZE < missingKeys.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2) + "\n");
  console.log(`Updated ${targetPath} with ${missingKeys.length} translations`);
}

// CLI helpers
const argv = process.argv.slice(2);
function readFlag(name: string): string | undefined {
  const flagWithValue = argv.find((arg) => arg.startsWith(`--${name}=`));
  if (flagWithValue) {
    return flagWithValue.split("=")[1];
  }
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const sourceLocale = readFlag("from") || readFlag("source") || "en";
  const targetLocale = readFlag("to") || readFlag("target");
  const groqApiKey = readFlag("groq-key");
  const localesDir = readFlag("locales-dir") || "locales";

  if (!targetLocale) {
    console.error("Please specify --to or --target locale");
    process.exit(1);
  }
  if (!groqApiKey) {
    console.error("Please specify --groq-key");
    process.exit(1);
  }

  await translateMissingValues({
    sourceLocale,
    targetLocale,
    groqApiKey,
    localesDir,
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

export { translateMissingValues };