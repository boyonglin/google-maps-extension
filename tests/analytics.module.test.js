/**
 * Jest Unit Tests for analytics.module.js
 * Tests for GA4 Analytics ES Module: service worker specific tracking methods
 */

const { flushPromises } = require("./testHelpers");

describe("analytics.module.js - Analytics ES Module", () => {
  let Analytics;
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup chrome storage mock
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        ga_client_id: "test-client-id",
        ga_session_id: "test-session-id",
        ga_session_timestamp: Date.now(),
      });
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Setup fetch mock
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = mockFetch;

    // Load module fresh
    Analytics = require("../Package/dist/utils/analytics.module.js").Analytics;
  });

  // ============================================================================
  // Module Structure Tests
  // ============================================================================

  describe("Module Structure", () => {
    test("should export Analytics object", () => {
      expect(Analytics).toBeDefined();
      expect(typeof Analytics).toBe("object");
    });

    test("should have GA_MEASUREMENT_ID", () => {
      expect(Analytics.GA_MEASUREMENT_ID).toBeDefined();
      expect(typeof Analytics.GA_MEASUREMENT_ID).toBe("string");
    });

    test("should have GA_API_SECRET", () => {
      expect(Analytics.GA_API_SECRET).toBeDefined();
      expect(typeof Analytics.GA_API_SECRET).toBe("string");
    });

    test("should have SESSION_TIMEOUT of 30 minutes", () => {
      expect(Analytics.SESSION_TIMEOUT).toBe(30 * 60 * 1000);
    });

    test("should expose all tracking methods", () => {
      expect(typeof Analytics.getOrCreateClientId).toBe("function");
      expect(typeof Analytics.getOrCreateSessionId).toBe("function");
      expect(typeof Analytics.trackEvent).toBe("function");
      expect(typeof Analytics.trackExtensionOpened).toBe("function");
      expect(typeof Analytics.trackFeatureClick).toBe("function");
      expect(typeof Analytics.trackSearch).toBe("function");
      expect(typeof Analytics.trackPageView).toBe("function");
      expect(typeof Analytics.trackShortcut).toBe("function");
      expect(typeof Analytics.trackContextMenu).toBe("function");
    });
  });

  // ============================================================================
  // trackShortcut Tests
  // ============================================================================

  describe("trackShortcut", () => {
    test("should track shortcut_used event", async () => {
      Analytics.trackShortcut("run-search");

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("shortcut_used");
    });

    test("should include shortcut_name in params", async () => {
      Analytics.trackShortcut("auto-attach");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.shortcut_name).toBe("auto-attach");
    });

    test("should track run-directions shortcut", async () => {
      Analytics.trackShortcut("run-directions");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.shortcut_name).toBe("run-directions");
    });

    test("should track _execute_action shortcut", async () => {
      Analytics.trackShortcut("_execute_action");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.shortcut_name).toBe("_execute_action");
    });
  });

  // ============================================================================
  // trackContextMenu Tests
  // ============================================================================

  describe("trackContextMenu", () => {
    test("should track context_menu_action event", async () => {
      Analytics.trackContextMenu("search");

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("context_menu_action");
    });

    test("should include menu_action: search in params", async () => {
      Analytics.trackContextMenu("search");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.menu_action).toBe("search");
    });

    test("should include menu_action: directions in params", async () => {
      Analytics.trackContextMenu("directions");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.menu_action).toBe("directions");
    });
  });

  // ============================================================================
  // trackExtensionOpened Tests
  // ============================================================================

  describe("trackExtensionOpened", () => {
    test("should track extension_opened event", async () => {
      Analytics.trackExtensionOpened();

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("extension_opened");
    });

    test("should include source: popup in params", async () => {
      Analytics.trackExtensionOpened();

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.source).toBe("popup");
    });
  });

  // ============================================================================
  // trackFeatureClick Tests
  // ============================================================================

  describe("trackFeatureClick", () => {
    test("should track feature_click event", async () => {
      Analytics.trackFeatureClick("search", "searchButton");

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("feature_click");
    });

    test("should include feature_name in params", async () => {
      Analytics.trackFeatureClick("favorites", "favButton");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.feature_name).toBe("favorites");
    });

    test("should include button_id in params", async () => {
      Analytics.trackFeatureClick("favorites", "favButton");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.button_id).toBe("favButton");
    });
  });

  // ============================================================================
  // trackSearch Tests
  // ============================================================================

  describe("trackSearch", () => {
    test("should track search_performed event", async () => {
      Analytics.trackSearch();

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("search_performed");
    });

    test("should include feature_name: search in params", async () => {
      Analytics.trackSearch();

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.feature_name).toBe("search");
    });
  });

  // ============================================================================
  // trackPageView Tests
  // ============================================================================

  describe("trackPageView", () => {
    beforeEach(() => {
      // Reset page tracking state before each test
      Analytics._currentPage = null;
      Analytics._pageStartTime = null;
      Analytics._lastPage = null;
    });

    test("should track page_view event", async () => {
      Analytics.trackPageView("history");

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("page_view");
    });

    test("should include page_name in params", async () => {
      Analytics.trackPageView("favorite");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.page_name).toBe("favorite");
    });

    test("should set _currentPage and _pageStartTime when tracking a page", () => {
      const beforeTime = Date.now();
      Analytics.trackPageView("history");
      const afterTime = Date.now();

      expect(Analytics._currentPage).toBe("history");
      expect(Analytics._pageStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(Analytics._pageStartTime).toBeLessThanOrEqual(afterTime);
    });

    test("should send page_dwell event when switching pages", async () => {
      // First page view
      Analytics.trackPageView("history");
      await flushPromises();
      mockFetch.mockClear();

      // Simulate time passing
      Analytics._pageStartTime = Date.now() - 5000; // 5 seconds ago

      // Switch to another page
      Analytics.trackPageView("favorite");
      await flushPromises();

      // Should have sent page_dwell for "history" and page_view for "favorite"
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const dwellCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(dwellCall.events[0].name).toBe("page_dwell");
      expect(dwellCall.events[0].params.page_name).toBe("history");
      expect(dwellCall.events[0].params.dwell_time_min).toBeCloseTo(5 / 60, 2);
    });

    test("should store _lastPage when trackPageView(null) is called", () => {
      Analytics.trackPageView("history");
      Analytics.trackPageView(null);

      expect(Analytics._lastPage).toBe("history");
      expect(Analytics._currentPage).toBeNull();
      expect(Analytics._pageStartTime).toBeNull();
    });

    test("should send page_dwell when trackPageView(null) is called", async () => {
      Analytics.trackPageView("gemini");
      await flushPromises();
      mockFetch.mockClear();

      // Simulate time passing
      Analytics._pageStartTime = Date.now() - 3000; // 3 seconds ago

      Analytics.trackPageView(null);
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const dwellCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(dwellCall.events[0].name).toBe("page_dwell");
      expect(dwellCall.events[0].params.page_name).toBe("gemini");
    });

    test("should not send page_view event when trackPageView(null) is called", async () => {
      Analytics.trackPageView("history");
      await flushPromises();
      mockFetch.mockClear();

      Analytics._pageStartTime = Date.now() - 1000;
      Analytics.trackPageView(null);
      await flushPromises();

      // Only page_dwell should be sent, no page_view
      const calls = mockFetch.mock.calls.map((call) => JSON.parse(call[1].body));
      const pageViewCalls = calls.filter((c) => c.events[0].name === "page_view");
      expect(pageViewCalls).toHaveLength(0);
    });
  });

  // ============================================================================
  // handleVisibilityChange Tests
  // ============================================================================

  describe("handleVisibilityChange", () => {
    beforeEach(() => {
      // Reset page tracking state before each test
      Analytics._currentPage = null;
      Analytics._pageStartTime = null;
      Analytics._lastPage = null;
    });

    test("should expose handleVisibilityChange method", () => {
      expect(typeof Analytics.handleVisibilityChange).toBe("function");
    });

    test("should call trackPageView(null) when visibility becomes hidden", async () => {
      Analytics.trackPageView("history");
      await flushPromises();
      mockFetch.mockClear();

      Analytics._pageStartTime = Date.now() - 2000;
      Analytics.handleVisibilityChange(false);
      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const dwellCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(dwellCall.events[0].name).toBe("page_dwell");
    });

    test("should store lastPage when tab becomes hidden", () => {
      Analytics.trackPageView("favorite");
      Analytics.handleVisibilityChange(false);

      expect(Analytics._lastPage).toBe("favorite");
      expect(Analytics._currentPage).toBeNull();
    });

    test("should resume tracking when tab becomes visible again", () => {
      // Setup: page was being tracked, then hidden
      Analytics._currentPage = null;
      Analytics._lastPage = "history";
      Analytics._pageStartTime = null;

      const beforeTime = Date.now();
      Analytics.handleVisibilityChange(true);
      const afterTime = Date.now();

      expect(Analytics._currentPage).toBe("history");
      expect(Analytics._pageStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(Analytics._pageStartTime).toBeLessThanOrEqual(afterTime);
    });

    test("should not resume if there is no lastPage", () => {
      Analytics._currentPage = null;
      Analytics._lastPage = null;
      Analytics._pageStartTime = null;

      Analytics.handleVisibilityChange(true);

      expect(Analytics._currentPage).toBeNull();
      expect(Analytics._pageStartTime).toBeNull();
    });

    test("should not affect tracking if already visible and tracking", () => {
      Analytics.trackPageView("gemini");
      const originalStartTime = Analytics._pageStartTime;

      // Simulate visible event when already visible
      Analytics.handleVisibilityChange(true);

      // Should not change anything since _currentPage is not null
      expect(Analytics._currentPage).toBe("gemini");
      expect(Analytics._pageStartTime).toBe(originalStartTime);
    });

    test("should handle rapid visibility changes correctly", async () => {
      Analytics.trackPageView("history");
      await flushPromises();

      // Hidden
      Analytics._pageStartTime = Date.now() - 1000;
      Analytics.handleVisibilityChange(false);

      expect(Analytics._lastPage).toBe("history");
      expect(Analytics._currentPage).toBeNull();

      // Visible again
      Analytics.handleVisibilityChange(true);

      expect(Analytics._currentPage).toBe("history");
      expect(Analytics._pageStartTime).not.toBeNull();

      // Hidden again
      Analytics.handleVisibilityChange(false);

      expect(Analytics._lastPage).toBe("history");
      expect(Analytics._currentPage).toBeNull();
    });
  });

  // ============================================================================
  // Core Method Tests (getOrCreateClientId, getOrCreateSessionId, trackEvent)
  // ============================================================================

  describe("getOrCreateClientId", () => {
    test("should return existing client ID from storage", async () => {
      const existingId = "existing-client-id-12345";
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ ga_client_id: existingId });
      });

      const clientId = await Analytics.getOrCreateClientId();

      expect(clientId).toBe(existingId);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test("should create new client ID when not in storage", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const clientId = await Analytics.getOrCreateClientId();

      expect(clientId).toBe("mock-uuid-1234-5678-9abc-def012345678");
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    test("should save newly created client ID to storage", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      await Analytics.getOrCreateClientId();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        ga_client_id: "mock-uuid-1234-5678-9abc-def012345678",
      });
    });
  });

  describe("getOrCreateSessionId", () => {
    test("should return existing session ID if within timeout", async () => {
      const existingSessionId = "1704067200";
      const recentTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_session_id: existingSessionId,
          ga_session_timestamp: recentTimestamp,
        });
      });

      const sessionId = await Analytics.getOrCreateSessionId();

      expect(sessionId).toBe(existingSessionId);
    });

    test("should create new session if timeout exceeded", async () => {
      const oldSessionId = "1704067200";
      const oldTimestamp = Date.now() - 35 * 60 * 1000; // 35 minutes ago

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_session_id: oldSessionId,
          ga_session_timestamp: oldTimestamp,
        });
      });

      const sessionId = await Analytics.getOrCreateSessionId();

      expect(sessionId).not.toBe(oldSessionId);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ga_session_id: expect.any(String),
          ga_session_timestamp: expect.any(Number),
        })
      );
    });

    test("should create new session if no existing session", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const sessionId = await Analytics.getOrCreateSessionId();

      expect(sessionId).toBeDefined();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ga_session_id: expect.any(String),
          ga_session_timestamp: expect.any(Number),
        })
      );
    });
  });

  describe("trackEvent", () => {
    test("should send event to GA4 endpoint", async () => {
      await Analytics.trackEvent("test_event", { param1: "value1" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("google-analytics.com/mp/collect"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );
    });

    test("should include correct measurement_id in URL", async () => {
      await Analytics.trackEvent("test_event");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain(`measurement_id=${Analytics.GA_MEASUREMENT_ID}`);
    });

    test("should include api_secret in URL", async () => {
      await Analytics.trackEvent("test_event");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain(`api_secret=${Analytics.GA_API_SECRET}`);
    });

    test("should silently fail on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(Analytics.trackEvent("test_event")).resolves.not.toThrow();
    });

    test("should work with empty eventParams", async () => {
      await Analytics.trackEvent("test_event");

      expect(mockFetch).toHaveBeenCalled();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].name).toBe("test_event");
    });
  });

  // ============================================================================
  // ES Module Export Tests
  // ============================================================================

  describe("ES Module Exports", () => {
    test("should export Analytics as named export", () => {
      const module = require("../Package/dist/utils/analytics.module.js");
      expect(module.Analytics).toBeDefined();
      expect(module.Analytics).toBe(Analytics);
    });

    test("should export Analytics as default export", () => {
      const module = require("../Package/dist/utils/analytics.module.js");
      expect(module.default).toBeDefined();
      expect(module.default).toBe(Analytics);
    });
  });
});
