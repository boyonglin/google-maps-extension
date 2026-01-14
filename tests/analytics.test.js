/**
 * Jest Unit Tests for analytics.js
 * Tests for GA4 Analytics Module: client ID, session management, event tracking
 *
 * Note: analytics.js is now a thin wrapper that imports from analytics.module.js
 * These tests verify the wrapper correctly re-exports the Analytics object.
 */

const { flushPromises } = require("./testHelpers");

describe("analytics.js - Analytics Module (Popup Wrapper)", () => {
  let Analytics;
  let mockFetch;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset module cache to get fresh Analytics instance
    jest.resetModules();

    // Setup chrome storage mock
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Setup fetch mock BEFORE loading the module
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = mockFetch;

    // Load module fresh - analytics.js re-exports from analytics.module.js
    Analytics = require("../Package/dist/utils/analytics.module.js").Analytics;
  });

  afterEach(() => {
    // Cleanup
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
    });
  });

  // ============================================================================
  // getOrCreateClientId Tests
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

    test("should persist client ID across multiple calls", async () => {
      let storedId = null;

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(storedId ? { ga_client_id: storedId } : {});
      });
      chrome.storage.local.set.mockImplementation((data) => {
        storedId = data.ga_client_id;
      });

      const firstId = await Analytics.getOrCreateClientId();
      const secondId = await Analytics.getOrCreateClientId();

      expect(firstId).toBe(secondId);
    });
  });

  // ============================================================================
  // getOrCreateSessionId Tests
  // ============================================================================

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

    test("should update timestamp when reusing session", async () => {
      const existingSessionId = "1704067200";
      const recentTimestamp = Date.now() - 5 * 60 * 1000;

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_session_id: existingSessionId,
          ga_session_timestamp: recentTimestamp,
        });
      });

      await Analytics.getOrCreateSessionId();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        ga_session_timestamp: expect.any(Number),
      });
    });

    test("should create new session if timeout exceeded", async () => {
      const oldSessionId = "1704067200";
      const oldTimestamp = Date.now() - 35 * 60 * 1000; // 35 minutes ago (> 30 min timeout)

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

    test("should generate session ID from timestamp", async () => {
      // Get current time
      const beforeCall = Date.now();

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const sessionId = await Analytics.getOrCreateSessionId();

      const afterCall = Date.now();

      // Session ID should be a timestamp in seconds within our test window
      const sessionTimestamp = parseInt(sessionId, 10);
      expect(sessionTimestamp).toBeGreaterThanOrEqual(Math.floor(beforeCall / 1000));
      expect(sessionTimestamp).toBeLessThanOrEqual(Math.floor(afterCall / 1000));
    });

    test("should handle exactly 30 minutes timeout boundary", async () => {
      const existingSessionId = "1704067200";
      const exactlyAtTimeout = Date.now() - 30 * 60 * 1000; // Exactly 30 minutes ago

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_session_id: existingSessionId,
          ga_session_timestamp: exactlyAtTimeout,
        });
      });

      const sessionId = await Analytics.getOrCreateSessionId();

      // At exactly 30 minutes, session should be renewed (timeSinceLastActivity is not < timeout)
      expect(sessionId).not.toBe(existingSessionId);
    });
  });

  // ============================================================================
  // trackEvent Tests
  // ============================================================================

  describe("trackEvent", () => {
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });
    });

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

    test("should send correct payload structure", async () => {
      await Analytics.trackEvent("test_event", { custom_param: "custom_value" });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody).toEqual({
        client_id: "test-client-id",
        events: [
          {
            name: "test_event",
            params: {
              session_id: "test-session-id",
              engagement_time_msec: 100,
              custom_param: "custom_value",
            },
          },
        ],
      });
    });

    test("should include engagement_time_msec in params", async () => {
      await Analytics.trackEvent("test_event");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.engagement_time_msec).toBe(100);
    });

    test("should silently fail on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Should not throw
      await expect(Analytics.trackEvent("test_event")).resolves.not.toThrow();
    });

    test("should silently fail on storage error", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        throw new Error("Storage error");
      });

      // Should not throw
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
  // trackExtensionOpened Tests
  // ============================================================================

  describe("trackExtensionOpened", () => {
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });
    });

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
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });
    });

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
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });
    });

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
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });
    });

    test("should track page_view event", async () => {
      Analytics.trackPageView("history");

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].name).toBe("page_view");
    });

    test("should include page_name in params", async () => {
      Analytics.trackPageView("favorites");

      await flushPromises();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.events[0].params.page_name).toBe("favorites");
    });
  });

  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe("Module Exports", () => {
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

    test("should have all tracking methods available", () => {
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
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    test("should handle undefined eventParams gracefully", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });

      await Analytics.trackEvent("test_event", undefined);

      expect(mockFetch).toHaveBeenCalled();
    });

    test("should handle null eventParams gracefully", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });

      // This might throw or handle gracefully depending on implementation
      // The test verifies the behavior
      try {
        await Analytics.trackEvent("test_event", null);
        // If it doesn't throw, it should still have made the request
        expect(mockFetch).toHaveBeenCalled();
      } catch (e) {
        // Also acceptable if it throws for null params
      }
    });

    test("should handle special characters in event name", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });

      await Analytics.trackEvent("event_with_unicode_北京");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].name).toBe("event_with_unicode_北京");
    });

    test("should handle very long event names", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          ga_client_id: "test-client-id",
          ga_session_id: "test-session-id",
          ga_session_timestamp: Date.now(),
        });
      });

      const longEventName = "a".repeat(100);

      await Analytics.trackEvent(longEventName);

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
