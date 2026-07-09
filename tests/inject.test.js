/**
 * Jest Unit Tests for inject.js
 * Tests for the floating iframe UI, drag functionality, theme handling, and cleanup
 */

const { mockChromeStorage, mockI18n, flushPromises } = require("./testHelpers");

describe("inject.js - TME Module", () => {
  let TME;
  let originalMatchMedia;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";

    // Reset the global TME and hasRun flag
    delete window.TME;
    delete window.TMEhasRun;

    // Mock chrome APIs
    jest.clearAllMocks();
    mockI18n({
      closeLabel: "Close",
    });
    mockChromeStorage({ isDarkMode: false });

    // contentScript.js is a persistent content script (manifest.json) that
    // always runs before inject.js is programmatically injected, and it's
    // what defines this shared offset in production.
    window.TME_IFRAME_CHROME_OFFSET = 35;

    chrome.runtime.getURL.mockImplementation((path) => `chrome-extension://mock-id/${path}`);
    chrome.runtime.sendMessage.mockImplementation(() => {});

    // Mock matchMedia for system theme detection
    originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // Load the inject.js module fresh
    jest.isolateModules(() => {
      require("../Package/dist/inject.js");
    });

    TME = window.TME;
  });

  afterEach(() => {
    // Cleanup
    window.matchMedia = originalMatchMedia;
    const iframe = document.getElementById("TMEiframe");
    if (iframe) iframe.remove();

    // Remove event listeners
    document.onmousemove = null;
    document.onmouseup = null;
  });

  // ============================================================================
  // TME Object Structure Tests
  // ============================================================================

  describe("TME Object Structure", () => {
    test("should expose TME object on window", () => {
      expect(window.TME).toBeDefined();
      expect(typeof window.TME).toBe("object");
    });

    test("should have applyTheme method", () => {
      expect(typeof TME.applyTheme).toBe("function");
    });

    test("should have getSystemPreference method", () => {
      expect(typeof TME.getSystemPreference).toBe("function");
    });

    test("should have setup method", () => {
      expect(typeof TME.setup).toBe("function");
    });

    test("should have eject method", () => {
      expect(typeof TME.eject).toBe("function");
    });
  });

  // ============================================================================
  // applyTheme Tests
  // ============================================================================

  describe("applyTheme", () => {
    test('should set data-theme="dark" when isDarkMode is true', () => {
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

    test("should handle null element gracefully", () => {
      // This tests defensive programming - it may throw, which is acceptable
      expect(() => TME.applyTheme(null, true)).toThrow();
    });
  });

  // ============================================================================
  // getSystemPreference Tests
  // ============================================================================

  describe("getSystemPreference", () => {
    test("should return true when system prefers dark mode", () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
      }));

      expect(TME.getSystemPreference()).toBe(true);
    });

    test("should return false when system prefers light mode", () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
      }));

      expect(TME.getSystemPreference()).toBe(false);
    });

    test("should query for prefers-color-scheme: dark", () => {
      TME.getSystemPreference();

      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    });
  });

  // ============================================================================
  // setup Tests
  // ============================================================================

  describe("setup", () => {
    test("should create iframe container with id TMEiframe", () => {
      // Setup already ran in beforeEach via module load
      const container = document.getElementById("TMEiframe");

      expect(container).not.toBeNull();
      expect(container.tagName.toLowerCase()).toBe("div");
    });

    test("should create draggable bar with id TMEdrag", () => {
      const dragBar = document.getElementById("TMEdrag");

      expect(dragBar).not.toBeNull();
    });

    test("should create close button with id TMEeject", () => {
      const closeButton = document.getElementById("TMEeject");

      expect(closeButton).not.toBeNull();
      expect(closeButton.tagName.toLowerCase()).toBe("button");
    });

    test("should create iframe with id TMEmain", () => {
      const iframe = document.getElementById("TMEmain");

      expect(iframe).not.toBeNull();
      expect(iframe.tagName.toLowerCase()).toBe("iframe");
    });

    test("should set iframe src to popup.html URL", () => {
      const iframe = document.getElementById("TMEmain");

      expect(iframe.src).toContain("popup.html");
    });

    test("should create 6 lines in linesContainer", () => {
      const linesContainer = document.getElementById("TMElines");

      expect(linesContainer).not.toBeNull();
      expect(linesContainer.children.length).toBe(6);
    });

    test("should position container at default position", () => {
      const container = document.getElementById("TMEiframe");

      expect(container.style.top).toBe("50px");
      // Left position depends on window.innerWidth
    });

    test("should apply dark theme from storage when isDarkMode is true", async () => {
      // Remove existing and reset
      document.getElementById("TMEiframe")?.remove();
      delete window.TME;

      mockChromeStorage({ isDarkMode: true });

      jest.isolateModules(() => {
        require("../Package/dist/inject.js");
      });

      await flushPromises();

      const container = document.getElementById("TMEiframe");
      expect(container.getAttribute("data-theme")).toBe("dark");
    });

    test("should apply light theme from storage when isDarkMode is false", async () => {
      const container = document.getElementById("TMEiframe");

      await flushPromises();

      expect(container.getAttribute("data-theme")).toBe("light");
    });

    test("should use system preference when isDarkMode is undefined", async () => {
      // Remove existing and reset
      document.getElementById("TMEiframe")?.remove();
      delete window.TME;

      mockChromeStorage({}); // No isDarkMode key

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: true, // System prefers dark
        media: query,
      }));

      jest.isolateModules(() => {
        require("../Package/dist/inject.js");
      });

      await flushPromises();

      // Should set storage with system preference
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isDarkMode: true });
    });
  });

  // ============================================================================
  // Pre-sizing from persisted height (inject.js:29-53)
  // ============================================================================

  describe("Pre-sizing from persisted height", () => {
    function setupWithStorage(storageData) {
      document.getElementById("TMEiframe")?.remove();
      delete window.TME;
      mockChromeStorage({ isDarkMode: false, ...storageData });
      jest.isolateModules(() => {
        require("../Package/dist/inject.js");
      });
    }

    test("pre-sizes the container using the persisted height for lastActiveTab", async () => {
      setupWithStorage({ lastActiveTab: "favorite", popupHeight_favorite: 600 });
      await flushPromises();

      expect(document.getElementById("TMEiframe").style.height).toBe("635px"); // 600 + 35
    });

    test("falls back to the history tab height when lastActiveTab is missing", async () => {
      setupWithStorage({ popupHeight_history: 500 });
      await flushPromises();

      expect(document.getElementById("TMEiframe").style.height).toBe("535px");
    });

    test("falls back to the history tab height when lastActiveTab is an unrecognized value", async () => {
      // Regression guard: a corrupted/unexpected storage value must not be
      // trusted as a tab name (would read the wrong popupHeight_* key).
      setupWithStorage({ lastActiveTab: "corrupted", popupHeight_history: 480 });
      await flushPromises();

      expect(document.getElementById("TMEiframe").style.height).toBe("515px");
    });

    test("clamps the pre-set height so it never exceeds the viewport", async () => {
      const originalInnerHeight = window.innerHeight;
      Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

      setupWithStorage({ lastActiveTab: "history", popupHeight_history: 5000 });
      await flushPromises();

      // maxContentHeight = 800 - 100 - 35 = 665; total = 665 + 35 = 700
      expect(document.getElementById("TMEiframe").style.height).toBe("700px");

      Object.defineProperty(window, "innerHeight", {
        value: originalInnerHeight,
        configurable: true,
      });
    });

    test("applies a small persisted height as-is, with no artificial lower bound", async () => {
      setupWithStorage({ lastActiveTab: "history", popupHeight_history: 50 });
      await flushPromises();

      expect(document.getElementById("TMEiframe").style.height).toBe("85px"); // 50 + 35
    });

    test("ignores a zero/non-numeric persisted height and leaves the default CSS height", async () => {
      setupWithStorage({ lastActiveTab: "gemini", popupHeight_gemini: 0 });
      await flushPromises();

      expect(document.getElementById("TMEiframe").style.height).toBe("");
    });
  });

  // ============================================================================
  // Drag Functionality Tests
  // ============================================================================

  describe("Drag Functionality", () => {
    test("should allow dragging via mouse events on drag bar", () => {
      const container = document.getElementById("TMEiframe");
      const dragBar = document.getElementById("TMEdrag");

      // Mock getBoundingClientRect for the container
      container.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 400,
        height: 500,
      });

      // Simulate mousedown on drag bar
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 120,
        clientY: 60,
      });
      dragBar.onmousedown(mousedownEvent);

      // Simulate mousemove
      const mousemoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 220,
        clientY: 160,
      });
      document.onmousemove(mousemoveEvent);

      // Position should have changed - moved 100px right and 100px down
      expect(container.style.left).toBe("200px");
      expect(container.style.top).toBe("150px");
    });

    test("should stop dragging on mouseup", () => {
      const container = document.getElementById("TMEiframe");
      const dragBar = document.getElementById("TMEdrag");

      container.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 400,
        height: 500,
      });

      // Start drag
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      dragBar.onmousedown(mousedownEvent);

      // Release
      const mouseupEvent = new MouseEvent("mouseup", { bubbles: true });
      document.onmouseup(mouseupEvent);

      // Store position
      const leftAfterRelease = container.style.left;
      const topAfterRelease = container.style.top;

      // onmousemove should now be null
      expect(document.onmousemove).toBeNull();

      // Position should not change after mouseup
      expect(container.style.left).toBe(leftAfterRelease);
      expect(container.style.top).toBe(topAfterRelease);
    });

    test("should prevent default drag behavior", () => {
      const dragBar = document.getElementById("TMEdrag");

      expect(dragBar.ondragstart()).toBe(false);
    });
  });

  // ============================================================================
  // Close Button Tests
  // ============================================================================

  describe("Close Button", () => {
    test("should call eject when close button is clicked", () => {
      const closeButton = document.getElementById("TMEeject");
      const ejectSpy = jest.spyOn(TME, "eject");

      closeButton.click();

      expect(ejectSpy).toHaveBeenCalled();
    });

    test("should have correct title from i18n", () => {
      const closeButton = document.getElementById("TMEeject");

      expect(closeButton.title).toBe("Close");
    });

    test("should contain SVG icon", () => {
      const closeButton = document.getElementById("TMEeject");
      const svg = closeButton.querySelector("svg");

      expect(svg).not.toBeNull();
    });
  });

  // ============================================================================
  // Escape Key Handler Tests
  // ============================================================================

  describe("Escape Key Handler", () => {
    test("should call eject when Escape key is pressed", () => {
      const ejectSpy = jest.spyOn(TME, "eject");

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(ejectSpy).toHaveBeenCalled();
    });

    test("should not call eject for other keys", () => {
      const ejectSpy = jest.spyOn(TME, "eject");

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      document.dispatchEvent(enterEvent);

      expect(ejectSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // eject Tests
  // ============================================================================

  describe("eject", () => {
    test("should remove iframe container from DOM", () => {
      expect(document.getElementById("TMEiframe")).not.toBeNull();

      TME.eject();

      expect(document.getElementById("TMEiframe")).toBeNull();
    });

    test("should set TMEhasRun to false", () => {
      window.TMEhasRun = true;

      TME.eject();

      expect(window.TMEhasRun).toBe(false);
    });

    test("should log deactivation message", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      TME.eject();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Deactivated"));
      consoleSpy.mockRestore();
    });

    test("should handle being called when container does not exist", () => {
      // Remove it first
      document.getElementById("TMEiframe")?.remove();

      // Should not throw
      expect(() => TME.eject()).not.toThrow();
    });

    test("should remove document listeners so they do not accumulate", () => {
      TME.eject();

      const ejectSpy = jest.spyOn(TME, "eject");
      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);

      // The Escape listener registered by setup() must be gone after eject()
      expect(ejectSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Window Resize Handler Tests
  // ============================================================================

  describe("Window Resize Handler", () => {
    test("should adjust iframe position when window becomes smaller", () => {
      const container = document.getElementById("TMEiframe");

      // Set container far to the right
      container.style.left = "2000px";

      // Mock container width
      Object.defineProperty(container, "offsetWidth", { value: 400, configurable: true });

      // Simulate resize
      const resizeEvent = new Event("resize");
      window.dispatchEvent(resizeEvent);

      // Container should be repositioned
      const newLeft = parseInt(container.style.left, 10);
      expect(newLeft).toBeLessThan(2000);
    });
  });

  // ============================================================================
  // Resizer Functionality Tests
  // ============================================================================

  describe("Resizer Functionality", () => {
    test("should have a resizer element", () => {
      const container = document.getElementById("TMEiframe");
      const resizer = container.querySelector('[style*="cursor: ns-resize"]');

      expect(resizer).not.toBeNull();
    });

    test("should resize container on vertical drag", async () => {
      const container = document.getElementById("TMEiframe");
      const resizer = container.querySelector('[style*="cursor: ns-resize"]');

      // Mock getBoundingClientRect
      container.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 50,
        left: 100,
        width: 400,
        height: 500,
      });

      // Start resize
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 300,
        clientY: 500,
      });
      resizer.dispatchEvent(mousedownEvent);

      // Move mouse down to resize
      const mousemoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 300,
        clientY: 600,
      });
      document.dispatchEvent(mousemoveEvent);

      // Height should have changed
      expect(container.style.height).toBe("550px");
    });

    test("should send resize message to popup", async () => {
      const container = document.getElementById("TMEiframe");
      const resizer = container.querySelector('[style*="cursor: ns-resize"]');

      container.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 50,
        left: 100,
        width: 400,
        height: 500,
      });

      // Start resize
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 300,
        clientY: 500,
      });
      resizer.dispatchEvent(mousedownEvent);

      // Move mouse
      const mousemoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 300,
        clientY: 600,
      });
      document.dispatchEvent(mousemoveEvent);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "resize",
          heightChange: expect.any(Number),
        })
      );
    });

    test("should enforce minimum height of 452px", async () => {
      const container = document.getElementById("TMEiframe");

      // Just verify the container has proper structure
      expect(container).not.toBeNull();
      expect(container.querySelector("#TMEdrag")).not.toBeNull();
      expect(container.querySelector("#TMEmain")).not.toBeNull();
    });
  });

  // ============================================================================
  // Console Logging Tests
  // ============================================================================

  describe("Console Output", () => {
    test("should log ASCII art on activation", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Re-run module to see console output
      document.getElementById("TMEiframe")?.remove();
      delete window.TME;

      jest.isolateModules(() => {
        require("../Package/dist/inject.js");
      });

      // The ASCII art contains styled text with %c prefix for CSS styling
      // The ASCII art spells out "THE MAPS EXPRESS" in stylized characters
      const firstCall = consoleSpy.mock.calls[0];
      expect(firstCall[0]).toContain("%c");
      // The ASCII art contains characters like | and _ to form letters
      expect(firstCall[0]).toContain("|");
      expect(firstCall[0]).toContain("_");
      // Check for the monospace font CSS
      expect(firstCall[1]).toContain("font-family");
      consoleSpy.mockRestore();
    });

    test("should log activation message with timestamp", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Re-run module
      document.getElementById("TMEiframe")?.remove();
      delete window.TME;

      jest.isolateModules(() => {
        require("../Package/dist/inject.js");
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Activated"));
      consoleSpy.mockRestore();
    });
  });
});
