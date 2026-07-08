const State = require("../Package/dist/hooks/popupState");
const { mockChromeRuntimeMessage } = require("./testHelpers");

describe("State Class", () => {
  let state;

  beforeEach(() => {
    state = new State();
    jest.clearAllMocks();
  });

  const testBuildSearchUrl = async (query, expectedUrl, expectedMessage) => {
    mockChromeRuntimeMessage({ buildSearchUrl: { url: expectedUrl } });
    const result = await state.buildSearchUrl(query);
    expect(result).toBe(expectedUrl);
    if (expectedMessage) {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expectedMessage,
        expect.any(Function)
      );
    }
  };

  const testBuildSearchUrlWithResponse = async (query, mockResponse, expectedResult) => {
    mockChromeRuntimeMessage({ buildSearchUrl: mockResponse });
    const result = await state.buildSearchUrl(query);
    expect(result).toBe(expectedResult);
  };

  const testBuildDirectionsUrl = async (origin, destination, expectedUrl) => {
    mockChromeRuntimeMessage({ buildDirectionsUrl: { url: expectedUrl } });
    const result = await state.buildDirectionsUrl(origin, destination);
    expect(result).toBe(expectedUrl);
  };

  const testBuildDirectionsUrlWithResponse = async (
    origin,
    destination,
    mockResponse,
    expectedResult
  ) => {
    mockChromeRuntimeMessage({ buildDirectionsUrl: mockResponse });
    const result = await state.buildDirectionsUrl(origin, destination);
    expect(result).toBe(expectedResult);
  };

  const setupConcurrentCallTest = (responsePrefix) => {
    let callCount = 0;
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callCount++;
      callback({ url: `${responsePrefix}-${callCount}` });
    });
    return callCount;
  };

  const setupMapsButtonTest = (response, action = "buildMapsUrl") => {
    const initialHref = "initial-value";
    global.mapsButton.href = initialHref;
    mockChromeRuntimeMessage({ [action]: response });
    return initialHref;
  };

  describe("Constructor", () => {
    test("should initialize with correct default values for page state", () => {
      expect(state.getSnapshot()).toMatchObject({
        boot: "loading",
        activeTab: "history",
        history: { items: [] },
        favorite: { items: [] },
        summary: { phase: "empty", items: [] },
      });
    });

    test("does not expose legacy list change flags", () => {
      expect(state.getSnapshot()).not.toHaveProperty("historyListChanged");
      expect(state.getSnapshot()).not.toHaveProperty("favoriteListChanged");
      expect(state.getSnapshot()).not.toHaveProperty("summaryListChanged");
    });

    test("should initialize with correct default values for video summary mode", () => {
      expect(state.getSnapshot().video).toMatchObject({ available: null, enabled: false });
      expect(state.summarizedTabId).toBeUndefined();
    });

    test("should initialize with correct default values for user state", () => {
      expect(state.paymentStage).toBeNull();
    });

    test("should initialize with correct default values for dimension cache", () => {
      expect(state.previousWidth).toBe(0);
      expect(state.previousHeight).toBe(0);
    });

    test("should create a new instance with independent state", () => {
      const state1 = new State();
      const state2 = new State();

      state1.dispatch({ type: "HISTORY_SET", items: ["A"] });
      state2.dispatch({ type: "HISTORY_SET", items: [] });

      expect(state1.getSnapshot().history.items).toEqual(["A"]);
      expect(state2.getSnapshot().history.items).toEqual([]);
    });
  });

  describe("buildSearchUrl", () => {
    test("should return a promise", () => {
      const result = state.buildSearchUrl("test query");
      expect(result).toBeInstanceOf(Promise);
    });

    test("should send correct message to chrome.runtime with search query", async () => {
      const testQuery = "New York";
      const mockUrl = "https://www.google.com/maps/search/New+York";

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      await state.buildSearchUrl(testQuery);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: "buildSearchUrl", query: testQuery },
        expect.any(Function)
      );
    });

    test("should resolve with the URL from the response", async () => {
      await testBuildSearchUrl("Paris", "https://www.google.com/maps/search/Paris");
    });

    test("should handle empty query string", async () => {
      await testBuildSearchUrl("", "https://www.google.com/maps/search/", {
        action: "buildSearchUrl",
        query: "",
      });
    });

    test("should handle special characters in query", async () => {
      await testBuildSearchUrl(
        "Tokyo & Osaka",
        "https://www.google.com/maps/search/Tokyo+%26+Osaka"
      );
    });

    test("should handle very long query strings", async () => {
      const longQuery = "a".repeat(1000);
      const mockUrl = "https://www.google.com/maps/search/" + "a".repeat(1000);
      await testBuildSearchUrl(longQuery, mockUrl);
    });

    test("should handle response with undefined url", async () => {
      await testBuildSearchUrlWithResponse("test", { url: undefined }, undefined);
    });

    test("should handle response with null", async () => {
      await testBuildSearchUrlWithResponse("test", null, undefined);
    });
  });

  describe("buildDirectionsUrl", () => {
    test("should return a promise", () => {
      const result = state.buildDirectionsUrl("origin", "destination");
      expect(result).toBeInstanceOf(Promise);
    });

    test("should send correct message to chrome.runtime with origin and destination", async () => {
      const testOrigin = "New York";
      const testDestination = "Boston";
      const mockUrl = "https://www.google.com/maps/dir/New+York/Boston";

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      await state.buildDirectionsUrl(testOrigin, testDestination);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: "buildDirectionsUrl",
          origin: testOrigin,
          destination: testDestination,
        },
        expect.any(Function)
      );
    });

    test("should resolve with the URL from the response", async () => {
      await testBuildDirectionsUrl(
        "San Francisco",
        "Los Angeles",
        "https://www.google.com/maps/dir/San+Francisco/Los+Angeles"
      );
    });

    test("should handle empty origin", async () => {
      await testBuildDirectionsUrl(
        "",
        "destination",
        "https://www.google.com/maps/dir//destination"
      );
    });

    test("should handle empty destination", async () => {
      await testBuildDirectionsUrl("origin", "", "https://www.google.com/maps/dir/origin/");
    });

    test("should handle both empty origin and destination", async () => {
      await testBuildDirectionsUrl("", "", "https://www.google.com/maps/dir//");
    });

    test("should handle special characters in origin and destination", async () => {
      await testBuildDirectionsUrl(
        "café & bar",
        "restaurant & grill",
        "https://www.google.com/maps/dir/café+%26+bar/restaurant+%26+grill"
      );
    });

    test("should handle coordinates as origin and destination", async () => {
      await testBuildDirectionsUrl(
        "40.7128,-74.0060",
        "34.0522,-118.2437",
        "https://www.google.com/maps/dir/40.7128,-74.0060/34.0522,-118.2437"
      );
    });

    test("should handle response with undefined url", async () => {
      await testBuildDirectionsUrlWithResponse(
        "origin",
        "destination",
        { url: undefined },
        undefined
      );
    });

    test("should handle response with null", async () => {
      await testBuildDirectionsUrlWithResponse("origin", "destination", null, undefined);
    });
  });

  describe("buildMapsButtonUrl", () => {
    test("should send correct message to chrome.runtime", () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: "https://www.google.com/maps" });
      });

      state.buildMapsButtonUrl();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: "buildMapsUrl" },
        expect.any(Function)
      );
    });

    test("should update mapsButton.href when response has url", () => {
      const mockUrl = "https://www.google.com/maps/test";
      mockChromeRuntimeMessage({ buildMapsUrl: { url: mockUrl } });
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(mockUrl);
    });

    test("should not update mapsButton.href when response is null", () => {
      const initialHref = setupMapsButtonTest(null);
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(initialHref);
    });

    test("should not update mapsButton.href when response is undefined", () => {
      const initialHref = setupMapsButtonTest(undefined);
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(initialHref);
    });

    test("should not update mapsButton.href when response.url is undefined", () => {
      const initialHref = setupMapsButtonTest({});
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(initialHref);
    });

    test("should not update mapsButton.href when response.url is null", () => {
      const initialHref = setupMapsButtonTest({ url: null });
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(initialHref);
    });

    test("should not update mapsButton.href when response.url is empty string", () => {
      const initialHref = setupMapsButtonTest({ url: "" });
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(initialHref);
    });

    test("should handle response with valid URL", () => {
      const mockUrl = "https://www.google.com/maps/@40.7128,-74.0060,15z";
      mockChromeRuntimeMessage({ buildMapsUrl: { url: mockUrl } });
      state.buildMapsButtonUrl();
      expect(global.mapsButton.href).toBe(mockUrl);
    });
  });

  describe("updateDimensions", () => {
    test("should update previousWidth and previousHeight", () => {
      const testWidth = 1024;
      const testHeight = 768;

      state.updateDimensions(testWidth, testHeight);

      expect(state.previousWidth).toBe(testWidth);
      expect(state.previousHeight).toBe(testHeight);
    });

    test("should handle zero values", () => {
      state.updateDimensions(0, 0);

      expect(state.previousWidth).toBe(0);
      expect(state.previousHeight).toBe(0);
    });

    test("should handle negative values", () => {
      state.updateDimensions(-100, -200);

      expect(state.previousWidth).toBe(-100);
      expect(state.previousHeight).toBe(-200);
    });

    test("should handle very large values", () => {
      const largeWidth = Number.MAX_SAFE_INTEGER;
      const largeHeight = Number.MAX_SAFE_INTEGER;

      state.updateDimensions(largeWidth, largeHeight);

      expect(state.previousWidth).toBe(largeWidth);
      expect(state.previousHeight).toBe(largeHeight);
    });

    test("should handle floating point values", () => {
      state.updateDimensions(1024.5, 768.75);

      expect(state.previousWidth).toBe(1024.5);
      expect(state.previousHeight).toBe(768.75);
    });

    test("should update multiple times correctly", () => {
      state.updateDimensions(800, 600);
      expect(state.previousWidth).toBe(800);
      expect(state.previousHeight).toBe(600);

      state.updateDimensions(1920, 1080);
      expect(state.previousWidth).toBe(1920);
      expect(state.previousHeight).toBe(1080);

      state.updateDimensions(1024, 768);
      expect(state.previousWidth).toBe(1024);
      expect(state.previousHeight).toBe(768);
    });

    test("should handle undefined values gracefully", () => {
      state.updateDimensions(undefined, undefined);

      expect(state.previousWidth).toBeUndefined();
      expect(state.previousHeight).toBeUndefined();
    });

    test("should handle null values gracefully", () => {
      state.updateDimensions(null, null);

      expect(state.previousWidth).toBeNull();
      expect(state.previousHeight).toBeNull();
    });
  });

  describe("State Management Behaviors", () => {
    test("hydrates all component state atomically", () => {
      state.dispatch({
        type: "HYDRATE",
        payload: { searchHistoryList: ["H"], favoriteList: ["F"] },
      });
      expect(state.getSnapshot()).toMatchObject({
        boot: "ready",
        history: { items: ["H"] },
        favorite: { items: ["F"], status: "ready" },
      });
    });

    test("notifies subscribers from reducer transitions without change flags", () => {
      const listener = jest.fn();
      state.subscribe(listener);
      state.dispatch({ type: "HISTORY_SET", items: ["A"] });
      state.dispatch({ type: "FAVORITE_SET", items: ["B"] });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(state.getSnapshot()).toMatchObject({
        history: { items: ["A"] },
        favorite: { items: ["B"] },
      });
    });

    test("BUG REPRO: an echo HISTORY_SET without emptyReason must not clobber a prior 'cleared' reason", () => {
      // The storage.onChanged echo dispatch carries no emptyReason.
      state.dispatch({ type: "HISTORY_SET", items: [], emptyReason: "cleared" });
      state.dispatch({ type: "HISTORY_SET", items: [] });

      expect(state.getSnapshot().history.emptyReason).toBe("cleared");
    });

    test("should manage video summary mode state transitions", () => {
      expect(state.getSnapshot().video).toMatchObject({ available: null, enabled: false });
      expect(state.summarizedTabId).toBeUndefined();

      state.dispatch({ type: "VIDEO_CONTEXT_REQUEST", token: 1 });
      state.dispatch({ type: "VIDEO_CONTEXT_RESULT", token: 1, available: true });
      state.dispatch({ type: "VIDEO_TOGGLE", enabled: true });
      state.summarizedTabId = 12345;

      expect(state.getSnapshot().video).toMatchObject({ available: true, enabled: true });
      expect(state.summarizedTabId).toBe(12345);

      state.dispatch({ type: "VIDEO_TOGGLE", enabled: false });
      state.dispatch({ type: "VIDEO_CONTEXT_REQUEST", token: 2 });
      expect(state.getSnapshot().video).toMatchObject({
        available: null,
        enabled: false,
        token: 2,
      });
    });

    test("should manage payment stage lifecycle", () => {
      // Default state: no payment stage
      expect(state.paymentStage).toBeNull();

      // User subscribes
      state.paymentStage = "trial";
      expect(state.paymentStage).toBe("trial");

      // Upgrades to premium
      state.paymentStage = "premium";
      expect(state.paymentStage).toBe("premium");

      // Downgrade or cancellation
      state.paymentStage = null;
      expect(state.paymentStage).toBeNull();
    });

    test("should preserve dimensions cache through operations", async () => {
      // Initial state
      expect(state.previousWidth).toBe(0);
      expect(state.previousHeight).toBe(0);

      // First render
      state.updateDimensions(800, 600);
      expect(state.previousWidth).toBe(800);
      expect(state.previousHeight).toBe(600);

      // Perform operations that might affect state
      mockChromeRuntimeMessage({ buildSearchUrl: { url: "https://maps.google.com" } });
      await state.buildSearchUrl("test");

      // Dimensions should persist
      expect(state.previousWidth).toBe(800);
      expect(state.previousHeight).toBe(600);

      // Window resize
      state.updateDimensions(1024, 768);
      expect(state.previousWidth).toBe(1024);
      expect(state.previousHeight).toBe(768);
    });

    test("should keep popup store instances independent", () => {
      const state1 = new State();
      const state2 = new State();

      state1.dispatch({
        type: "HYDRATE",
        payload: { searchHistoryList: ["H"], favoriteList: ["F"] },
      });
      expect(state1.getSnapshot().boot).toBe("ready");
      expect(state1.getSnapshot().history.items).toEqual(["H"]);
      expect(state2.getSnapshot().boot).toBe("loading");
      expect(state2.getSnapshot().history.items).toEqual([]);
    });
  });

  describe("Module Export", () => {
    test("should export State class", () => {
      expect(State).toBeDefined();
      expect(typeof State).toBe("function");
    });

    test("should be instantiable", () => {
      const instance = new State();
      expect(instance).toBeInstanceOf(State);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("buildSearchUrl should handle chrome.runtime.sendMessage throwing error", async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error("Runtime error");
      });

      await expect(state.buildSearchUrl("test")).rejects.toThrow("Runtime error");
    });

    test("buildDirectionsUrl should handle chrome.runtime.sendMessage throwing error", async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error("Runtime error");
      });

      await expect(state.buildDirectionsUrl("origin", "dest")).rejects.toThrow("Runtime error");
    });

    test("buildMapsButtonUrl should handle chrome.runtime.sendMessage throwing error", () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error("Runtime error");
      });

      expect(() => {
        state.buildMapsButtonUrl();
      }).toThrow("Runtime error");
    });

    test("should handle concurrent buildSearchUrl calls", async () => {
      setupConcurrentCallTest("url");

      const promise1 = state.buildSearchUrl("query1");
      const promise2 = state.buildSearchUrl("query2");
      const promise3 = state.buildSearchUrl("query3");

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toHaveLength(3);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    test("should handle concurrent buildDirectionsUrl calls", async () => {
      setupConcurrentCallTest("url");

      const promise1 = state.buildDirectionsUrl("o1", "d1");
      const promise2 = state.buildDirectionsUrl("o2", "d2");
      const promise3 = state.buildDirectionsUrl("o3", "d3");

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toHaveLength(3);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe("Type Checking and Validation", () => {
    test("should accept any type for query in buildSearchUrl", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: "test-url" });
      });

      await state.buildSearchUrl(123);
      await state.buildSearchUrl(null);
      await state.buildSearchUrl({});
      await state.buildSearchUrl([]);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(4);
    });

    test("should accept any type for origin and destination in buildDirectionsUrl", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: "test-url" });
      });

      await state.buildDirectionsUrl(123, 456);
      await state.buildDirectionsUrl(null, null);
      await state.buildDirectionsUrl({}, {});

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    test("should accept any type for dimensions in updateDimensions", () => {
      state.updateDimensions("800", "600");
      expect(state.previousWidth).toBe("800");
      expect(state.previousHeight).toBe("600");

      state.updateDimensions(true, false);
      expect(state.previousWidth).toBe(true);
      expect(state.previousHeight).toBe(false);
    });
  });
});

