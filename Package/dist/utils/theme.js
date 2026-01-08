/**
 * Theme Utilities Module
 * Centralized dark mode management for the extension
 */

const ThemeUtils = {
  STORAGE_KEY: "isDarkMode",
  THEME_ATTRIBUTE: "data-theme",
  BS_THEME_ATTRIBUTE: "data-bs-theme",
  DARK: "dark",
  LIGHT: "light",

  // Check if system prefers dark mode
  getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  },

  // Get stored theme preference from Chrome storage
  getStoredPreference() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        resolve(result[this.STORAGE_KEY]);
      });
    });
  },

  // Save theme preference to Chrome storage
  savePreference(isDarkMode) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: isDarkMode }, resolve);
    });
  },

  // Apply theme to a DOM element
  applyToElement(element, isDarkMode, includeBootstrap = false) {
    if (!element) return;

    const theme = isDarkMode ? this.DARK : this.LIGHT;

    if (isDarkMode) {
      element.setAttribute(this.THEME_ATTRIBUTE, theme);
    } else {
      element.removeAttribute(this.THEME_ATTRIBUTE);
    }

    if (includeBootstrap) {
      element.setAttribute(this.BS_THEME_ATTRIBUTE, theme);
    }
  },

  // Initialize theme based on stored preference or system preference
  async initialize(element, includeBootstrap = false, callback = null) {
    let isDarkMode = await this.getStoredPreference();

    // If no stored preference, check system preference
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

  // Toggle theme and save preference
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

  // Send theme update message to content script
  notifyContentScript(isDarkMode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "updateTheme",
            isDarkMode: isDarkMode,
          })
          .catch(() => {
            // Ignore errors if content script isn't loaded
          });
      }
    });
  },
};

// Export for both module and script contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeUtils;
}
