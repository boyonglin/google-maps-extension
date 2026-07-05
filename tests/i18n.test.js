/**
 * Tests for Package/dist/utils/i18n.js
 *
 * The module is an IIFE with side effects at load time:
 *   1. captures chrome.i18n.getMessage as `originalGetMessage`
 *   2. wraps chrome.i18n.getMessage
 *   3. reads localStorage userLanguage and applies the override
 *      (synchronously from the cache, via async fetch on a miss)
 *   4. registers a chrome.storage.onChanged listener
 *   5. publishes window.I18nUtils
 *
 * Each test re-loads the module via jest.isolateModules() so the IIFE re-runs
 * against fresh state.
 */

const path = require("path");
const { flushPromises } = require("./testHelpers");

const I18N_PATH = path.resolve(__dirname, "../Package/dist/utils/i18n.js");

const JA_MESSAGES = {
  searchInputPlaceholder: { message: "Google マップを検索" },
  videoLabel: { message: "動画要約" },
};
const EN_MESSAGES = {
  searchInputPlaceholder: { message: "Search Google Maps" },
};
const FALLBACK_MESSAGE_KEY = "searchInputPlaceholder";

/** Install a fake fetch that returns the queued response. */
function installFakeFetch({ status = 200, body = JA_MESSAGES, throwOnSend = false } = {}) {
  const fakeFetch = jest.fn((url) => {
    fakeFetch.lastUrl = url;
    fakeFetch.callCount += 1;
    if (throwOnSend) return Promise.reject(new Error("network"));
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  });
  fakeFetch.lastUrl = null;
  fakeFetch.callCount = 0;
  global.fetch = fakeFetch;
  return fakeFetch;
}

/** Reset all chrome mocks + storage shims before each load. */
function resetEnvironment() {
  jest.resetModules();
  localStorage.clear();
  // Re-create the chrome.i18n.getMessage mock so each load captures a fresh
  // "original". Otherwise the second load would capture the previous wrapper
  // and we'd build up a chain of wrappers.
  global.chrome.i18n.getMessage = jest.fn((key) => `BROWSER:${key}`);
  global.chrome.storage.local.set = jest.fn((_obj, cb) => cb && cb());
  global.chrome.storage.local.remove = jest.fn((_key, cb) => cb && cb());
  global.chrome.storage.onChanged.addListener = jest.fn();
  global.chrome.runtime.getURL = jest.fn((p) => `chrome-extension://mock-id/${p}`);
  delete global.window.I18nUtils;
}

function loadI18n() {
  let mod;
  jest.isolateModules(() => {
    mod = require(I18N_PATH);
  });
  return mod;
}

function seedJaPreferenceAndCache() {
  localStorage.setItem("userLanguage", "ja");
  localStorage.setItem(
    "userLanguageMessages",
    JSON.stringify({ lang: "ja", version: "1.0.0", messages: JA_MESSAGES })
  );
}

function loadI18nWithJaCache() {
  seedJaPreferenceAndCache();
  installFakeFetch({ body: JA_MESSAGES });
  return loadI18n();
}

function getLoadedStorageChangeListener(xhrOptions) {
  installFakeFetch(xhrOptions);
  loadI18n();
  return chrome.storage.onChanged.addListener.mock.calls[0][0];
}

function expectBrowserFallbackMessage() {
  expect(chrome.i18n.getMessage(FALLBACK_MESSAGE_KEY)).toBe(`BROWSER:${FALLBACK_MESSAGE_KEY}`);
}

