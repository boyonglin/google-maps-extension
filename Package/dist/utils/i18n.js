// I18n override: wraps chrome.i18n.getMessage once at load to serve a
// user-selected language bundle from localStorage. chrome.storage.local is
// the source of truth; a storage.onChanged listener mirrors it back to
// localStorage so every popup boot can apply the override synchronously.
(function () {
  const STORAGE_KEY = "userLanguage";
  const MESSAGES_CACHE_KEY = "userLanguageMessages";
  const SUPPORTED_LANGUAGES = ["auto", "en", "ja", "zh_TW"];
  const EXT_VERSION = chrome.runtime.getManifest().version;

  // Captured before wrapping so re-wrapping on language change is never needed.
  const originalGetMessage = chrome.i18n.getMessage.bind(chrome.i18n);

  let activeLanguage = "auto";
  let overrideMessages = null;

  function readSyncPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function readMessagesCacheSync() {
    try {
      const raw = localStorage.getItem(MESSAGES_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeMessagesCache(lang, messages) {
    try {
      if (!lang || lang === "auto" || !messages) {
        localStorage.removeItem(MESSAGES_CACHE_KEY);
      } else {
        localStorage.setItem(
          MESSAGES_CACHE_KEY,
          JSON.stringify({ lang, version: EXT_VERSION, messages })
        );
      }
    } catch (e) {}
  }

  function loadMessagesSync(lang) {
    // Defense in depth: never let an unexpected lang reach runtime.getURL.
    if (!SUPPORTED_LANGUAGES.includes(lang) || lang === "auto") return null;
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false); // sync XHR is acceptable for a tiny packaged file
      xhr.send();
      if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) {}
    return null;
  }

  function applySubstitutions(message, substitutions) {
    if (substitutions == null) return message;
    const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
    let result = message;
    subs.forEach((value, index) => {
      result = result.replace(new RegExp("\\$" + (index + 1), "g"), String(value));
    });
    return result;
  }

  chrome.i18n.getMessage = function (key, substitutions) {
    if (overrideMessages) {
      const entry = overrideMessages[key];
      if (entry && entry.message != null) {
        return applySubstitutions(entry.message, substitutions);
      }
    }
    return originalGetMessage(key, substitutions);
  };

  // Cache-first, XHR-fallback. Degrades silently to "auto" on any failure.
  function applyOverride(lang) {
    if (!lang || lang === "auto" || !SUPPORTED_LANGUAGES.includes(lang)) {
      activeLanguage = "auto";
      overrideMessages = null;
      return;
    }
    const cache = readMessagesCacheSync();
    let messages =
      cache && cache.lang === lang && cache.version === EXT_VERSION ? cache.messages : null;
    if (!messages) {
      messages = loadMessagesSync(lang);
      if (messages) writeMessagesCache(lang, messages);
    }
    if (messages) {
      activeLanguage = lang;
      overrideMessages = messages;
    } else {
      activeLanguage = "auto";
      overrideMessages = null;
    }
  }

  applyOverride(readSyncPreference());

  // Mirror storage.local → localStorage so the next popup boot applies the
  // override synchronously (a language set elsewhere takes effect immediately).
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEY]) {
        const newVal = changes[STORAGE_KEY].newValue;
        try {
          if (newVal && newVal !== "auto") {
            localStorage.setItem(STORAGE_KEY, newVal);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            writeMessagesCache(null);
          }
        } catch (e) {}
      }
    });
  }

  const I18nUtils = {
    STORAGE_KEY,
    MESSAGES_CACHE_KEY,
    SUPPORTED_LANGUAGES,

    getCurrentLanguage() {
      return activeLanguage;
    },

    setLanguage(lang) {
      const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : "auto";
      try {
        if (normalized === "auto") {
          localStorage.removeItem(STORAGE_KEY);
          writeMessagesCache(null);
        } else {
          localStorage.setItem(STORAGE_KEY, normalized);
        }
      } catch (e) {}
      // Apply in-memory immediately (also refreshes cache via loadMessagesSync)
      // so callers don't need a separate reloadOverride() round-trip.
      applyOverride(normalized);
      return new Promise((resolve) => {
        if (normalized === "auto") {
          chrome.storage.local.remove(STORAGE_KEY, () => resolve(normalized));
        } else {
          chrome.storage.local.set({ [STORAGE_KEY]: normalized }, () => resolve(normalized));
        }
      });
    },

    // Re-applies the stored language in place. Call window.applyI18n() after
    // this to re-render already-painted data-locale* attributes.
    reloadOverride() {
      applyOverride(readSyncPreference());
      return activeLanguage;
    },
  };

  if (typeof window !== "undefined") {
    window.I18nUtils = I18nUtils;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = I18nUtils;
  }
})();