describe("Integration Tests", () => {
  let state;

  beforeEach(() => {
    state = new State();
    jest.clearAllMocks();
  });

  test("should handle complete workflow: initialize, search, update dimensions", async () => {
    expect(state.getSnapshot().boot).toBe("loading");
    state.dispatch({ type: "HYDRATE", payload: {} });
    expect(state.getSnapshot().boot).toBe("ready");

    // Search
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback({ url: "https://www.google.com/maps/search/test" });
    });

    const searchUrl = await state.buildSearchUrl("test");
    expect(searchUrl).toBe("https://www.google.com/maps/search/test");

    // Update dimensions
    state.updateDimensions(1920, 1080);
    expect(state.previousWidth).toBe(1920);
    expect(state.previousHeight).toBe(1080);
  });

  test("should handle state changes across multiple operations", async () => {
    state.dispatch({
      type: "HYDRATE",
      payload: { searchHistoryList: ["H"], favoriteList: ["F"] },
    });

    // Perform operations
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === "buildSearchUrl") {
        callback({ url: "search-url" });
      } else if (message.action === "buildDirectionsUrl") {
        callback({ url: "directions-url" });
      } else if (message.action === "buildMapsUrl") {
        callback({ url: "maps-url" });
      }
    });

    await state.buildSearchUrl("query");
    await state.buildDirectionsUrl("origin", "dest");
    state.buildMapsButtonUrl();

    // Verify state is maintained
    expect(state.getSnapshot().history.items).toEqual(["H"]);
    expect(state.getSnapshot().favorite.items).toEqual(["F"]);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
  });
});

