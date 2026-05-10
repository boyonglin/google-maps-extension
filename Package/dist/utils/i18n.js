/**
 * I18n Utilities Module
 * Allows the user to override the browser's default UI language for the
 * extension popup. The selected language is mirrored to localStorage so it
 * can be read synchronously before the rest of the popup initializes.
 *
 * Strategy:
 *  - Default ("auto") behavior: leave chrome.i18n.getMessage untouched, so the
 *    browser's UI language is used (current behavior).
 *  - Custom language: synchronously load the corresponding _locales/<lang>/
 *    messages.json bundled with the extension and patch chrome.i18n.getMessage
 *    so all existing call sites transparently return the chosen language.
 */
(function () {
  const STORAGE_KEY = "userLanguage";
  const SUPPORTED_LANGUAGES = ["auto", "en", "ja", "zh_TW"];

  function readSyncPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function loadMessagesSync(lang) {
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false); // sync XHR is acceptable for a tiny packaged file
      xhr.send();
      if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) {
      // fall through – will use browser default
    }
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

  const stored = readSyncPreference();
  const isOverride = stored && stored !== "auto" && SUPPORTED_LANGUAGES.includes(stored);
  let activeLanguage = isOverride ? stored : "auto";

  if (isOverride) {
    const messages = loadMessagesSync(stored);
    if (messages) {
      const original = chrome.i18n.getMessage.bind(chrome.i18n);
      chrome.i18n.getMessage = function (key, substitutions) {
        const entry = messages[key];
        if (entry && entry.message != null) {
          return applySubstitutions(entry.message, substitutions);
        }
        return original(key, substitutions);
      };
    } else {
      activeLanguage = "auto";
    }
  }

  const I18nUtils = {
    STORAGE_KEY,
    SUPPORTED_LANGUAGES,

    getCurrentLanguage() {
      return activeLanguage;
    },

    // Persist the user's language choice. Mirrors to both chrome.storage.local
    // (for cross-context sync) and localStorage (for synchronous startup read).
    setLanguage(lang) {
      const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : "auto";
      try {
        if (normalized === "auto") {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, normalized);
        }
      } catch (e) {
        /* ignore quota / disabled storage */
      }
      return new Promise((resolve) => {
        if (normalized === "auto") {
          chrome.storage.local.remove(STORAGE_KEY, () => resolve(normalized));
        } else {
          chrome.storage.local.set({ [STORAGE_KEY]: normalized }, () => resolve(normalized));
        }
      });
    },
  };

  if (typeof window !== "undefined") {
    window.I18nUtils = I18nUtils;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = I18nUtils;
  }
})();
