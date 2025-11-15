import { decryptApiKey } from "../utils/crypto.js";

interface StorageDefaults {
  searchHistoryList: string[];
  favoriteList: string[];
  geminiApiKey: string;
  aesKey: JsonWebKey | null;
  startAddr: string;
  authUser: number;
  isIncognito: boolean;
  videoSummaryToggle: boolean;
}

interface StorageCache extends StorageDefaults {
  [key: string]: any;
}

// URLs
export let queryUrl = "https://www.google.com/maps?authuser=0&";
export let routeUrl = "https://www.google.com/maps/dir/?authuser=0&";

export function updateUserUrls(authUser: any): void {
  // Arrays should default to 0 instead of being coerced to numbers
  if (Array.isArray(authUser) || (typeof authUser === 'object' && authUser !== null)) {
    authUser = 0;
  }
  
  const n = Number(authUser);
  const au = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  queryUrl = `https://www.google.com/maps?authuser=${au}&`;
  routeUrl = `https://www.google.com/maps/dir/?authuser=${au}&`;
}

export function buildSearchUrl(q: string): string {
  return `${queryUrl}q=${encodeURIComponent(q ?? "")}`;
}

export function buildDirectionsUrl(origin: string, destination: string): string {
  return `${routeUrl}api=1&origin=${encodeURIComponent(origin ?? "")}&destination=${encodeURIComponent(destination ?? "")}`;
}

export function buildMapsUrl(): string {
  return queryUrl.slice(0, -1);
}

// Cache
export const DEFAULTS: Readonly<StorageDefaults> = Object.freeze({
  searchHistoryList: [],
  favoriteList: [],
  geminiApiKey: "",
  aesKey: null,
  startAddr: "",
  authUser: 0,
  isIncognito: false,
  videoSummaryToggle: false,
});

let cache: StorageCache | null = null;
let loading: Promise<StorageCache> | null = null;

export async function ensureWarm(): Promise<StorageCache> {
  if (cache) return cache;
  if (loading) return loading;
  loading = chrome.storage.local.get(DEFAULTS)
    .then(async (v: any) => {
      if (v.geminiApiKey) {
        try {
          v.geminiApiKey = await decryptApiKey(String(v.geminiApiKey));
        } catch (_e) {
          v.geminiApiKey = "";
        }
      }
      cache = v as StorageCache;
      updateUserUrls(v.authUser);
      return cache;
    })
    .finally(() => { loading = null; });
  return loading;
}

export function getCache(): StorageCache {
  return cache ?? (DEFAULTS as unknown as StorageCache);
}

export async function getApiKey(): Promise<string> {
  await ensureWarm();
  const k = cache?.geminiApiKey;
  if (!k) throw new Error("No API key found. Please provide one.");
  return k;
}

export async function applyStorageChanges(
  changes: { [key: string]: chrome.storage.StorageChange },
  area: string
): Promise<void> {
  if (area !== "local") return;
  if (!cache) cache = { ...DEFAULTS } as StorageCache;
  for (const [k, { newValue }] of Object.entries(changes)) {
    if (k === "geminiApiKey") {
      try {
        cache[k] = await decryptApiKey(String(newValue));
      } catch (_e) {
        cache[k] = "";
      }
    } else {
      cache[k] = newValue;
      if (k === "authUser") updateUserUrls(newValue);
    }
  }
}

// This helps with test isolation without affecting production code
export function __resetCacheForTesting(): void {
  cache = null;
  loading = null;
  // Reset URLs to default values
  queryUrl = "https://www.google.com/maps?authuser=0&";
  routeUrl = "https://www.google.com/maps/dir/?authuser=0&";
}