describe("Popup reducer architecture", () => {
  test("history empty to cached summary renders ready without an intermediate message state", () => {
    const state = new State();
    const now = Date.now();
    state.dispatch({
      type: "HYDRATE",
      payload: {
        now,
        lastActiveTab: "history",
        searchHistoryList: [],
        summaryList: [{ name: "Taipei 101", clue: "Taipei" }],
        timestamp: now - 1000,
        geminiApiKey: "key",
      },
    });

    expect(state.getSnapshot().summary.phase).toBe("ready");
    state.dispatch({ type: "SET_ACTIVE_TAB", tab: "gemini" });
    expect(state.getSnapshot()).toMatchObject({
      activeTab: "gemini",
      summary: { phase: "ready", items: [{ name: "Taipei 101", clue: "Taipei" }] },
    });
  });

  test("expired summaries are normalized to empty during hydration", () => {
    const state = new State();
    const now = Date.now();
    state.dispatch({
      type: "HYDRATE",
      payload: {
        now,
        summaryList: [{ name: "Expired", clue: "" }],
        timestamp: now - State.SUMMARY_TTL_MS - 1,
      },
    });
    expect(state.getSnapshot().summary).toMatchObject({ phase: "empty", items: [] });
  });

  test("future and stale storage timestamps are treated as corrupted summary data", () => {
    const state = new State();
    const now = Date.now();
    state.dispatch({
      type: "HYDRATE",
      payload: {
        now,
        summaryList: [{ name: "Future", clue: "" }],
        timestamp: now + 1,
      },
    });
    expect(state.getSnapshot().summary.phase).toBe("empty");

    state.dispatch({
      type: "SUMMARY_STORAGE_SET",
      items: [{ name: "Stale", clue: "" }],
      timestamp: now - State.SUMMARY_TTL_MS - 1,
      now,
    });
    expect(state.getSnapshot().summary.phase).toBe("empty");
  });

  test("stale summary and API callbacks cannot overwrite newer state", () => {
    const state = new State();
    state.dispatch({ type: "SUMMARY_START", requestId: "new" });
    state.dispatch({
      type: "SUMMARY_SUCCESS",
      requestId: "old",
      items: [{ name: "Stale", clue: "" }],
    });
    state.dispatch({ type: "API_VERIFY_START", token: 2, hasKey: true });
    state.dispatch({ type: "API_VERIFY_RESULT", token: 1, valid: false });

    expect(state.getSnapshot().summary.phase).toBe("generating");
    expect(state.getSnapshot().api).toEqual({ status: "verifying", token: 2 });
  });

  test("storage removal does not interrupt an active generation", () => {
    const state = new State();
    state.dispatch({ type: "SUMMARY_START", requestId: "active" });
    state.dispatch({ type: "SUMMARY_STORAGE_SET", items: [] });
    expect(state.getSnapshot().summary).toMatchObject({
      phase: "generating",
      requestId: "active",
    });
  });

  test("delete mode is derived from the active list and exits when it becomes empty", () => {
    const state = new State();
    state.dispatch({ type: "HYDRATE", payload: { searchHistoryList: ["A"] } });
    state.dispatch({ type: "DELETE_ENTER", source: "history" });
    state.dispatch({ type: "DELETE_TOGGLE", value: "A" });
    expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["A"]);
    state.dispatch({ type: "HISTORY_SET", items: [] });
    expect(state.getSnapshot().deleteMode).toEqual({ source: null, selectedValues: [] });
  });

  test("a tab switch before HYDRATE resolves is not clobbered by the persisted lastActiveTab", () => {
    const state = new State();
    // Simulates the user clicking a tab while hydratePopup()'s getWarmState()
    // is still in flight.
    state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });
    state.dispatch({
      type: "HYDRATE",
      payload: { lastActiveTab: "gemini" },
    });
    expect(state.getSnapshot().activeTab).toBe("favorite");
  });

  test("HYDRATE still applies the persisted lastActiveTab when the user hasn't touched a tab yet", () => {
    const state = new State();
    state.dispatch({ type: "HYDRATE", payload: { lastActiveTab: "gemini" } });
    expect(state.getSnapshot().activeTab).toBe("gemini");
  });
});
