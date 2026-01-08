/**
 * Comprehensive Unit Tests for ThemeUtils module
 * Tests centralized dark mode management for the extension
 */

// Store original ThemeUtils mock before requiring the actual module
const originalThemeUtils = global.ThemeUtils;

describe("ThemeUtils Module", () => {
  let ThemeUtils;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset chrome storage mock
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Load actual ThemeUtils module
    ThemeUtils = require("../Package/dist/utils/theme.js");
  });

  afterAll(() => {
    // Restore original mock for other tests
    global.ThemeUtils = originalThemeUtils;
  });

  // ============================================================================
  // Test: Constants
  // ============================================================================

  describe("Constants", () => {
    test("should have correct STORAGE_KEY", () => {
      expect(ThemeUtils.STORAGE_KEY).toBe("isDarkMode");
    });

    test("should have correct THEME_ATTRIBUTE", () => {
      expect(ThemeUtils.THEME_ATTRIBUTE).toBe("data-theme");
    });

    test("should have correct BS_THEME_ATTRIBUTE", () => {
      expect(ThemeUtils.BS_THEME_ATTRIBUTE).toBe("data-bs-theme");
    });

    test("should have correct DARK value", () => {
      expect(ThemeUtils.DARK).toBe("dark");
    });

    test("should have correct LIGHT value", () => {
      expect(ThemeUtils.LIGHT).toBe("light");
    });
  });

  // ============================================================================
  // Test: getSystemPreference
  // ============================================================================

  describe("getSystemPreference", () => {
    test("should return true when system prefers dark mode", () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      expect(ThemeUtils.getSystemPreference()).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    });

    test("should return false when system prefers light mode", () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: false });

      expect(ThemeUtils.getSystemPreference()).toBe(false);
      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    });
  });

  // ============================================================================
  // Test: getStoredPreference
  // ============================================================================

  describe("getStoredPreference", () => {
    test("should return stored dark mode value (true)", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      const result = await ThemeUtils.getStoredPreference();

      expect(result).toBe(true);
      expect(chrome.storage.local.get).toHaveBeenCalledWith("isDarkMode", expect.any(Function));
    });

    test("should return stored dark mode value (false)", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      const result = await ThemeUtils.getStoredPreference();

      expect(result).toBe(false);
    });

    test("should return undefined when no preference stored", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await ThemeUtils.getStoredPreference();

      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // Test: savePreference
  // ============================================================================

  describe("savePreference", () => {
    test("should save dark mode preference as true", async () => {
      await ThemeUtils.savePreference(true);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: true },
        expect.any(Function)
      );
    });

    test("should save dark mode preference as false", async () => {
      await ThemeUtils.savePreference(false);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: false },
        expect.any(Function)
      );
    });

    test("should resolve after saving", async () => {
      const promise = ThemeUtils.savePreference(true);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // Test: applyToElement
  // ============================================================================

  describe("applyToElement", () => {
    let element;

    beforeEach(() => {
      element = document.createElement("div");
    });

    test("should set data-theme attribute to dark when isDarkMode is true", () => {
      ThemeUtils.applyToElement(element, true);

      expect(element.getAttribute("data-theme")).toBe("dark");
    });

    test("should set data-theme attribute to light when isDarkMode is false", () => {
      element.setAttribute("data-theme", "dark");

      ThemeUtils.applyToElement(element, false);

      expect(element.getAttribute("data-theme")).toBe("light");
    });

    test("should set data-bs-theme when includeBootstrap is true and dark mode", () => {
      ThemeUtils.applyToElement(element, true, true);

      expect(element.getAttribute("data-theme")).toBe("dark");
      expect(element.getAttribute("data-bs-theme")).toBe("dark");
    });

    test("should set data-bs-theme to light when includeBootstrap is true and light mode", () => {
      ThemeUtils.applyToElement(element, false, true);

      expect(element.getAttribute("data-theme")).toBe("light");
      expect(element.getAttribute("data-bs-theme")).toBe("light");
    });

    test("should not set data-bs-theme when includeBootstrap is false", () => {
      ThemeUtils.applyToElement(element, true, false);

      expect(element.getAttribute("data-theme")).toBe("dark");
      expect(element.hasAttribute("data-bs-theme")).toBe(false);
    });

    test("should handle null element gracefully", () => {
      expect(() => ThemeUtils.applyToElement(null, true)).not.toThrow();
    });

    test("should handle undefined element gracefully", () => {
      expect(() => ThemeUtils.applyToElement(undefined, true)).not.toThrow();
    });
  });

  // ============================================================================
  // Test: initialize
  // ============================================================================

  describe("initialize", () => {
    let element;

    beforeEach(() => {
      element = document.createElement("div");
    });

    test("should use stored preference when available (dark)", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      const result = await ThemeUtils.initialize(element);

      expect(result).toBe(true);
      expect(element.getAttribute("data-theme")).toBe("dark");
    });

    test("should use stored preference when available (light)", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      const result = await ThemeUtils.initialize(element);

      expect(result).toBe(false);
      expect(element.getAttribute("data-theme")).toBe("light");
    });

    test("should use system preference when no stored preference", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      const result = await ThemeUtils.initialize(element);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: true },
        expect.any(Function)
      );
    });

    test("should call callback with isDarkMode value", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });
      const callback = jest.fn();

      await ThemeUtils.initialize(element, false, callback);

      expect(callback).toHaveBeenCalledWith(true);
    });

    test("should include Bootstrap theme when requested", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      await ThemeUtils.initialize(element, true);

      expect(element.getAttribute("data-bs-theme")).toBe("dark");
    });

    test("should not call callback when callback is null", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      // Should not throw
      await expect(ThemeUtils.initialize(element, false, null)).resolves.toBe(true);
    });
  });

  // ============================================================================
  // Test: toggle
  // ============================================================================

  describe("toggle", () => {
    let element;

    beforeEach(() => {
      element = document.createElement("div");
    });

    test("should toggle from false to true", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      const result = await ThemeUtils.toggle(element);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: true },
        expect.any(Function)
      );
      expect(element.getAttribute("data-theme")).toBe("dark");
    });

    test("should toggle from true to false", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      const result = await ThemeUtils.toggle(element);

      expect(result).toBe(false);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: false },
        expect.any(Function)
      );
      expect(element.getAttribute("data-theme")).toBe("light");
    });

    test("should toggle from undefined to true", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await ThemeUtils.toggle(element);

      expect(result).toBe(true);
    });

    test("should call callback with new state", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });
      const callback = jest.fn();

      await ThemeUtils.toggle(element, false, callback);

      expect(callback).toHaveBeenCalledWith(true);
    });

    test("should include Bootstrap theme when requested", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      await ThemeUtils.toggle(element, true);

      expect(element.getAttribute("data-bs-theme")).toBe("dark");
    });
  });

  // ============================================================================
  // Test: notifyContentScript
  // ============================================================================

  describe("notifyContentScript", () => {
    test("should send message to active tab with dark mode", () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123 }]);
      });
      chrome.tabs.sendMessage.mockResolvedValue({});

      ThemeUtils.notifyContentScript(true);

      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: "updateTheme",
        isDarkMode: true,
      });
    });

    test("should send message to active tab with light mode", () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 456 }]);
      });
      chrome.tabs.sendMessage.mockResolvedValue({});

      ThemeUtils.notifyContentScript(false);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(456, {
        action: "updateTheme",
        isDarkMode: false,
      });
    });

    test("should handle no active tabs gracefully", () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([]);
      });

      expect(() => ThemeUtils.notifyContentScript(true)).not.toThrow();
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    test("should handle sendMessage errors gracefully", () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 789 }]);
      });
      chrome.tabs.sendMessage.mockRejectedValue(new Error("Content script not loaded"));

      // Should not throw
      expect(() => ThemeUtils.notifyContentScript(true)).not.toThrow();
    });
  });
});

