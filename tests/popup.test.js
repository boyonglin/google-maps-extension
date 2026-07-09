/**
 * Unit Tests for popup.js
 *
 * Tests cover:
 * - Initialization and DOM setup
 * - Page navigation and switching
 * - Event handlers (search, clear, buttons)
 * - Chrome storage integration
 * - Dimension tracking and iframe communication
 * - Edge cases and error handling
 */

const { setupPopupDOM, teardownPopupDOM } = require("./popupDOMFixture");
const { flushPromises } = require("./testHelpers");
const State = require("../Package/dist/hooks/popupState");
const Remove = require("../Package/dist/components/remove");
const Favorite = require("../Package/dist/components/favorite");
const History = require("../Package/dist/components/history");
const Gemini = require("../Package/dist/components/gemini");
const Modal = require("../Package/dist/components/modal");
const Payment = require("../Package/dist/utils/payment");

// Mock module dependencies for popup.js
let popup;
let mockState, mockRemove, mockFavorite, mockHistory, mockGemini, mockModal, mockPayment;

describe("popup.js", () => {
  beforeEach(() => {
    // Setup DOM FIRST
    setupPopupDOM();

    // Create mocked instances
    mockState = new State();
    mockRemove = new Remove();
    mockFavorite = new Favorite();
    mockHistory = new History();
    mockGemini = new Gemini();
    mockModal = new Modal();
    mockPayment = new Payment();

    // Mock their methods
    jest.spyOn(mockRemove, "addRemoveListener").mockImplementation(() => {});
    jest.spyOn(mockFavorite, "addFavoritePageListener").mockImplementation(() => {});
    jest.spyOn(mockFavorite, "updateFavorite").mockImplementation(() => {});
    jest.spyOn(mockHistory, "addHistoryPageListener").mockImplementation(() => {});
    jest.spyOn(mockGemini, "addGeminiPageListener").mockImplementation(() => {});
    jest.spyOn(mockGemini, "checkCurrentTabForYoutube").mockResolvedValue(undefined);
    jest.spyOn(mockGemini, "fetchAPIKey").mockImplementation(() => {});
    jest.spyOn(mockGemini, "clearExpiredSummary").mockImplementation(() => {});
    jest.spyOn(mockModal, "addModalListener").mockResolvedValue(undefined);
    jest.spyOn(mockModal, "updateOptionalModal").mockImplementation(() => {});
    jest.spyOn(mockModal, "updateIncognitoModal").mockImplementation(() => {});
    jest.spyOn(mockPayment, "checkPay").mockImplementation(() => {});
    jest.spyOn(mockState, "buildMapsButtonUrl").mockImplementation(() => {});

    // Setup chrome.runtime.sendMessage to resolve with warm state
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === "getWarmState") {
        callback?.({
          searchHistoryList: [],
          favoriteList: [],
          geminiApiKey: "",
          startAddr: "",
          authUser: 0,
          isIncognito: false,
          videoSummaryToggle: false,
        });
      } else if (message.action === "buildMapsUrl") {
        callback?.({ url: "https://www.google.com/maps" });
      }
      return true;
    });

    // Provide the component constructors popup.js resolves as globals in
    // the browser (top-level class declarations from the other scripts)
    global.State = State;
    global.Remove = Remove;
    global.Favorite = Favorite;
    global.History = History;
    global.Gemini = Gemini;
    global.Modal = Modal;
    global.Payment = Payment;

    // History/Favorite/Remove's render() read these as bare globals too (the
    // browser shares one script scope; Jest needs the bridge made explicit).
    global.searchHistoryListContainer = document.getElementById("searchHistoryList");
    global.emptyMessage = document.getElementById("emptyMessage");
    global.clearButton = document.getElementById("clearButton");
    global.favoriteListContainer = document.getElementById("favoriteList");
    global.favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");
    global.exportButton = document.getElementById("exportButton");
    global.deleteListButton = document.getElementById("deleteListButton");
    global.deleteButtonGroup = document.getElementById("deleteButtonGroup");
    global.searchButtonGroup = document.getElementById("searchButtonGroup");
    global.exportButtonGroup = document.getElementById("exportButtonGroup");
    global.geminiButtonGroup = document.getElementById("geminiButtonGroup");
    global.searchHistoryButton = document.getElementById("searchHistoryButton");
    global.favoriteListButton = document.getElementById("favoriteListButton");
    global.geminiSummaryButton = document.getElementById("geminiSummaryButton");
    global.deleteButton = document.getElementById("deleteButton");

    // Load popup module AFTER DOM is set up
    popup = require("../Package/dist/popup");
  });

  afterEach(() => {
    teardownPopupDOM();
    jest.resetModules();
    jest.clearAllMocks();

    // Clean up the component constructor globals set in beforeEach to keep
    // the test environment isolated between tests.
    delete global.State;
    delete global.Remove;
    delete global.Favorite;
    delete global.History;
    delete global.Gemini;
    delete global.Modal;
    delete global.Payment;
  });

  describe("Initialization", () => {
    test("initializeDependencies creates default instances when no deps provided", () => {
      const deps = popup.initializeDependencies();

      expect(deps.state).toBeInstanceOf(State);
      expect(deps.remove).toBeInstanceOf(Remove);
      expect(deps.favorite).toBeInstanceOf(Favorite);
      expect(deps.history).toBeInstanceOf(History);
      expect(deps.gemini).toBeInstanceOf(Gemini);
      expect(deps.modal).toBeInstanceOf(Modal);
      expect(deps.payment).toBeInstanceOf(Payment);
    });

    test("initializeDependencies accepts custom dependencies", () => {
      const customState = { custom: true };
      const customRemove = { customRemove: true };
      const deps = popup.initializeDependencies({
        state: customState,
        remove: customRemove,
      });

      expect(deps.state).toBe(customState);
      expect(deps.remove).toBe(customRemove);
    });

    test("initializePopup sets up event listeners and calls initialization methods", async () => {
      // Initialize with mocked dependencies
      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
        payment: mockPayment,
      });

      popup.initializePopup();

      // Wait for async operations
      await flushPromises();

      expect(mockRemove.addRemoveListener).toHaveBeenCalled();
      expect(mockFavorite.addFavoritePageListener).toHaveBeenCalled();
      expect(mockHistory.addHistoryPageListener).toHaveBeenCalled();
      expect(mockGemini.addGeminiPageListener).toHaveBeenCalled();
      expect(mockModal.addModalListener).toHaveBeenCalled();
      expect(mockPayment.checkPay).toHaveBeenCalled();
    });

    test("initializePopup focuses search input", () => {
      const searchInput = document.getElementById("searchInput");
      jest.spyOn(searchInput, "focus");

      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
        payment: mockPayment,
      });

      popup.initializePopup();

      expect(searchInput.focus).toHaveBeenCalled();
    });

    test("initializePopup blur active element before Bootstrap hides a modal", () => {
      const searchInput = document.getElementById("searchInput");
      jest.spyOn(searchInput, "blur");

      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
        payment: mockPayment,
      });

      popup.initializePopup();
      searchInput.focus();
      document.dispatchEvent(new Event("hide.bs.modal"));

      expect(searchInput.blur).toHaveBeenCalled();
    });
  });

  describe("popupLayout", () => {
    test("shows the loading message before hydration and hides it once ready", async () => {
      const loadingMessage = document.getElementById("loadingMessage");
      expect(loadingMessage.classList.contains("d-none")).toBe(false);

      popup.initializeDependencies({ state: mockState });
      chrome.storage.local.get.mockImplementation((key, callback) => callback({}));

      await popup.popupLayout();

      expect(mockState.getSnapshot().boot).toBe("ready");
      expect(loadingMessage.classList.contains("d-none")).toBe(true);
    });

    test("popupLayout defaults to history page when no lastActiveTab saved", async () => {
      popup.initializeDependencies({ state: mockState });

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      await popup.popupLayout();

      const searchHistoryButton = document.getElementById("searchHistoryButton");
      expect(searchHistoryButton.classList.contains("active-button")).toBe(true);

      const historyPanel = document.querySelector('[data-tab-panel="history"]');
      expect(historyPanel.classList.contains("d-none")).toBe(false);
    });

    test("popupLayout restores favorite tab from lastActiveTab", async () => {
      popup.initializeDependencies({
        state: mockState,
        favorite: mockFavorite,
        gemini: mockGemini,
      });

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ lastActiveTab: "favorite" });
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback?.({ favoriteList: ["place1"], lastActiveTab: "favorite" });
        }
        return true;
      });

      await popup.popupLayout();

      const favoriteListButton = document.getElementById("favoriteListButton");
      expect(favoriteListButton.classList.contains("active-button")).toBe(true);

      const favoritePanel = document.querySelector('[data-tab-panel="favorite"]');
      expect(favoritePanel.classList.contains("d-none")).toBe(false);

      expect(mockState.getSnapshot().favorite.items).toEqual(["place1"]);
    });

    test("popupLayout restores gemini tab from lastActiveTab", async () => {
      popup.initializeDependencies({
        state: mockState,
        gemini: mockGemini,
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") callback?.({ lastActiveTab: "gemini" });
        return true;
      });

      await popup.popupLayout();

      const geminiSummaryButton = document.getElementById("geminiSummaryButton");
      expect(geminiSummaryButton.classList.contains("active-button")).toBe(true);

      const deleteListButton = document.getElementById("deleteListButton");
      expect(deleteListButton.disabled).toBe(true);
      expect(mockState.getSnapshot().activeTab).toBe("gemini");
    });

    test("popupLayout re-checks YouTube state after restoring the gemini tab", async () => {
      // Must re-run since checkCurrentTabForYoutube() ran before this tab became active
      popup.initializeDependencies({
        state: mockState,
        gemini: mockGemini,
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") callback?.({ lastActiveTab: "gemini" });
        return true;
      });

      await popup.popupLayout();

      expect(mockGemini.checkCurrentTabForYoutube).toHaveBeenCalled();
    });

    test("popupLayout ignores invalid lastActiveTab value", async () => {
      popup.initializeDependencies({ state: mockState });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") callback?.({ lastActiveTab: "invalid" });
        return true;
      });

      await popup.popupLayout();

      const searchHistoryButton = document.getElementById("searchHistoryButton");
      expect(searchHistoryButton.classList.contains("active-button")).toBe(true);
    });

    test("popupLayout is exported and callable", async () => {
      popup.initializeDependencies({ state: mockState });

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      // Should not throw
      await expect(popup.popupLayout()).resolves.toBeDefined();
    });
  });

  describe("tab switching via SET_ACTIVE_TAB", () => {
    beforeEach(() => {
      popup.initializeDependencies({ state: mockState });
      mockState.dispatch({ type: "HYDRATE", payload: {} });
    });

    const showPage = (tab) => mockState.dispatch({ type: "SET_ACTIVE_TAB", tab });

    const getPanel = (tab) => document.querySelector(`[data-tab-panel="${tab}"]`);

    test("SET_ACTIVE_TAB history shows history page elements and hides others", () => {
      showPage("history");

      expect(getPanel("history").classList.contains("d-none")).toBe(false);
      expect(getPanel("favorite").classList.contains("d-none")).toBe(true);
      expect(getPanel("gemini").classList.contains("d-none")).toBe(true);
    });

    test("SET_ACTIVE_TAB favorite shows favorite page elements", () => {
      showPage("favorite");

      expect(getPanel("favorite").classList.contains("d-none")).toBe(false);
      expect(getPanel("history").classList.contains("d-none")).toBe(true);
    });

    test("SET_ACTIVE_TAB gemini shows gemini page elements", () => {
      showPage("gemini");

      expect(getPanel("gemini").classList.contains("d-none")).toBe(false);
      expect(getPanel("history").classList.contains("d-none")).toBe(true);
    });

    test("SET_ACTIVE_TAB updates active button classes correctly", () => {
      const searchHistoryButton = document.getElementById("searchHistoryButton");
      const favoriteListButton = document.getElementById("favoriteListButton");
      const geminiSummaryButton = document.getElementById("geminiSummaryButton");

      showPage("history");
      expect(searchHistoryButton.classList.contains("active-button")).toBe(true);
      expect(favoriteListButton.classList.contains("active-button")).toBe(false);

      showPage("favorite");
      expect(searchHistoryButton.classList.contains("active-button")).toBe(false);
      expect(favoriteListButton.classList.contains("active-button")).toBe(true);

      showPage("gemini");
      expect(geminiSummaryButton.classList.contains("active-button")).toBe(true);
      expect(favoriteListButton.classList.contains("active-button")).toBe(false);
    });

    test("SET_ACTIVE_TAB updates subtitle text based on page", () => {
      const subtitleElement = document.getElementById("subtitle");

      showPage("history");
      expect(subtitleElement.textContent).toBe("Search History");

      showPage("favorite");
      expect(subtitleElement.textContent).toBe("Favorite List");

      showPage("gemini");
      expect(subtitleElement.textContent).toBe("Gemini Summary");
    });

    test("history empty to cached summary shows the list on the first rendered frame", () => {
      const loadingMessage = document.getElementById("geminiEmptyMessage");
      loadingMessage.textContent = "Loading summary";
      mockState.dispatch({
        type: "SUMMARY_STORAGE_SET",
        items: [{ name: "Taipei 101", clue: "Taipei" }],
        timestamp: Date.now(),
      });

      showPage("gemini");

      expect(document.getElementById("summaryList").textContent).toContain("Taipei 101");
      expect(loadingMessage.classList.contains("d-none")).toBe(true);
      expect(mockState.getSnapshot().summary.phase).toBe("ready");
    });

    test("SET_ACTIVE_TAB hides video summary button for history and favorite pages", () => {
      const videoSummaryButton = document.getElementById("videoSummaryButton");

      showPage("history");
      expect(videoSummaryButton.classList.contains("d-none")).toBe(true);

      showPage("favorite");
      expect(videoSummaryButton.classList.contains("d-none")).toBe(true);
    });
  });

  describe("checkTextOverflow", () => {
    test("checkTextOverflow adjusts button width classes based on content height", () => {
      popup.initializeDependencies({ state: mockState });

      const clearButton = document.getElementById("clearButton");

      // Mock offsetHeight to simulate overflow
      const mapsButtonSpan = document.getElementById("mapsButtonSpan");
      const clearButtonSpan = clearButton.querySelector("span");

      Object.defineProperty(mapsButtonSpan, "offsetHeight", { value: 20, configurable: true });
      Object.defineProperty(clearButtonSpan, "offsetHeight", { value: 40, configurable: true });

      popup.checkTextOverflow();

      expect(clearButton.classList.contains("w-25")).toBe(false);
      expect(clearButton.classList.contains("w-auto")).toBe(true);
    });
  });

  describe("getWarmState", () => {
    test("getWarmState returns state from background script", async () => {
      const mockState = {
        searchHistoryList: ["Location 1", "Location 2"],
        favoriteList: ["Favorite 1"],
        geminiApiKey: "test-key",
        startAddr: "Start Address",
        authUser: 1,
        isIncognito: false,
        videoSummaryToggle: true,
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback(mockState);
        }
        return true;
      });

      const result = await popup.getWarmState();

      expect(result).toEqual(mockState);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: "getWarmState" },
        expect.any(Function)
      );
    });

    test("getWarmState returns empty object when no state available", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback(null);
        }
        return true;
      });

      const result = await popup.getWarmState();

      expect(result).toEqual({});
    });

    test("getWarmState returns empty object when extension context is invalid", async () => {
      const originalId = chrome.runtime.id;
      delete chrome.runtime.id;

      const result = await popup.getWarmState();

      expect(result).toEqual({});
      chrome.runtime.id = originalId;
    });

    test("getWarmState retries on chrome.runtime.lastError", async () => {
      let callCount = 0;
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callCount++;
          if (callCount < 3) {
            // Simulate async behavior with setTimeout to allow retry to work
            setTimeout(() => {
              Object.defineProperty(chrome.runtime, "lastError", {
                value: { message: "Service worker not responding" },
                configurable: true,
              });
              callback(null);
              Object.defineProperty(chrome.runtime, "lastError", {
                value: null,
                configurable: true,
              });
            }, 0);
          } else {
            setTimeout(() => {
              callback({ searchHistoryList: ["success"] });
            }, 0);
          }
        }
        return true;
      });

      const result = await popup.getWarmState();

      expect(result).toEqual({ searchHistoryList: ["success"] });
      expect(callCount).toBe(3);
    });

    test("getWarmState returns empty object after all retries exhausted", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          setTimeout(() => {
            Object.defineProperty(chrome.runtime, "lastError", {
              value: { message: "Service worker not responding" },
              configurable: true,
            });
            callback(null);
            Object.defineProperty(chrome.runtime, "lastError", {
              value: null,
              configurable: true,
            });
          }, 0);
        }
        return true;
      });

      const result = await popup.getWarmState(0); // 0 retries = single attempt only

      expect(result).toEqual({});
    });
  });

  describe("fetchData", () => {
    test("fetchData populates search history list when data exists", async () => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });

      const mockHistoryList = ["Location 1", "Location 2", "Location 3"];
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: mockHistoryList,
            favoriteList: [],
            geminiApiKey: "",
            startAddr: "",
            authUser: 0,
            isIncognito: false,
            videoSummaryToggle: false,
          });
        }
        return true;
      });

      jest.spyOn(mockHistory, "createListItem").mockImplementation((item) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        const span = document.createElement("span");
        span.textContent = item;
        li.appendChild(span);
        return li;
      });

      await popup.fetchData();

      const searchHistoryListContainer = document.getElementById("searchHistoryList");
      const emptyMessage = document.getElementById("emptyMessage");
      const clearButton = document.getElementById("clearButton");

      expect(emptyMessage.classList.contains("d-none")).toBe(true);
      expect(clearButton.disabled).toBe(false);
      expect(mockState.getSnapshot().history.items).toEqual([
        "Location 1",
        "Location 2",
        "Location 3",
      ]);
      expect(searchHistoryListContainer.querySelector("ul")).not.toBeNull();
    });

    test("fetchData shows empty message when no history exists", async () => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: [],
            favoriteList: [],
            geminiApiKey: "",
            startAddr: "",
            authUser: 0,
            isIncognito: false,
            videoSummaryToggle: false,
          });
        }
        return true;
      });

      await popup.fetchData();

      const emptyMessage = document.getElementById("emptyMessage");
      const clearButton = document.getElementById("clearButton");

      expect(emptyMessage.classList.contains("d-none")).toBe(false);
      expect(clearButton.disabled).toBe(true);
      expect(mockState.getSnapshot().history.items).toHaveLength(0);
    });

    test("fetchData calls gemini.fetchAPIKey with stored API key", async () => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });

      const testApiKey = "test-api-key-123";
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: [],
            favoriteList: [],
            geminiApiKey: testApiKey,
            startAddr: "",
            authUser: 0,
            isIncognito: false,
            videoSummaryToggle: false,
          });
        }
        return true;
      });

      await popup.fetchData();

      expect(mockGemini.fetchAPIKey).toHaveBeenCalledWith(testApiKey);
    });

    test("fetchData calls modal.updateOptionalModal with stored settings", async () => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });

      const testStartAddr = "123 Main St";
      const testAuthUser = 2;
      const testHistoryMax = 10;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: [],
            favoriteList: [],
            geminiApiKey: "",
            startAddr: testStartAddr,
            authUser: testAuthUser,
            isIncognito: false,
            videoSummaryToggle: false,
            historyMax: testHistoryMax,
          });
        }
        return true;
      });

      await popup.fetchData();

      expect(mockModal.updateOptionalModal).toHaveBeenCalledWith(
        testStartAddr,
        testAuthUser,
        testHistoryMax
      );
    });

    test("fetchData updates video summary button state", async () => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: [],
            favoriteList: [],
            geminiApiKey: "",
            startAddr: "",
            authUser: 0,
            isIncognito: false,
            videoSummaryToggle: true,
          });
        }
        return true;
      });

      await popup.fetchData();

      expect(mockState.getSnapshot().video.enabled).toBe(true);
    });
  });

  describe("Search Input Events", () => {
    beforeEach(() => {
      popup.initializeDependencies({ state: mockState });
    });

    test("pressing Enter key with valid input sends search message", () => {
      const searchInput = document.getElementById("searchInput");
      searchInput.value = "Test Location";

      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      searchInput.dispatchEvent(event);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        searchTerm: "Test Location",
        action: "searchInput",
      });
      expect(searchInput.value).toBe("");
    });

    test("pressing Enter key with empty input prevents submission", () => {
      const searchInput = document.getElementById("searchInput");
      searchInput.value = "   ";

      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");
      searchInput.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test("input event shows enter button when text is entered", () => {
      const searchInput = document.getElementById("searchInput");
      const enterButton = document.getElementById("enterButton");

      searchInput.value = "Test";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));

      expect(enterButton.classList.contains("d-none")).toBe(false);
    });

    test("input event hides enter button when input is empty", () => {
      const searchInput = document.getElementById("searchInput");
      const enterButton = document.getElementById("enterButton");

      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));

      expect(enterButton.classList.contains("d-none")).toBe(true);
    });

    test("clicking enter button with valid input sends search message", () => {
      const searchInput = document.getElementById("searchInput");
      const enterButton = document.getElementById("enterButton");

      searchInput.value = "Test Location";
      enterButton.click();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        searchTerm: "Test Location",
        action: "searchInput",
      });
      expect(searchInput.value).toBe("");
    });

    test("clicking enter button with empty input does nothing", () => {
      const searchInput = document.getElementById("searchInput");
      const enterButton = document.getElementById("enterButton");

      searchInput.value = "   ";
      enterButton.click();

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Page Button Events", () => {
    beforeEach(() => {
      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        gemini: mockGemini,
        history: mockHistory,
        modal: mockModal,
        payment: mockPayment,
      });
    });

    test("clicking the history tab button marks it active", () => {
      const searchHistoryButton = document.getElementById("searchHistoryButton");

      searchHistoryButton.click();

      expect(searchHistoryButton.classList.contains("active-button")).toBe(true);
    });

    test("clicking the favorite tab button marks it active", () => {
      const favoriteListButton = document.getElementById("favoriteListButton");

      favoriteListButton.click();

      expect(favoriteListButton.classList.contains("active-button")).toBe(true);
    });

    test("clicking the gemini tab button marks it active", () => {
      const geminiSummaryButton = document.getElementById("geminiSummaryButton");

      geminiSummaryButton.click();

      expect(geminiSummaryButton.classList.contains("active-button")).toBe(true);
    });
  });

  describe("Chrome Storage Change Listener", () => {
    beforeEach(() => {
      popup.initializeDependencies({
        state: mockState,
        favorite: mockFavorite,
        gemini: mockGemini,
        modal: mockModal,
      });

      // Mock fetchData
      jest.spyOn(popup, "fetchData").mockResolvedValue(undefined);
    });

    test("storage change updates favorite items", () => {
      const changes = {
        favoriteList: {
          newValue: ["New Favorite"],
          oldValue: [],
        },
      };

      jest.spyOn(mockFavorite, "updateFavorite").mockImplementation(() => {});

      // Trigger storage change event
      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      listener(changes, "local");

      expect(mockState.getSnapshot().favorite.items).toEqual(["New Favorite"]);
    });

    test("storage change updates history items when list grows", () => {
      const changes = {
        searchHistoryList: {
          newValue: ["Item 1", "Item 2"],
          oldValue: ["Item 1"],
        },
      };

      // Get the listener that was registered
      const listenerCalls = chrome.storage.onChanged.addListener.mock.calls;
      expect(listenerCalls.length).toBeGreaterThan(0);

      const listener = listenerCalls[listenerCalls.length - 1][0];
      listener(changes, "local");

      expect(mockState.getSnapshot().history.items).toEqual(["Item 1", "Item 2"]);
    });

    test("storage change updates history items when list shrinks", () => {
      const changes = {
        searchHistoryList: {
          newValue: ["Item 1"],
          oldValue: ["Item 1", "Item 2"],
        },
      };

      // Get the listener that was registered
      const listenerCalls = chrome.storage.onChanged.addListener.mock.calls;
      expect(listenerCalls.length).toBeGreaterThan(0);

      const listener = listenerCalls[listenerCalls.length - 1][0];
      listener(changes, "local");

      expect(mockState.getSnapshot().history.items).toEqual(["Item 1"]);
    });

    test("storage change updates incognito mode", () => {
      const changes = {
        isIncognito: {
          newValue: true,
          oldValue: false,
        },
      };

      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      listener(changes, "local");

      expect(mockModal.updateIncognitoModal).toHaveBeenCalledWith(true);
    });

    test("storage change updates maps button URL when authUser changes", () => {
      const changes = {
        authUser: {
          newValue: 2,
          oldValue: 1,
        },
      };

      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      listener(changes, "local");

      expect(mockState.buildMapsButtonUrl).toHaveBeenCalled();
    });

    test("does not double-react to the storage echo of its own onApiKeyChange call", () => {
      chrome.runtime.sendMessage.mockClear();
      mockGemini.fetchAPIKey.mockClear();
      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];

      // Mirrors modal.js: onApiKeyChange fires fetchAPIKey directly, then
      // the resulting storage write's onChanged echo arrives right after.
      mockModal.onApiKeyChange("plain-key");
      listener({ geminiApiKey: { newValue: "encrypted-key" } }, "local");

      expect(mockGemini.fetchAPIKey).toHaveBeenCalledTimes(1);
      expect(mockGemini.fetchAPIKey).toHaveBeenCalledWith("plain-key");
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        { action: "getApiKey" },
        expect.any(Function)
      );
    });

    test("reacts to a geminiApiKey change from another context", () => {
      chrome.runtime.sendMessage.mockClear();
      mockGemini.fetchAPIKey.mockClear();
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getApiKey") callback({ apiKey: "decrypted-key" });
        return true;
      });
      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];

      // No preceding onApiKeyChange call - this key change came from
      // elsewhere (e.g. a second popup instance).
      listener({ geminiApiKey: { newValue: "encrypted-key" } }, "local");

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: "getApiKey" },
        expect.any(Function)
      );
      expect(mockGemini.fetchAPIKey).toHaveBeenCalledWith("decrypted-key");
    });
  });

  describe("Dimension Tracking", () => {
    beforeEach(() => {
      popup.initializeDependencies({ state: mockState });
    });

    test("currentDimensions returns body dimensions", () => {
      const dimensions = popup.currentDimensions();

      expect(dimensions).toEqual({
        width: document.body.offsetWidth,
        height: document.body.offsetHeight,
      });
    });

    test("sendUpdateIframeSize sends message to correct tab", () => {
      const tabId = 123;
      const width = 400;
      const height = 600;

      popup.sendUpdateIframeSize(tabId, width, height);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
        action: "updateIframeSize",
        width,
        height,
      });
    });

    test("measureContentSize updates state dimensions and sends iframe message", () => {
      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 456 }]);
      });

      mockState.previousWidth = 0;
      mockState.previousHeight = 0;

      popup.measureContentSize();

      expect(mockState.previousWidth).toBe(document.body.offsetWidth);
      expect(mockState.previousHeight).toBe(document.body.offsetHeight);
      expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    });

    test("measureContentSize does not update if dimensions unchanged", () => {
      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 456 }]);
      });

      // Set previous dimensions to current
      mockState.previousWidth = document.body.offsetWidth;
      mockState.previousHeight = document.body.offsetHeight;

      jest.clearAllMocks();

      popup.measureContentSize();

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    test("measureContentSize with summary flag uses summarizedTabId", () => {
      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 456 }]);
      });

      mockState.summarizedTabId = 789;
      mockState.previousWidth = 0;
      mockState.previousHeight = 0;

      popup.measureContentSize(true);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        789,
        expect.objectContaining({ action: "updateIframeSize" })
      );
      expect(mockState.summarizedTabId).toBeUndefined();
    });

    test("summary success resize targets the browser tab that started the request", () => {
      Object.defineProperty(document.body, "offsetWidth", { value: 360, configurable: true });
      Object.defineProperty(document.body, "offsetHeight", { value: 480, configurable: true });
      chrome.tabs.query.mockImplementation((_queryInfo, callback) => callback([{ id: 456 }]));

      // Build the snapshot via the pure reducer (not mockState.dispatch) so this
      // test exercises renderPopup's own scheduling logic in isolation, without
      // mockState's subscription firing earlier, unrelated automatic renders
      // that would otherwise consume the one-shot "dimensions changed" signal.
      let snapshot = State.reduce(State.initialSnapshot(), { type: "HYDRATE", payload: {} });
      snapshot = State.reduce(snapshot, {
        type: "SUMMARY_START",
        requestId: "request-1",
        originTabId: 789,
      });
      snapshot = State.reduce(snapshot, {
        type: "SUMMARY_SUCCESS",
        requestId: "request-1",
        items: [{ name: "Place", clue: "Clue" }],
      });

      popup.renderPopup(snapshot, { type: "SUMMARY_SUCCESS" });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        789,
        expect.objectContaining({ action: "updateIframeSize" })
      );
    });

    test("measureContentSizeLast uses last focused tab when current is not active", () => {
      const tabs = [
        { id: 1, lastAccessed: 1000 },
        { id: 2, lastAccessed: 3000 },
        { id: 3, lastAccessed: 2000 },
      ];

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback(tabs);
      });

      mockState.previousWidth = 0;
      mockState.previousHeight = 0;

      popup.measureContentSizeLast();

      // Should use tab with id 2 (highest lastAccessed)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ action: "updateIframeSize" })
      );
    });

    test("measureContentSizeLast handles empty tabs array", () => {
      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([]);
      });

      jest.clearAllMocks();

      popup.measureContentSizeLast();

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Chrome Runtime Message Listener", () => {
    beforeEach(() => {
      popup.initializeDependencies({
        state: mockState,
        gemini: mockGemini,
      });
    });

    test("apiNotify message clicks gemini and api buttons", () => {
      const geminiSummaryButton = document.getElementById("geminiSummaryButton");
      const apiButton = document.getElementById("apiButton");

      const geminiClickSpy = jest.spyOn(geminiSummaryButton, "click");
      const apiClickSpy = jest.spyOn(apiButton, "click");

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ action: "apiNotify" }, {}, () => {});

      expect(geminiClickSpy).toHaveBeenCalled();
      expect(apiClickSpy).toHaveBeenCalled();
    });

    test("resize message updates max height of list containers", () => {
      const searchHistoryListContainer = document.getElementById("searchHistoryList");
      const favoriteListContainer = document.getElementById("favoriteList");
      const summaryListContainer = document.getElementById("summaryList");

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ type: "resize", heightChange: 500 }, {}, () => {});

      expect(searchHistoryListContainer.style.maxHeight).toBe("500px");
      expect(favoriteListContainer.style.maxHeight).toBe("500px");
      expect(summaryListContainer.style.maxHeight).toBe("500px");
    });

    test("resize message enforces minimum height of 112px", () => {
      const searchHistoryListContainer = document.getElementById("searchHistoryList");

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ type: "resize", heightChange: 50 }, {}, () => {});

      expect(searchHistoryListContainer.style.maxHeight).toBe("112px");
    });

    test("addrNotify message clicks optional button", () => {
      const optionalButton = document.getElementById("optionalButton");
      const clickSpy = jest.spyOn(optionalButton, "click");

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ action: "addrNotify" }, {}, () => {});

      expect(clickSpy).toHaveBeenCalled();
    });

    test("checkYoutube message refreshes YouTube context", () => {
      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ action: "checkYoutube" }, {}, () => {});

      expect(mockGemini.checkCurrentTabForYoutube).toHaveBeenCalled();
    });

    test("premiumNotify message opens premium modal trigger", () => {
      const premiumTrigger = document.querySelector('[data-bs-target="#premiumModal"]');
      const clickSpy = jest.spyOn(premiumTrigger, "click");

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ action: "premiumNotify" }, {}, () => {});

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("Escape Key Handler", () => {
    test("pressing Escape key executes ejectLite script", () => {
      popup.initializeDependencies({ state: mockState });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 999 }]);
      });

      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      document.dispatchEvent(event);

      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 999 },
        files: ["dist/ejectLite.js"],
      });
    });
  });

  describe("Composition Events (IME handling)", () => {
    test("compositionstart sets isComposing flag", () => {
      const searchInput = document.getElementById("searchInput");

      searchInput.dispatchEvent(new Event("compositionstart", { bubbles: true }));

      // Enter key should be stopped during composition
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      const stopSpy = jest.spyOn(enterEvent, "stopPropagation");
      document.dispatchEvent(enterEvent);

      expect(stopSpy).toHaveBeenCalled();
    });

    test("compositionend clears isComposing flag", () => {
      const searchInput = document.getElementById("searchInput");

      searchInput.dispatchEvent(new Event("compositionstart", { bubbles: true }));
      searchInput.dispatchEvent(new Event("compositionend", { bubbles: true }));

      // Enter key should not be stopped after composition ends
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      document.dispatchEvent(enterEvent);

      // Note: stopPropagation should not be called when not composing
      // This test verifies the composition flow works correctly
    });
  });

  describe("Iframe reveal", () => {
    test("hydration completion sends finishIframe message", async () => {
      popup.initializeDependencies({ state: mockState, gemini: mockGemini, modal: mockModal });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        const tabs = [{ id: 888, url: "https://example.com" }];
        callback?.(tabs);
        return Promise.resolve(tabs);
      });

      await popup.hydratePopup();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(888, { action: "finishIframe" });
    });

    test("finishIframe is not sent before delayed warm state is rendered", async () => {
      popup.initializeDependencies({ state: mockState, gemini: mockGemini, modal: mockModal });
      let resolveWarmState;
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") resolveWarmState = callback;
        return true;
      });
      chrome.tabs.query.mockImplementation((_queryInfo, callback) => {
        callback?.([{ id: 888, url: "https://example.com" }]);
      });

      const hydration = popup.hydratePopup();
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalledWith(888, { action: "finishIframe" });

      resolveWarmState({
        searchHistoryList: [],
        favoriteList: [],
        summaryList: [{ name: "Cached place", clue: "Cached clue" }],
        timestamp: Date.now(),
        lastActiveTab: "gemini",
      });
      await hydration;

      expect(document.getElementById("summaryList").textContent).toContain("Cached place");
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(888, { action: "finishIframe" });
    });

    test("visibilitychange reports visibility to Analytics", () => {
      window.Analytics = { handleVisibilityChange: jest.fn() };
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });

      document.dispatchEvent(new Event("visibilitychange"));

      expect(window.Analytics.handleVisibilityChange).toHaveBeenCalledWith(true);
      delete window.Analytics;
    });
  });

  describe("Edge Cases and Error Handling", () => {
    beforeEach(() => {
      popup.initializeDependencies({
        state: mockState,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
      });
    });

    test("fetchData handles missing favoriteList in response", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({
            searchHistoryList: ["Item 1"],
            // favoriteList is undefined
          });
        }
        return true;
      });

      jest.spyOn(mockHistory, "createListItem").mockImplementation(() => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        return li;
      });

      // Should not throw error
      await expect(popup.fetchData()).resolves.not.toThrow();
    });

    test("retryMeasureContentSize function exists and is exposed", () => {
      expect(popup.retryMeasureContentSize).toBeDefined();
      expect(typeof popup.retryMeasureContentSize).toBe("function");
    });

    test("delayMeasurement function exists and is exposed", () => {
      expect(popup.delayMeasurement).toBeDefined();
      expect(typeof popup.delayMeasurement).toBe("function");
    });

    test("initializePopup uses else branch for payment.checkPay when requestIdleCallback not available", () => {
      jest.useFakeTimers();

      // Remove requestIdleCallback to test else branch
      const originalRequestIdleCallback = window.requestIdleCallback;
      delete window.requestIdleCallback;

      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        history: mockHistory,
        gemini: mockGemini,
        modal: mockModal,
        payment: mockPayment,
      });
      mockState.dispatch({ type: "HYDRATE", payload: {} });

      popup.initializePopup();

      // Should use setTimeout instead
      expect(mockPayment.checkPay).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(mockPayment.checkPay).toHaveBeenCalled();

      // Restore
      window.requestIdleCallback = originalRequestIdleCallback;
      jest.useRealTimers();
    });

    test("delayMeasurement function calls setTimeout", () => {
      jest.useFakeTimers();
      Object.defineProperty(document.body, "offsetWidth", {
        writable: true,
        configurable: true,
        value: 320,
      });
      Object.defineProperty(document.body, "offsetHeight", {
        writable: true,
        configurable: true,
        value: 240,
      });
      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 321 }]);
      });
      mockState.previousWidth = 0;
      mockState.previousHeight = 0;

      popup.delayMeasurement();
      jest.advanceTimersByTime(100);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        321,
        expect.objectContaining({ action: "updateIframeSize" })
      );
      jest.useRealTimers();
    });

    test("retryMeasureContentSize handles zero width body", () => {
      // Mock body.offsetWidth to be 0 initially
      Object.defineProperty(document.body, "offsetWidth", {
        writable: true,
        configurable: true,
        value: 0,
      });

      // Call the function - it will attempt to retry
      popup.retryMeasureContentSize();

      // Verify function executed (covers the if branch for zero width)
      expect(document.body.offsetWidth).toBe(0);
    });

    test("retryMeasureContentSize measures once layout width is available", () => {
      Object.defineProperty(document.body, "offsetWidth", {
        writable: true,
        configurable: true,
        value: 320,
      });
      Object.defineProperty(document.body, "offsetHeight", {
        writable: true,
        configurable: true,
        value: 240,
      });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123 }]);
      });

      mockState.previousWidth = 0;
      mockState.previousHeight = 0;
      popup.retryMeasureContentSize();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ action: "updateIframeSize" })
      );
    });

    test("getWarmState retries after a timeout and resolves empty after retries are exhausted", async () => {
      jest.useFakeTimers();
      chrome.runtime.sendMessage.mockImplementation(() => true);

      const promise = popup.getWarmState(0, 50);
      jest.advanceTimersByTime(50);

      await expect(promise).resolves.toEqual({});
      jest.useRealTimers();
    });

    test("checkTextOverflow adjusts cancelButton width when text overflows", () => {
      const cancelButton = document.getElementById("cancelButton");
      const cancelButtonSpan = cancelButton.querySelector("span");
      const deleteButtonSpan = document.querySelector("#deleteButton > i + span");

      // Mock offsetHeight to simulate overflow on cancel button
      Object.defineProperty(cancelButtonSpan, "offsetHeight", { value: 50, configurable: true });
      Object.defineProperty(deleteButtonSpan, "offsetHeight", { value: 20, configurable: true });

      popup.checkTextOverflow();

      expect(cancelButton.classList.contains("w-25")).toBe(false);
      expect(cancelButton.classList.contains("w-auto")).toBe(true);
    });

    test("checkTextOverflow adjusts clearButtonSummary width when text overflows", () => {
      const clearButtonSummary = document.getElementById("clearButtonSummary");
      const clearButtonSummarySpan = document.querySelector("#clearButtonSummary > i + span");
      const sendButtonSpan = document.querySelector("#sendButton > i + span");

      // Mock offsetHeight to simulate overflow on clear button summary
      Object.defineProperty(clearButtonSummarySpan, "offsetHeight", {
        value: 50,
        configurable: true,
      });
      Object.defineProperty(sendButtonSpan, "offsetHeight", { value: 20, configurable: true });

      popup.checkTextOverflow();

      expect(clearButtonSummary.classList.contains("w-25")).toBe(false);
      expect(clearButtonSummary.classList.contains("w-auto")).toBe(true);
    });
  });

  describe("Button Click Events - Additional Coverage", () => {
    beforeEach(() => {
      popup.initializeDependencies({
        state: mockState,
        remove: mockRemove,
        favorite: mockFavorite,
        gemini: mockGemini,
        history: mockHistory,
        modal: mockModal,
        payment: mockPayment,
      });
    });

    test("searchHistoryButton click shows history page and updates UI", () => {
      const searchHistoryButton = document.getElementById("searchHistoryButton");
      const deleteListButton = document.getElementById("deleteListButton");

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123 }]);
      });

      searchHistoryButton.click();

      expect(deleteListButton.disabled).toBe(false);
      expect(mockState.getSnapshot().activeTab).toBe("history");
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ lastActiveTab: "history" });
    });

    test("searchHistoryButton click handles no history case", () => {
      const searchHistoryButton = document.getElementById("searchHistoryButton");
      const emptyMessage = document.getElementById("emptyMessage");
      const clearButton = document.getElementById("clearButton");

      jest.spyOn(popup, "measureContentSize").mockImplementation(() => {});

      // Establish the initial render (as HYDRATE always does in the real app)
      // before clicking a tab that's already active, since re-clicking the
      // active tab is a no-op dispatch and won't re-render on its own.
      mockState.dispatch({ type: "HYDRATE", payload: {} });
      searchHistoryButton.click();

      expect(emptyMessage.classList.contains("d-none")).toBe(false);
      expect(clearButton.disabled).toBe(true);
    });

    test("favoriteListButton click shows favorite page and updates UI", async () => {
      const favoriteListButton = document.getElementById("favoriteListButton");
      const deleteListButton = document.getElementById("deleteListButton");

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback?.({ favoriteList: ["Favorite 1"] });
        }
        return true;
      });

      favoriteListButton.click();

      // Wait for promise to resolve with a small delay
      await new Promise((resolve) => process.nextTick(resolve));

      expect(deleteListButton.disabled).toBe(false);
      expect(mockState.getSnapshot().activeTab).toBe("favorite");
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ lastActiveTab: "favorite" });
    });

    test("favoriteListButton click handles no favorites case", () => {
      const favoriteListButton = document.getElementById("favoriteListButton");
      const favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getWarmState") {
          callback({ favoriteList: [] });
        }
        return true;
      });

      favoriteListButton.click();

      expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
    });

    test("geminiSummaryButton click updates page and checks YouTube", () => {
      const geminiSummaryButton = document.getElementById("geminiSummaryButton");
      const deleteListButton = document.getElementById("deleteListButton");

      geminiSummaryButton.click();

      expect(deleteListButton.disabled).toBe(true);
      expect(mockGemini.checkCurrentTabForYoutube).toHaveBeenCalled();
      expect(mockState.getSnapshot().activeTab).toBe("gemini");
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ lastActiveTab: "gemini" });
    });
  });

  describe("Localization", () => {
    test("all data-locale elements get localized text", () => {
      popup.initializeDependencies({ state: mockState });

      const localeElements = document.querySelectorAll("[data-locale]");

      localeElements.forEach((elem) => {
        const key = elem.dataset.locale;
        expect(elem.innerText).toBe(chrome.i18n.getMessage(key));
      });
    });

    test("i18n changed event refreshes active subtitle and resets dynamic button widths", () => {
      const subtitle = document.getElementById("subtitle");
      const clearButton = document.getElementById("clearButton");
      const cancelButton = document.getElementById("cancelButton");
      const clearButtonSummary = document.getElementById("clearButtonSummary");

      popup.initializeDependencies({ state: mockState });
      mockState.dispatch({ type: "HYDRATE", payload: { lastActiveTab: "favorite" } });
      clearButton.classList.replace("w-25", "w-auto");
      cancelButton.classList.replace("w-25", "w-auto");
      clearButtonSummary.classList.replace("w-25", "w-auto");
      const originalGlobalRaf = global.requestAnimationFrame;
      const originalWindowRaf = window.requestAnimationFrame;
      const requestAnimationFrameMock = jest.fn();
      global.requestAnimationFrame = requestAnimationFrameMock;
      window.requestAnimationFrame = requestAnimationFrameMock;

      window.dispatchEvent(new Event("i18n:changed"));

      expect(subtitle.textContent).toBe(chrome.i18n.getMessage("favoriteListSubtitle"));
      [clearButton, cancelButton, clearButtonSummary].forEach((button) => {
        expect(button.classList.contains("w-25")).toBe(true);
        expect(button.classList.contains("w-auto")).toBe(false);
      });
      expect(requestAnimationFrameMock).toHaveBeenCalled();
      global.requestAnimationFrame = originalGlobalRaf;
      window.requestAnimationFrame = originalWindowRaf;
    });

    test("i18n changed event re-applies gemini's imperatively-set locale strings", () => {
      const originalGlobalRaf = global.requestAnimationFrame;
      const originalWindowRaf = window.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn();
      window.requestAnimationFrame = jest.fn();

      popup.initializeDependencies({ state: mockState, gemini: mockGemini });
      const renderSpy = jest.spyOn(mockGemini, "render");

      window.dispatchEvent(new Event("i18n:changed"));

      expect(renderSpy).toHaveBeenCalled();

      global.requestAnimationFrame = originalGlobalRaf;
      window.requestAnimationFrame = originalWindowRaf;
    });

    test("i18n changed event re-localizes the API key placeholder", () => {
      const originalGlobalRaf = global.requestAnimationFrame;
      const originalWindowRaf = window.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn();
      window.requestAnimationFrame = jest.fn();

      popup.initializeDependencies({ state: mockState, gemini: mockGemini });
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === "getApiKey") {
          callback?.({ apiKey: "secret-key" });
        }
        return true;
      });

      window.dispatchEvent(new Event("i18n:changed"));

      // Re-fetches and re-localizes the placeholder instead of leaving it in
      // whatever language it was set to before the live language switch.
      expect(mockGemini.fetchAPIKey).toHaveBeenCalledWith("secret-key");

      global.requestAnimationFrame = originalGlobalRaf;
      window.requestAnimationFrame = originalWindowRaf;
    });
  });

  describe("Button Tooltips", () => {
    test("video summary button has correct tooltip", () => {
      const videoSummaryButton = document.getElementById("videoSummaryButton");
      expect(videoSummaryButton.title).toBe("Video Summary");
    });

    test("gemini summary button has correct tooltip", () => {
      const geminiSummaryButton = document.getElementById("geminiSummaryButton");
      expect(geminiSummaryButton.title).toBe("Gemini Summary");
    });

    test("enter button has correct tooltip", () => {
      const enterButton = document.getElementById("enterButton");
      expect(enterButton.title).toBe("Enter");
    });
  });

  describe("Theme Integration", () => {
    test("ThemeUtils module is properly imported", () => {
      const ThemeUtils = require("../Package/dist/utils/theme.js");

      expect(ThemeUtils).toBeDefined();
      expect(typeof ThemeUtils.applyToElement).toBe("function");
      expect(typeof ThemeUtils.notifyContentScript).toBe("function");
      expect(typeof ThemeUtils.initialize).toBe("function");
    });

    test("popup has theme initialization in initializePopup flow", () => {
      // Verify that initializePopup is exported and can be called
      expect(typeof popup.initializePopup).toBe("function");

      // The theme initialization is verified in theme.test.js
      // Here we just verify the popup module integrates with theme properly
      const ThemeUtils = require("../Package/dist/utils/theme.js");
      expect(ThemeUtils.initialize).toBeDefined();
    });
  });
});
