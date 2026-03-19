import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const CACHE_ROOT = path.join(process.cwd(), ".cache", "gemini");
const inFlightRequests = new Map<string, Promise<unknown>>();

function getCacheFilePath(namespace: string, key: string) {
  const digest = createHash("sha256").update(key).digest("hex");
  return path.join(CACHE_ROOT, namespace, `${digest}.json`);
}

export async function readJsonCache<T>(namespace: string, key: string): Promise<T | null> {
  try {
    const raw = await readFile(getCacheFilePath(namespace, key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonCache(namespace: string, key: string, value: unknown) {
  const filePath = getCacheFilePath(namespace, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value), "utf8");
}

export async function withInFlightDedup<T>(
  namespace: string,
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const requestKey = `${namespace}:${key}`;
  const existing = inFlightRequests.get(requestKey) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const nextPromise = factory().finally(() => {
    inFlightRequests.delete(requestKey);
  });

  inFlightRequests.set(requestKey, nextPromise);
  return nextPromise;
}