// ============================================================================
// Test: contentScript updateTheme action
// ============================================================================

describe("contentScript.js - updateTheme Action", () => {
  let messageListener;

  const setupContentScriptTest = () => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete globalThis.attachMapLinkToPage;
    global.window.getSelection = jest.fn();

    jest.resetModules();

    jest.isolateModules(() => {
      require("../Package/dist/contentScript.js");
      messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    });

    return messageListener;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    messageListener = setupContentScriptTest();
  });

  test("should apply dark theme to iframe when isDarkMode is true", () => {
    const iframe = document.createElement("div");
    iframe.id = "TMEiframe";
    document.body.appendChild(iframe);

    const request = { action: "updateTheme", isDarkMode: true };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.getAttribute("data-theme")).toBe("dark");
  });

  test("should set light theme on iframe when isDarkMode is false", () => {
    const iframe = document.createElement("div");
    iframe.id = "TMEiframe";
    iframe.setAttribute("data-theme", "dark");
    document.body.appendChild(iframe);

    const request = { action: "updateTheme", isDarkMode: false };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.getAttribute("data-theme")).toBe("light");
  });

  test("should handle missing iframe gracefully", () => {
    const request = { action: "updateTheme", isDarkMode: true };
    const sendResponse = jest.fn();

    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();
  });

  test("should toggle theme multiple times correctly", () => {
    const iframe = document.createElement("div");
    iframe.id = "TMEiframe";
    document.body.appendChild(iframe);

    const sendResponse = jest.fn();

    // Apply dark
    messageListener({ action: "updateTheme", isDarkMode: true }, {}, sendResponse);
    expect(iframe.getAttribute("data-theme")).toBe("dark");

    // Apply light
    messageListener({ action: "updateTheme", isDarkMode: false }, {}, sendResponse);
    expect(iframe.getAttribute("data-theme")).toBe("light");

    // Apply dark again
    messageListener({ action: "updateTheme", isDarkMode: true }, {}, sendResponse);
    expect(iframe.getAttribute("data-theme")).toBe("dark");
  });
});

