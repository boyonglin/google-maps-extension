import { decryptApiKey } from "../utils/crypto.js";
// URLs
export let queryUrl = "https://www.google.com/maps?authuser=0&";
export let routeUrl = "https://www.google.com/maps/dir/?authuser=0&";
export function updateUserUrls(authUser) {
    // Arrays should default to 0 instead of being coerced to numbers
    if (Array.isArray(authUser) || (typeof authUser === 'object' && authUser !== null)) {
        authUser = 0;
    }
    const n = Number(authUser);
    const au = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    queryUrl = `https://www.google.com/maps?authuser=${au}&`;
    routeUrl = `https://www.google.com/maps/dir/?authuser=${au}&`;
}
export function buildSearchUrl(q) {
    return `${queryUrl}q=${encodeURIComponent(q || "")}`;
}
export function buildDirectionsUrl(origin, destination) {
    return `${routeUrl}api=1&origin=${encodeURIComponent(origin || "")}&destination=${encodeURIComponent(destination || "")}`;
}
export function buildMapsUrl() {
    return queryUrl.slice(0, -1);
}
// Cache
export const DEFAULTS = Object.freeze({
    searchHistoryList: [],
    favoriteList: [],
    geminiApiKey: "",
    aesKey: null,
    startAddr: "",
    authUser: 0,
    isIncognito: false,
    videoSummaryToggle: false,
});
let cache = null;
let loading = null;
export async function ensureWarm() {
    if (cache)
        return cache;
    if (loading)
        return loading;
    loading = chrome.storage.local.get(DEFAULTS)
        .then(async (v) => {
        if (v.geminiApiKey) {
            try {
                v.geminiApiKey = await decryptApiKey(String(v.geminiApiKey));
            }
            catch {
                v.geminiApiKey = "";
            }
        }
        cache = v;
        updateUserUrls(v.authUser);
        return cache;
    })
        .finally(() => { loading = null; });
    return loading;
}
export function getCache() {
    return cache ?? DEFAULTS;
}
export async function getApiKey() {
    await ensureWarm();
    const k = cache?.geminiApiKey;
    if (!k)
        throw new Error("No API key found. Please provide one.");
    return k;
}
export async function applyStorageChanges(changes, area) {
    if (area !== "local")
        return;
    if (!cache)
        cache = { ...DEFAULTS };
    for (const [k, { newValue }] of Object.entries(changes)) {
        // Validate key exists in DEFAULTS to prevent object injection
        if (!(k in DEFAULTS))
            continue;
        // Guard against prototype pollution keys
        if (k === "__proto__" || k === "constructor" || k === "prototype")
            continue;
        // Use type-safe access
        const key = k;
        if (key === "geminiApiKey") {
            try {
                cache.geminiApiKey = await decryptApiKey(String(newValue));
            }
            catch {
                cache.geminiApiKey = "";
            }
        }
        else if (key === "searchHistoryList" || key === "favoriteList") {
            cache[key] = newValue;
        }
        else if (key === "aesKey") {
            cache[key] = newValue;
        }
        else if (key === "authUser") {
            cache[key] = newValue;
            updateUserUrls(newValue);
        }
        else if (key === "startAddr") {
            cache[key] = newValue;
        }
        else if (key === "isIncognito" || key === "videoSummaryToggle") {
            cache[key] = newValue;
        }
    }
}
// This helps with test isolation without affecting production code
export function __resetCacheForTesting() {
    cache = null;
    loading = null;
    // Reset URLs to default values
    queryUrl = "https://www.google.com/maps?authuser=0&";
    routeUrl = "https://www.google.com/maps/dir/?authuser=0&";
}