describe("i18n.js", () => {
  beforeEach(() => {
    resetEnvironment();
  });

  describe("boot — default", () => {
    test("with no stored preference, activeLanguage is 'auto' and getMessage falls through", () => {
      installFakeFetch();
      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expectBrowserFallbackMessage();
      // No XHR should have been issued.
      expect(global.fetch.callCount).toBe(0);
    });
  });

  describe("boot — override", () => {
    test("stored 'ja' loads bundle via fetch and overrides getMessage", async () => {
      localStorage.setItem("userLanguage", "ja");
      const fakeFetch = installFakeFetch({ body: JA_MESSAGES });

      const I18nUtils = loadI18n();
      await flushPromises();

      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
      expect(fakeFetch.callCount).toBe(1);
      expect(fakeFetch.lastUrl).toMatch(/_locales\/ja\/messages\.json$/);
      expect(chrome.i18n.getMessage("searchInputPlaceholder")).toBe("Google マップを検索");
    });

    test("unknown key in override bundle falls through to original", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ body: JA_MESSAGES });

      loadI18n();
      await flushPromises();

      expect(chrome.i18n.getMessage("notInBundle")).toBe("BROWSER:notInBundle");
    });

    test("fetch failure (non-200) degrades silently to auto", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ status: 404 });

      const I18nUtils = loadI18n();
      await flushPromises();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expectBrowserFallbackMessage();
    });

    test("fetch rejection degrades silently to auto", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ throwOnSend: true });

      const I18nUtils = loadI18n();
      await flushPromises();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
    });

    test("invalid stored language is treated as auto", () => {
      localStorage.setItem("userLanguage", "klingon");
      installFakeFetch();

      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expect(global.fetch.callCount).toBe(0);
    });
  });

  describe("messages cache", () => {
    test("cache is preferred over fetch on next boot", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ body: JA_MESSAGES });
      loadI18n();
      await flushPromises();
      expect(global.fetch.callCount).toBe(1);

      installFakeFetch({ body: { searchInputPlaceholder: { message: "FROM_FETCH" } } });
      const I18nUtils = loadI18n();

      expect(global.fetch.callCount).toBe(0);
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
      // Message comes from the cache, not a fresh fetch.
      expect(chrome.i18n.getMessage("searchInputPlaceholder")).toBe("Google マップを検索");
    });

    test("cache for a different language is ignored (fetch fires for the new lang)", async () => {
      localStorage.setItem(
        "userLanguageMessages",
        JSON.stringify({ lang: "en", messages: EN_MESSAGES })
      );
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ body: JA_MESSAGES });

      const I18nUtils = loadI18n();
      await flushPromises();

      expect(global.fetch.callCount).toBe(1);
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
    });
  });

  describe("setLanguage", () => {
    test("writes both localStorage and chrome.storage.local, pre-caches messages", async () => {
      installFakeFetch({ body: JA_MESSAGES });
      const I18nUtils = loadI18n();

      // setLanguage awaits the bundle fetch to pre-cache.
      installFakeFetch({ body: JA_MESSAGES });
      await I18nUtils.setLanguage("ja");

      expect(localStorage.getItem("userLanguage")).toBe("ja");
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { userLanguage: "ja" },
        expect.any(Function)
      );
      const cached = JSON.parse(localStorage.getItem("userLanguageMessages"));
      expect(cached.lang).toBe("ja");
      expect(cached.messages.searchInputPlaceholder.message).toBe("Google マップを検索");
    });

    test("setLanguage('auto') removes preference and cache from both stores", async () => {
      const I18nUtils = loadI18nWithJaCache();

      await I18nUtils.setLanguage("auto");

      expect(localStorage.getItem("userLanguage")).toBeNull();
      expect(localStorage.getItem("userLanguageMessages")).toBeNull();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        "userLanguage",
        expect.any(Function)
      );
    });

    test("invalid lang normalizes to 'auto'", async () => {
      installFakeFetch();
      const I18nUtils = loadI18n();

      const result = await I18nUtils.setLanguage("klingon");
      expect(result).toBe("auto");
      expect(chrome.storage.local.remove).toHaveBeenCalled();
    });
  });

  describe("storage.onChanged mirror", () => {
    test("change to userLanguage is mirrored to localStorage", () => {
      const listener = getLoadedStorageChangeListener();
      listener({ userLanguage: { newValue: "ja" } }, "local");

      expect(localStorage.getItem("userLanguage")).toBe("ja");
    });

    test("removal/auto clears localStorage preference + cache", () => {
      seedJaPreferenceAndCache();

      const listener = getLoadedStorageChangeListener({ body: JA_MESSAGES });
      listener({ userLanguage: { newValue: undefined } }, "local");

      expect(localStorage.getItem("userLanguage")).toBeNull();
      expect(localStorage.getItem("userLanguageMessages")).toBeNull();
    });

    test("changes in the 'sync' area are ignored", () => {
      const listener = getLoadedStorageChangeListener();
      listener({ userLanguage: { newValue: "ja" } }, "sync");

      expect(localStorage.getItem("userLanguage")).toBeNull();
    });
  });

  describe("reloadOverride", () => {
    test("hot-swaps from auto → ja without re-loading the module", () => {
      installFakeFetch({ body: JA_MESSAGES });
      const I18nUtils = loadI18n();
      expect(I18nUtils.getCurrentLanguage()).toBe("auto");

      // Simulate setLanguage having written localStorage (we bypass the
      // setLanguage fetch by writing directly + seeding a versioned cache).
      seedJaPreferenceAndCache();

      const result = I18nUtils.reloadOverride();
      expect(result).toBe("ja");
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
      expect(chrome.i18n.getMessage("searchInputPlaceholder")).toBe("Google マップを検索");
    });

    test("hot-swaps back from ja → auto", () => {
      const I18nUtils = loadI18nWithJaCache();
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");

      localStorage.removeItem("userLanguage");
      I18nUtils.reloadOverride();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expectBrowserFallbackMessage();
    });
  });

  describe("substitutions", () => {
    test("$1 / $2 placeholders are interpolated from array substitutions", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({
        body: { greet: { message: "こんにちは $1 さん、$2 へようこそ" } },
      });
      loadI18n();
      await flushPromises();

      expect(chrome.i18n.getMessage("greet", ["太郎", "東京"])).toBe(
        "こんにちは 太郎 さん、東京 へようこそ"
      );
    });

    test("single string substitution is supported", async () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeFetch({ body: { greet: { message: "Hi $1" } } });
      loadI18n();
      await flushPromises();

      expect(chrome.i18n.getMessage("greet", "太郎")).toBe("Hi 太郎");
    });
  });
});