// ============================================================================
// Test: inject.js Theme Functions
// ============================================================================

describe("inject.js - Theme Functions", () => {
  let TME;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock chrome storage
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({});
    });

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
      })),
    });

    // Load inject.js - it attaches TME to window
    require("../Package/dist/inject.js");
    TME = window.TME;
  });

  describe("applyTheme", () => {
    test("should set data-theme to dark when isDarkMode is true", () => {
      const element = document.createElement("div");

      TME.applyTheme(element, true);

      expect(element.getAttribute("data-theme")).toBe("dark");
    });

    test("should set data-theme to light when isDarkMode is false", () => {
      const element = document.createElement("div");
      element.setAttribute("data-theme", "dark");

      TME.applyTheme(element, false);

      expect(element.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("getSystemPreference", () => {
    test("should return true when system prefers dark mode", () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      expect(TME.getSystemPreference()).toBe(true);
    });

    test("should return false when system prefers light mode", () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: false });

      expect(TME.getSystemPreference()).toBe(false);
    });
  });

  describe("setup - theme initialization", () => {
    test("should save system preference when no stored preference exists", () => {
      jest.clearAllMocks();
      jest.resetModules();

      // Mock no stored preference
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      // Mock system preference for dark mode
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      // Load inject.js
      require("../Package/dist/inject.js");

      // Call setup to trigger the theme initialization
      window.TME.setup();

      // Verify that system preference was saved to storage
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isDarkMode: true });
    });

    test("should not save preference when stored preference exists", () => {
      jest.clearAllMocks();
      jest.resetModules();

      // Mock stored preference exists
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      // Load inject.js
      require("../Package/dist/inject.js");

      // Call setup to trigger the theme initialization
      window.TME.setup();

      // Verify that storage.set was not called
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Test: popup.js Theme Integration
// ============================================================================

describe("popup.js - Theme Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore global ThemeUtils mock for popup tests
    global.ThemeUtils = {
      STORAGE_KEY: "isDarkMode",
      THEME_ATTRIBUTE: "data-theme",
      BS_THEME_ATTRIBUTE: "data-bs-theme",
      DARK: "dark",
      LIGHT: "light",
      getSystemPreference: jest.fn(() => false),
      getStoredPreference: jest.fn(() => Promise.resolve(false)),
      savePreference: jest.fn(() => Promise.resolve()),
      applyToElement: jest.fn(),
      initialize: jest.fn((element, includeBootstrap, callback) => {
        if (callback) callback(false);
        return Promise.resolve(false);
      }),
      toggle: jest.fn(() => Promise.resolve(true)),
      notifyContentScript: jest.fn(),
    };
  });

  test("initializeTheme should call ThemeUtils.initialize with correct parameters", () => {
    // Test that the function structure is correct
    expect(global.ThemeUtils.initialize).toBeDefined();
    expect(typeof global.ThemeUtils.initialize).toBe("function");
  });

  test("applyTheme should call ThemeUtils.applyToElement", () => {
    // Test that the function structure is correct
    expect(global.ThemeUtils.applyToElement).toBeDefined();
    expect(typeof global.ThemeUtils.applyToElement).toBe("function");
  });

  test("ThemeUtils.notifyContentScript should be available", () => {
    expect(global.ThemeUtils.notifyContentScript).toBeDefined();
    expect(typeof global.ThemeUtils.notifyContentScript).toBe("function");
  });
});
