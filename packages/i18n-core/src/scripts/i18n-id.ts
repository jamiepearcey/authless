// Stable, readable IDs: route.component.slot.slug__hash
export function normalizeSeed(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

export function slug(s: string) {
  // Limit to first 5 words to keep IDs reasonable
  const words = s.split(/\s+/).slice(0, 5);
  return words.join("_").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// stable short hash (base36)
export function hash53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).slice(0, 6);
}

// keep last 2–3 segments after pages/app/routes/src; drop extension and "index"
export function routeNs(absPath: string, root: string) {
  const rel = absPath.replace(root, "").replace(/^[\\/]/, "");
  const noExt = rel.replace(/\.[tj]sx?$/, "");
  const parts = noExt.split(/[\\/]/);
  const anchor = Math.max(0, parts.findIndex((p) => ["pages", "app", "routes", "src"].includes(p)) + 1);
  return parts
    .slice(anchor)
    .slice(-3)
    .join(".")
    .replace(/\.index$/, "")
    .toLowerCase();
}