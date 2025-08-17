import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { glob } from "glob";

const getFilesInDir = async (dir: string, globPattern: string = `${dir}/**/*`) => {
    const files = await glob(`${dir}/${globPattern}`, { ignore: ["**/node_modules/**"] });
    return files;
}

type Cache = Map<string, { mtimeMs: number; size: number; hash: string }>;
const metaCache: Cache = new Map();

export async function tagFor(file: string): Promise<string> {
  const s = await stat(file); // cheap
  const prev = metaCache.get(file);
  if (prev && prev.mtimeMs === s.mtimeMs && prev.size === s.size) {
    console.log("no re-hash", file);
    return prev.hash; // no re-hash
  }
  // only when mtime/size changed, compute content hash
  const buf = await readFile(file);
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 8);
  metaCache.set(file, { mtimeMs: s.mtimeMs, size: s.size, hash });
  return hash;
}

export async function getFileContent(file: string): Promise<string> {
  const buf = await readFile(file);
  return buf.toString();
}

export async function parseJsonFile<T>(file: string): Promise<T> {
  const buf = await readFile(file);
  return JSON.parse(buf.toString()) as T;
}

export { getFilesInDir };