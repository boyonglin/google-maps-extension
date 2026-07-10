// Theme Utilities

const ThemeUtils = {
  STORAGE_KEY: "isDarkMode",
  THEME_ATTRIBUTE: "data-theme",
  BS_THEME_ATTRIBUTE: "data-bs-theme",
  DARK: "dark",
  LIGHT: "light",

  getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  },

  getStoredPreference() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        resolve(result[this.STORAGE_KEY]);
      });
    });
  },

  savePreference(isDarkMode) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: isDarkMode }, resolve);
    });
  },

  applyToElement(element, isDarkMode, includeBootstrap = false) {
    if (!element) return;

    const theme = isDarkMode ? this.DARK : this.LIGHT;
    element.setAttribute(this.THEME_ATTRIBUTE, theme);

    if (includeBootstrap) {
      element.setAttribute(this.BS_THEME_ATTRIBUTE, theme);
    }
  },

  async initialize(element, includeBootstrap = false, callback = null) {
    let isDarkMode = await this.getStoredPreference();

    if (isDarkMode === undefined) {
      isDarkMode = this.getSystemPreference();
      await this.savePreference(isDarkMode);
    }

    this.applyToElement(element, isDarkMode, includeBootstrap);

    if (callback) {
      callback(isDarkMode);
    }

    return isDarkMode;
  },

  async toggle(element, includeBootstrap = false, callback = null) {
    const currentValue = (await this.getStoredPreference()) || false;
    const newValue = !currentValue;

    await this.savePreference(newValue);
    this.applyToElement(element, newValue, includeBootstrap);

    if (callback) {
      callback(newValue);
    }

    return newValue;
  },

  notifyContentScript(isDarkMode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "updateTheme",
            isDarkMode: isDarkMode,
          })
          .catch(() => {});
      }
    });
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeUtils;
}
