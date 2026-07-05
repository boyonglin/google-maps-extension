/**
 * Tests for Package/dist/utils/i18n.js
 *
 * The module is an IIFE with side effects at load time:
 *   1. captures chrome.i18n.getMessage as `originalGetMessage`
 *   2. wraps chrome.i18n.getMessage
 *   3. reads localStorage userLanguage and applies the override (sync XHR)
 *   4. registers a chrome.storage.onChanged listener
 *   5. publishes window.I18nUtils
 *
 * Each test re-loads the module via jest.isolateModules() so the IIFE re-runs
 * against fresh state.
 */

const path = require("path");

const I18N_PATH = path.resolve(__dirname, "../Package/dist/utils/i18n.js");

const JA_MESSAGES = {
  searchInputPlaceholder: { message: "Google マップを検索" },
  videoLabel: { message: "動画要約" },
};
const EN_MESSAGES = {
  searchInputPlaceholder: { message: "Search Google Maps" },
};
const FALLBACK_MESSAGE_KEY = "searchInputPlaceholder";

/** Install a fake XMLHttpRequest that returns the queued response. */
function installFakeXhr({ status = 200, body = JA_MESSAGES, throwOnSend = false } = {}) {
  class FakeXhr {
    constructor() {
      this.status = 0;
      this.responseText = "";
    }
    open(_method, url) {
      this._url = url;
    }
    send() {
      if (throwOnSend) throw new Error("network");
      this.status = status;
      this.responseText = JSON.stringify(body);
      FakeXhr.lastUrl = this._url;
      FakeXhr.callCount += 1;
    }
  }
  FakeXhr.lastUrl = null;
  FakeXhr.callCount = 0;
  global.XMLHttpRequest = FakeXhr;
  return FakeXhr;
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
    JSON.stringify({ lang: "ja", messages: JA_MESSAGES })
  );
}

function loadI18nWithJaCache() {
  seedJaPreferenceAndCache();
  installFakeXhr({ body: JA_MESSAGES });
  return loadI18n();
}

function getLoadedStorageChangeListener(xhrOptions) {
  installFakeXhr(xhrOptions);
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
      installFakeXhr();
      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expectBrowserFallbackMessage();
      // No XHR should have been issued.
      expect(global.XMLHttpRequest.callCount).toBe(0);
    });
  });

  describe("boot — override", () => {
    test("stored 'ja' loads bundle via XHR and overrides getMessage", () => {
      localStorage.setItem("userLanguage", "ja");
      const Xhr = installFakeXhr({ body: JA_MESSAGES });

      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
      expect(Xhr.callCount).toBe(1);
      expect(Xhr.lastUrl).toMatch(/_locales\/ja\/messages\.json$/);
      expect(chrome.i18n.getMessage("searchInputPlaceholder")).toBe("Google マップを検索");
    });

    test("unknown key in override bundle falls through to original", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ body: JA_MESSAGES });

      loadI18n();

      expect(chrome.i18n.getMessage("notInBundle")).toBe("BROWSER:notInBundle");
    });

    test("XHR failure (non-200) degrades silently to auto", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ status: 404 });

      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expectBrowserFallbackMessage();
    });

    test("XHR throw degrades silently to auto", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ throwOnSend: true });

      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
    });

    test("invalid stored language is treated as auto", () => {
      localStorage.setItem("userLanguage", "klingon");
      installFakeXhr();

      const I18nUtils = loadI18n();

      expect(I18nUtils.getCurrentLanguage()).toBe("auto");
      expect(global.XMLHttpRequest.callCount).toBe(0);
    });
  });

  describe("messages cache", () => {
    test("cache is preferred over XHR on next boot", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ body: JA_MESSAGES });
      loadI18n();
      expect(global.XMLHttpRequest.callCount).toBe(1);

      installFakeXhr({ body: { searchInputPlaceholder: { message: "FROM_XHR" } } });
      const I18nUtils = loadI18n();

      expect(global.XMLHttpRequest.callCount).toBe(0);
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
      // Message comes from the cache, not the new XHR body.
      expect(chrome.i18n.getMessage("searchInputPlaceholder")).toBe("Google マップを検索");
    });

    test("cache for a different language is ignored (XHR fires for the new lang)", () => {
      localStorage.setItem(
        "userLanguageMessages",
        JSON.stringify({ lang: "en", messages: EN_MESSAGES })
      );
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ body: JA_MESSAGES });

      const I18nUtils = loadI18n();

      expect(global.XMLHttpRequest.callCount).toBe(1);
      expect(I18nUtils.getCurrentLanguage()).toBe("ja");
    });
  });

  describe("setLanguage", () => {
    test("writes both localStorage and chrome.storage.local, pre-caches messages", async () => {
      installFakeXhr({ body: JA_MESSAGES });
      const I18nUtils = loadI18n();

      // setLanguage triggers another sync XHR to pre-cache.
      installFakeXhr({ body: JA_MESSAGES });
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
      installFakeXhr();
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
      installFakeXhr({ body: JA_MESSAGES });
      const I18nUtils = loadI18n();
      expect(I18nUtils.getCurrentLanguage()).toBe("auto");

      // Simulate setLanguage having written localStorage (we bypass the
      // setLanguage XHR by writing directly + seeding cache).
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
    test("$1 / $2 placeholders are interpolated from array substitutions", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({
        body: { greet: { message: "こんにちは $1 さん、$2 へようこそ" } },
      });
      loadI18n();

      expect(chrome.i18n.getMessage("greet", ["太郎", "東京"])).toBe(
        "こんにちは 太郎 さん、東京 へようこそ"
      );
    });

    test("single string substitution is supported", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({ body: { greet: { message: "Hi $1" } } });
      loadI18n();

      expect(chrome.i18n.getMessage("greet", "太郎")).toBe("Hi 太郎");
    });

    test("named placeholders (e.g. $checkedCount$) resolve via the placeholders map", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({
        body: {
          deleteBtnText: {
            message: "$checkedCount$ 件の場所を削除",
            placeholders: { checkedCount: { content: "$1" } },
          },
        },
      });
      loadI18n();

      expect(chrome.i18n.getMessage("deleteBtnText", "3")).toBe("3 件の場所を削除");
    });

    test("named placeholder lookup is case-insensitive", () => {
      localStorage.setItem("userLanguage", "ja");
      installFakeXhr({
        body: {
          deleteBtnText: {
            message: "$CheckedCount$ 件の場所を削除",
            placeholders: { checkedcount: { content: "$1" } },
          },
        },
      });
      loadI18n();

      expect(chrome.i18n.getMessage("deleteBtnText", "3")).toBe("3 件の場所を削除");
    });
  });
});
