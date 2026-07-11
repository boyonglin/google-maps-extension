// Wraps chrome.i18n.getMessage to serve user-selected language from localStorage synchronously.
(function () {
  const STORAGE_KEY = "userLanguage";
  const MESSAGES_CACHE_KEY = "userLanguageMessages";
  const SUPPORTED_LANGUAGES = ["auto", "en", "ja", "zh_TW"];
  const EXT_VERSION = chrome.runtime.getManifest().version;

  // Capture original to avoid re-wrapping.
  const originalGetMessage = chrome.i18n.getMessage.bind(chrome.i18n);

  let activeLanguage = "auto";
  let overrideMessages = null;
  // Prevent async load clobbering.
  let applyToken = 0;

  function safeLocalGet(key, parse = false) {
    try {
      const raw = localStorage.getItem(key);
      return parse ? (raw ? JSON.parse(raw) : null) : raw;
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

  function readValidCache(lang) {
    const cache = safeLocalGet(MESSAGES_CACHE_KEY, true);
    return cache && cache.lang === lang && cache.version === EXT_VERSION ? cache.messages : null;
  }

  async function fetchMessages(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang) || lang === "auto") return null;
    try {
      const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function applyMessages(lang, messages) {
    if (messages) {
      activeLanguage = lang;
      overrideMessages = messages;
    } else {
      activeLanguage = "auto";
      overrideMessages = null;
    }
  }

  function notifyApplied(lang) {
    if (typeof window === "undefined") return;
    if (typeof window.applyI18n === "function") window.applyI18n();
    window.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
  }

  // Resolve named placeholders like chrome.i18n.getMessage does.
  function resolveNamedPlaceholders(message, placeholders) {
    if (!placeholders) return message;
    return message.replace(/\$(\w+)\$/g, (match, name) => {
      const placeholderKey = Object.keys(placeholders).find(
        (key) => key.toLowerCase() === name.toLowerCase()
      );
      const content = placeholderKey && placeholders[placeholderKey].content;
      return content != null ? content : match;
    });
  }

  // Protect literal "$$" (Chrome's escape for a literal "$") from the
  // placeholder/substitution regexes below, then restore it at the end.
  const DOLLAR_SENTINEL = "@@DOLLAR@@";

  function applySubstitutions(message, substitutions, placeholders) {
    let result = message.replace(/\$\$/g, DOLLAR_SENTINEL);
    result = resolveNamedPlaceholders(result, placeholders);
    if (substitutions != null) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((value, index) => {
        result = result.replace(new RegExp("\\$" + (index + 1), "g"), String(value));
      });
    }
    return result.split(DOLLAR_SENTINEL).join("$");
  }

  chrome.i18n.getMessage = function (key, substitutions) {
    if (overrideMessages) {
      const entry = overrideMessages[key];
      if (entry && entry.message != null) {
        return applySubstitutions(entry.message, substitutions, entry.placeholders);
      }
    }
    return originalGetMessage(key, substitutions);
  };

  function applyOverride(lang, { notifyOnAsync = false } = {}) {
    const token = ++applyToken;

    if (!lang || lang === "auto" || !SUPPORTED_LANGUAGES.includes(lang)) {
      applyMessages("auto", null);
      return Promise.resolve(activeLanguage);
    }

    const cached = readValidCache(lang);
    if (cached) {
      applyMessages(lang, cached);
      return Promise.resolve(activeLanguage);
    }

    return fetchMessages(lang).then((messages) => {
      if (token !== applyToken) return activeLanguage; // superseded
      if (messages) writeMessagesCache(lang, messages);
      applyMessages(lang, messages);
      if (messages && notifyOnAsync) notifyApplied(lang);
      return activeLanguage;
    });
  }

  applyOverride(safeLocalGet(STORAGE_KEY), { notifyOnAsync: true });

  // Mirror storage.local to localStorage.
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

    async setLanguage(lang) {
      const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : "auto";
      try {
        if (normalized === "auto") {
          localStorage.removeItem(STORAGE_KEY);
          writeMessagesCache(null);
        } else {
          localStorage.setItem(STORAGE_KEY, normalized);
        }
      } catch (e) {}
      // Wait for the bundle (also refreshes the cache) so callers can
      // re-render immediately after this resolves.
      await applyOverride(normalized);
      return new Promise((resolve) => {
        if (normalized === "auto") {
          chrome.storage.local.remove(STORAGE_KEY, () => resolve(normalized));
        } else {
          chrome.storage.local.set({ [STORAGE_KEY]: normalized }, () => resolve(normalized));
        }
      });
    },

    reloadOverride() {
      applyOverride(safeLocalGet(STORAGE_KEY), { notifyOnAsync: true });
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
