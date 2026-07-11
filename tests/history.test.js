/**
 * Tests for History Component (history.js)
 */

// Use the production store so component tests exercise reducer-driven rendering.
const State = require("../Package/dist/hooks/popupState.js");
global.State = State;
global.state = new State();
global.state.buildSearchUrl = jest.fn();

global.favorite = {
  createFavoriteIcon: jest.fn(),
  addToFavoriteList: jest.fn(),
  removeFavoriteItem: jest.fn(),
  updateFavorite: jest.fn(),
};

global.ContextMenuUtil = {
  createContextMenu: jest.fn(),
};

// Load modules
const History = require("../Package/dist/components/history.js");
const {
  mockChromeStorage,
  mockI18n,
  wait,
  withWindowOpenSpy,
  createMouseEvent,
  createMockListItem,
  TEST_CONSTANTS,
} = require("./testHelpers");
const { setupPopupDOM, teardownPopupDOM } = require("./popupDOMFixture");

describe("History Component", () => {
  let historyInstance;

  // Helper Functions

  // Create mock history list item for edge case testing
  const createMockHistoryItem = (text, favoriteList = [], isChecked = false) => {
    return createMockListItem(text, {
      favoriteList,
      isChecked,
      className: "history-list",
    });
  };

  // Test Setup/Teardown

  beforeEach(() => {
    setupPopupDOM();

    global.searchHistoryListContainer = document.getElementById("searchHistoryList");
    global.clearButton = document.getElementById("clearButton");
    global.undoButtonHistory = document.getElementById("undoButtonHistory");
    global.emptyMessage = document.getElementById("emptyMessage");

    global.state = new State();
    global.state.buildSearchUrl = jest.fn();

    global.favorite = {
      createFavoriteIcon: jest.fn((itemName, favoriteList) => {
        const icon = document.createElement("i");
        icon.className = favoriteList?.includes(itemName)
          ? "bi bi-patch-check-fill matched"
          : "bi bi-patch-plus-fill";
        return icon;
      }),
      addToFavoriteList: jest.fn(),
      removeFavoriteItem: jest.fn(),
      updateFavorite: jest.fn(),
    };

    global.ContextMenuUtil = {
      createContextMenu: jest.fn(),
    };

    jest.clearAllMocks();
    mockI18n({
      clearedUpMsg: "All cleared up!\nNothing to see here.",
      historyEmptyMsg: "No history yet",
      plusLabel: "Add to favorites",
    });
    mockChromeStorage();

    // Subscribe new instance to store, matching popup.js wiring
    historyInstance = new History();
    global.state.subscribe((snapshot) => historyInstance.render(snapshot));
  });

  afterEach(() => {
    teardownPopupDOM();
    jest.useRealTimers();
  });

  // addHistoryPageListener Tests

  describe("addHistoryPageListener", () => {
    describe("searchHistoryListContainer mousedown handler", () => {
      beforeEach(() => {
        historyInstance.addHistoryPageListener();
      });

      // Basic Click Handling

      test("should handle left click on LI element to open URL", async () => {
        const li = createMockHistoryItem(TEST_CONSTANTS.LOCATION);
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 0); // Left click
          li.dispatchEvent(mouseEvent);

          await wait();

          // Extracts only span text
          expect(global.state.buildSearchUrl).toHaveBeenCalled();
          const callArg = global.state.buildSearchUrl.mock.calls[0][0];

          expect(callArg).toBe(TEST_CONSTANTS.LOCATION);
          expect(openSpy).toHaveBeenCalledWith(TEST_CONSTANTS.URL, "_blank");
        });
      });

      test("should handle click on child element within LI (span)", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async (openSpy) => {
          const span = li.querySelector("span");
          const mouseEvent = createMouseEvent(span, 0);
          span.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalled();
          expect(openSpy).toHaveBeenCalledWith(TEST_CONSTANTS.URL, "_blank");
        });
      });

      test("should return early if target is not within LI", () => {
        const outsideDiv = document.createElement("div");
        searchHistoryListContainer.appendChild(outsideDiv);

        const mouseEvent = createMouseEvent(outsideDiv, 0);
        outsideDiv.dispatchEvent(mouseEvent);

        expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
      });

      test("should return early if target parent is not within LI", () => {
        const container = document.createElement("div");
        searchHistoryListContainer.appendChild(container);

        const deepChild = document.createElement("span");
        container.appendChild(deepChild);

        const mouseEvent = createMouseEvent(deepChild, 0);
        deepChild.dispatchEvent(mouseEvent);

        expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
      });

      // Middle Click Handling

      test("should handle middle click to open in new tab via runtime message", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        const mouseEvent = createMouseEvent(li, 1); // Middle click
        const preventDefaultSpy = jest.spyOn(mouseEvent, "preventDefault");

        li.dispatchEvent(mouseEvent);

        await wait();

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
          action: "openTab",
          url: TEST_CONSTANTS.URL,
        });
      });

      test("should not call window.open on middle click", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 1); // Middle click
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).not.toHaveBeenCalled();
          expect(chrome.runtime.sendMessage).toHaveBeenCalled();
        });
      });

      // Delete Mode Handling

      test("should toggle checkbox in delete mode when clicking on LI", () => {
        state.dispatch({ type: "HISTORY_SET", items: ["Test Location"] });
        state.dispatch({ type: "DELETE_ENTER", source: "history" });

        const li = searchHistoryListContainer.querySelector("li");
        const checkbox = li.querySelector("input");
        expect(checkbox.checked).toBe(false);

        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["Test Location"]);
        const updatedLi = searchHistoryListContainer.querySelector("li");
        expect(updatedLi.classList.contains("checked-list")).toBe(true);
        expect(updatedLi.querySelector("input").checked).toBe(true);
      });

      test("should toggle off checkbox in delete mode when clicking again", () => {
        state.dispatch({ type: "HISTORY_SET", items: ["Test Location"] });
        state.dispatch({ type: "DELETE_ENTER", source: "history" });
        state.dispatch({ type: "DELETE_TOGGLE", value: "Test Location" });

        const li = searchHistoryListContainer.querySelector("li");
        expect(li.classList.contains("checked-list")).toBe(true);

        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual([]);
        const updatedLi = searchHistoryListContainer.querySelector("li");
        expect(updatedLi.classList.contains("checked-list")).toBe(false);
        expect(updatedLi.querySelector("input").checked).toBe(false);
      });

      test("should return early if clicking checkbox directly in delete mode", () => {
        state.dispatch({ type: "HISTORY_SET", items: ["Test Location"] });
        state.dispatch({ type: "DELETE_ENTER", source: "history" });

        const li = searchHistoryListContainer.querySelector("li");
        const checkbox = li.querySelector("input");
        checkbox.classList.remove("d-none");

        const mouseEvent = createMouseEvent(checkbox, 0);
        checkbox.dispatchEvent(mouseEvent);

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual([]);
      });

      // Favorite Icon Click Handling

      test("should add to favorites when clicking icon with bi class", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");
        mockChromeStorage({ favoriteList: [] });

        const icon = li.querySelector("i");
        icon.classList.add("bi");

        const mouseEvent = createMouseEvent(icon, 0);
        icon.dispatchEvent(mouseEvent);

        await wait();

        expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
        const callArg = global.favorite.addToFavoriteList.mock.calls[0][0];
        expect(callArg).toBe(TEST_CONSTANTS.LOCATION);

        expect(icon.className).toContain("bi-patch-check-fill");
        expect(icon.className).toContain("matched");
        expect(icon.className).toContain("spring-animation");

        // Wait for animation (500ms)
        await wait(500);

        expect(icon.classList.contains("spring-animation")).toBe(false);
      });

      test("should add to favorites without a redundant refreshFavoriteList call", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        const favoriteList = ["Existing Place"];
        mockChromeStorage({ favoriteList });

        const icon = li.querySelector("i");
        icon.classList.add("bi");

        const mouseEvent = createMouseEvent(icon, 0);
        icon.dispatchEvent(mouseEvent);

        await wait();

        expect(global.favorite.addToFavoriteList).toHaveBeenCalledWith("Test Location");
        expect(DOMUtils.refreshFavoriteList).toBeUndefined();
      });

      test("should remove from favorites when clicking an already-matched icon", async () => {
        const li = createMockHistoryItem("Test Location", ["Test Location"]);
        li.dataset.itemValue = "Test Location";
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        const icon = li.querySelector("i");
        expect(icon.className).toContain("matched");

        const mouseEvent = createMouseEvent(icon, 0);
        icon.dispatchEvent(mouseEvent);

        await wait();

        expect(global.favorite.removeFavoriteItem).toHaveBeenCalledWith(
          "Test Location",
          expect.any(MouseEvent)
        );
        expect(global.favorite.addToFavoriteList).not.toHaveBeenCalled();
      });

      test("should fade the icon out immediately, restoring it only after the pointer leaves the icon", () => {
        const li = createMockHistoryItem("Test Location", ["Test Location"]);
        li.dataset.itemValue = "Test Location";
        searchHistoryListContainer.appendChild(li);

        const icon = li.querySelector("i");
        icon.dispatchEvent(createMouseEvent(icon, 0));

        expect(icon.classList.contains("unfavoriting")).toBe(true);
        expect(icon.className).not.toContain("bi-patch-plus-fill");

        icon.dispatchEvent(new Event("mouseleave"));

        expect(icon.className).toBe("bi bi-patch-plus-fill");
      });

      test("should not remove a favorite when right- or middle-clicking a matched icon", () => {
        const li = createMockHistoryItem("Test Location", ["Test Location"]);
        li.dataset.itemValue = "Test Location";
        searchHistoryListContainer.appendChild(li);

        const icon = li.querySelector("i");
        icon.dispatchEvent(createMouseEvent(icon, 2));
        icon.dispatchEvent(createMouseEvent(icon, 1));

        expect(global.favorite.removeFavoriteItem).not.toHaveBeenCalled();
      });

      test("should not open URL when clicking an already-matched icon", async () => {
        const li = createMockHistoryItem("Test Location", ["Test Location"]);
        li.dataset.itemValue = "Test Location";
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const icon = li.querySelector("i");

          const mouseEvent = createMouseEvent(icon, 0);
          icon.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).not.toHaveBeenCalled();
        });
      });

      test("should not open URL when clicking favorite icon", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const icon = li.querySelector("i");
          icon.classList.add("bi");

          const mouseEvent = createMouseEvent(icon, 0);
          icon.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).not.toHaveBeenCalled();
        });
      });

      // Checkbox Click in Non-Delete Mode

      test("should return early if clicking checkbox in normal mode", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const checkbox = li.querySelector("input.form-check-input");

          const mouseEvent = createMouseEvent(checkbox, 0);
          checkbox.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).not.toHaveBeenCalled();
        });
      });

      // Edge Cases and Error Handling

      test("should handle buildSearchUrl returning undefined", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(undefined);

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).toHaveBeenCalledWith(undefined, "_blank");
        });
      });

      test("should handle buildSearchUrl promise rejection", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

        global.state.buildSearchUrl.mockRejectedValue(new Error("Network error"));

        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        await wait();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to build search URL:",
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      test("should handle very long location names", async () => {
        const li = createMockHistoryItem(TEST_CONSTANTS.LONG_TEXT);
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalled();
          expect(openSpy).toHaveBeenCalled();
        });
      });

      test("should handle special characters in location names", async () => {
        const li = createMockHistoryItem(TEST_CONSTANTS.SPECIAL_CHARS);
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async () => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalled();
        });
      });

      test("should handle unicode characters in location names", async () => {
        const li = createMockHistoryItem(TEST_CONSTANTS.UNICODE);
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        await withWindowOpenSpy(async () => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalled();
        });
      });

      test("should handle whitespace-only location names", async () => {
        const li = createMockHistoryItem(TEST_CONSTANTS.WHITESPACE);
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);

        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        await wait();

        expect(global.state.buildSearchUrl).toHaveBeenCalled();
      });

      test("should not respond to right click (handled by contextmenu)", async () => {
        const li = createMockHistoryItem("Test Location");
        searchHistoryListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 2); // Right click
          li.dispatchEvent(mouseEvent);

          await wait();

          // Right-click builds URL but doesn't open window
          expect(openSpy).not.toHaveBeenCalled();
        });
      });
    });

    // Context Menu Handler

    describe("searchHistoryListContainer contextmenu handler", () => {
      beforeEach(() => {
        historyInstance.addHistoryPageListener();
      });

      test("should call ContextMenuUtil.createContextMenu on right click", () => {
        const contextEvent = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
        });

        searchHistoryListContainer.dispatchEvent(contextEvent);

        expect(global.ContextMenuUtil.createContextMenu).toHaveBeenCalledWith(
          expect.any(MouseEvent),
          searchHistoryListContainer
        );
      });

      test("should pass correct arguments to createContextMenu", () => {
        const contextEvent = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
        });

        searchHistoryListContainer.dispatchEvent(contextEvent);

        const calls = global.ContextMenuUtil.createContextMenu.mock.calls;
        expect(calls[0][0]).toBeInstanceOf(MouseEvent);
        expect(calls[0][1]).toBe(searchHistoryListContainer);
      });
    });

    // Clear Button Handler

    describe("clearButton click handler", () => {
      beforeEach(() => {
        historyInstance.addHistoryPageListener();
      });

      test("should clear history and update storage", () => {
        state.dispatch({ type: "HISTORY_SET", items: ["Item 1"] });

        clearButton.dispatchEvent(new Event("click"));

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
        expect(clearButton.disabled).toBe(true);
        expect(searchHistoryListContainer.querySelectorAll("li").length).toBe(0);
        expect(emptyMessage.classList.contains("d-none")).toBe(false);
        expect(state.getSnapshot().history.items).toEqual([]);
      });

      test("should update empty message with i18n text", () => {
        clearButton.dispatchEvent(new Event("click"));

        expect(chrome.i18n.getMessage).toHaveBeenCalledWith("clearedUpMsg");
        expect(emptyMessage.textContent).toBe("All cleared up!\nNothing to see here.");
      });

      test("should render newlines as text with pre-line whitespace", () => {
        mockI18n({ clearedUpMsg: "Line 1\nLine 2\nLine 3" });

        clearButton.dispatchEvent(new Event("click"));

        expect(emptyMessage.textContent).toBe("Line 1\nLine 2\nLine 3");
        expect(emptyMessage.style.whiteSpace).toBe("pre-line");
      });

      test("should clear history even when already empty", () => {
        clearButton.dispatchEvent(new Event("click"));

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
        expect(state.getSnapshot().history.items).toEqual([]);
      });

      test("should handle multiple rapid clicks", () => {
        clearButton.dispatchEvent(new Event("click"));
        clearButton.dispatchEvent(new Event("click"));
        clearButton.dispatchEvent(new Event("click"));

        expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
      });

      describe("undo window", () => {
        beforeEach(() => {
          jest.useFakeTimers();
        });

        afterEach(() => {
          jest.useRealTimers();
        });

        test("should swap clearButton for undoButtonHistory when clearing a non-empty history", () => {
          state.dispatch({ type: "HISTORY_SET", items: ["Tokyo", "Paris"] });

          clearButton.dispatchEvent(new Event("click"));

          expect(clearButton.classList.contains("d-none")).toBe(true);
          expect(undoButtonHistory.classList.contains("d-none")).toBe(false);
        });

        test("should not show undoButtonHistory when history was already empty", () => {
          clearButton.dispatchEvent(new Event("click"));

          expect(undoButtonHistory.classList.contains("d-none")).toBe(true);
          expect(clearButton.classList.contains("d-none")).toBe(false);
        });

        test("should restore the history and storage when Undo is clicked", () => {
          state.dispatch({ type: "HISTORY_SET", items: ["Tokyo", "Paris"] });

          clearButton.dispatchEvent(new Event("click"));
          expect(state.getSnapshot().history.items).toEqual([]);

          undoButtonHistory.dispatchEvent(new Event("click"));

          expect(chrome.storage.local.set).toHaveBeenCalledWith({
            searchHistoryList: ["Tokyo", "Paris"],
          });
          expect(state.getSnapshot().history.items).toEqual(["Tokyo", "Paris"]);
          expect(clearButton.classList.contains("d-none")).toBe(false);
          expect(undoButtonHistory.classList.contains("d-none")).toBe(true);
        });

        test("should fall back to the normal empty state after 6 seconds without Undo", () => {
          state.dispatch({ type: "HISTORY_SET", items: ["Tokyo", "Paris"] });

          clearButton.dispatchEvent(new Event("click"));
          jest.advanceTimersByTime(6000);

          expect(clearButton.classList.contains("d-none")).toBe(false);
          expect(clearButton.disabled).toBe(true);
          expect(undoButtonHistory.classList.contains("d-none")).toBe(true);
        });

        test("should not restore stale data once the undo window has lapsed", () => {
          state.dispatch({ type: "HISTORY_SET", items: ["Tokyo", "Paris"] });
          clearButton.dispatchEvent(new Event("click"));
          jest.advanceTimersByTime(6000);
          chrome.storage.local.set.mockClear();

          undoButtonHistory.dispatchEvent(new Event("click"));

          expect(chrome.storage.local.set).not.toHaveBeenCalled();
          expect(state.getSnapshot().history.items).toEqual([]);
        });
      });
    });
  });

  // Onboarding demo item delegation
  // Delegate swallow-clicks behavior on the container to persist across render() re-builds.

  describe("onboarding demo item delegation", () => {
    beforeEach(() => {
      global.onboarding = { next: jest.fn() };
      historyInstance.addHistoryPageListener();
    });

    const appendDemoItem = () => {
      const li = createMockHistoryItem("Eiffel Tower");
      li.classList.add("onboarding-demo-item");
      searchHistoryListContainer.appendChild(li);
      return li;
    };

    test("clicking the demo item's favorite icon advances onboarding instead of adding a favorite", () => {
      const li = appendDemoItem();
      const icon = li.querySelector("i.bi");

      icon.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

      expect(global.onboarding.next).toHaveBeenCalledTimes(1);
      expect(global.favorite.addToFavoriteList).not.toHaveBeenCalled();
      expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
    });

    test("still swallows clicks after render() has rebuilt the list (a brand new <li> node)", () => {
      // Simulate dispatch rebuilding the list
      appendDemoItem().remove();
      const rebuiltLi = appendDemoItem();
      const icon = rebuiltLi.querySelector("i.bi");

      icon.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

      expect(global.onboarding.next).toHaveBeenCalledTimes(1);
      expect(global.favorite.addToFavoriteList).not.toHaveBeenCalled();
    });

    test("clicking the demo item body (not the icon) swallows the click without advancing", () => {
      const li = appendDemoItem();
      const span = li.querySelector("span");

      span.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

      expect(global.onboarding.next).not.toHaveBeenCalled();
      expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
    });

    test("suppresses the context menu on the demo item", () => {
      const li = appendDemoItem();
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });

      li.dispatchEvent(event);

      expect(global.ContextMenuUtil.createContextMenu).not.toHaveBeenCalled();
    });
  });

  // createListItem Tests

  describe("createListItem", () => {
    test("should create list item with correct structure", () => {
      const li = historyInstance.createListItem("Test Location", []);

      expect(li.tagName).toBe("LI");
      expect(li.className).toContain("list-group-item");
      expect(li.className).toContain("history-list");
    });

    test("should create span with item name", () => {
      const li = historyInstance.createListItem("Test Location", []);

      const span = li.querySelector("span");
      expect(span).toBeTruthy();
      expect(span.textContent).toBe("Test Location");
    });

    test("should call favorite.createFavoriteIcon with correct arguments", () => {
      const favoriteList = ["Place 1", "Place 2"];

      historyInstance.createListItem("Test Location", favoriteList);

      expect(global.favorite.createFavoriteIcon).toHaveBeenCalledWith(
        "Test Location",
        favoriteList
      );
    });

    test("should append icon returned from favorite.createFavoriteIcon", () => {
      const mockIcon = document.createElement("i");
      mockIcon.className = "test-icon";
      global.favorite.createFavoriteIcon.mockReturnValue(mockIcon);

      const li = historyInstance.createListItem("Test Location", []);

      const icon = li.querySelector("i.test-icon");
      expect(icon).toBeTruthy();
    });

    test("should create checkbox with correct attributes", () => {
      const li = historyInstance.createListItem("Test Location", []);

      const checkbox = li.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeTruthy();
      expect(checkbox.className).toContain("form-check-input");
      expect(checkbox.className).toContain("d-none");
      expect(checkbox.type).toBe("checkbox");
      expect(checkbox.value).toBe("delete");
      expect(checkbox.name).toBe("checkDelete");
      expect(checkbox.ariaLabel).toBe("Delete");
      expect(checkbox.style.cursor).toBe("pointer");
    });

    test("should append elements in correct order: span, icon, checkbox", () => {
      const li = historyInstance.createListItem("Test Location", []);

      const children = li.children;
      expect(children[0].tagName).toBe("SPAN");
      expect(children[1].tagName).toBe("I");
      expect(children[2].tagName).toBe("INPUT");
    });

    test("should handle null favoriteList", () => {
      expect(() => {
        historyInstance.createListItem("Test Location", null);
      }).not.toThrow();
    });

    test("should handle undefined favoriteList", () => {
      expect(() => {
        historyInstance.createListItem("Test Location", undefined);
      }).not.toThrow();
    });

    test("should handle empty string as item name", () => {
      const li = historyInstance.createListItem("", []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe("");
    });

    test("should handle very long item names", () => {
      const longName = "A".repeat(1000);
      const li = historyInstance.createListItem(longName, []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe(longName);
    });

    test("should handle special characters in item name", () => {
      const specialName = '<script>alert("xss")</script>';
      const li = historyInstance.createListItem(specialName, []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe(specialName);
    });

    test("should handle unicode characters in item name", () => {
      const unicodeName = "北京 東京 Москва 🗺️";
      const li = historyInstance.createListItem(unicodeName, []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe(unicodeName);
    });

    test("should include all required CSS classes", () => {
      const li = historyInstance.createListItem("Test Location", []);

      expect(li.classList.contains("list-group-item")).toBe(true);
      expect(li.classList.contains("border")).toBe(true);
      expect(li.classList.contains("rounded")).toBe(true);
      expect(li.classList.contains("mb-3")).toBe(true);
      expect(li.classList.contains("px-3")).toBe(true);
      expect(li.classList.contains("history-list")).toBe(true);
      expect(li.classList.contains("d-flex")).toBe(true);
      expect(li.classList.contains("justify-content-between")).toBe(true);
      expect(li.classList.contains("align-items-center")).toBe(true);
      expect(li.classList.contains("text-break")).toBe(true);
    });

    test("should create different icons based on favorite status", () => {
      const mockPlusIcon = document.createElement("i");
      mockPlusIcon.className = "bi bi-patch-plus-fill";

      const mockCheckIcon = document.createElement("i");
      mockCheckIcon.className = "bi bi-patch-check-fill matched";

      global.favorite.createFavoriteIcon
        .mockReturnValueOnce(mockPlusIcon)
        .mockReturnValueOnce(mockCheckIcon);

      const li1 = historyInstance.createListItem("Not Favorite", []);
      const li2 = historyInstance.createListItem("Is Favorite", ["Is Favorite"]);

      expect(li1.querySelector("i").className).toContain("patch-plus");
      expect(li2.querySelector("i").className).toContain("patch-check");
    });

    test("should create multiple items independently", () => {
      const li1 = historyInstance.createListItem("Location 1", []);
      const li2 = historyInstance.createListItem("Location 2", []);
      const li3 = historyInstance.createListItem("Location 3", []);

      expect(li1.querySelector("span").textContent).toBe("Location 1");
      expect(li2.querySelector("span").textContent).toBe("Location 2");
      expect(li3.querySelector("span").textContent).toBe("Location 3");
    });

    test("should handle whitespace in item names", () => {
      const li = historyInstance.createListItem("  Test   Location  ", []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe("  Test   Location  ");
    });

    test("should handle newlines in item names", () => {
      const li = historyInstance.createListItem("Line 1\nLine 2", []);

      const span = li.querySelector("span");
      expect(span.textContent).toBe("Line 1\nLine 2");
    });
  });

  // render Tests (store-driven rendering)

  describe("render", () => {
    test("should render history items", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });

      const items = searchHistoryListContainer.querySelectorAll(".history-list");
      expect(items.length).toBe(2);
      expect(items[0].querySelector("span").textContent).toBe("Location 1");
      expect(items[1].querySelector("span").textContent).toBe("Location 2");
    });

    test("should hide empty message when history exists", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });

      expect(emptyMessage.classList.contains("d-none")).toBe(true);
    });

    test("should show empty message when history is empty", () => {
      state.dispatch({ type: "HISTORY_SET", items: [] });

      expect(emptyMessage.classList.contains("d-none")).toBe(false);
      expect(emptyMessage.textContent).toBe("No history yet");
    });

    test("should show the cleared message when emptyReason is cleared", () => {
      state.dispatch({ type: "HISTORY_SET", items: [], emptyReason: "cleared" });

      expect(emptyMessage.textContent).toBe("All cleared up!\nNothing to see here.");
    });

    test("should enable clearButton when history exists", () => {
      clearButton.disabled = true;

      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });

      expect(clearButton.disabled).toBe(false);
    });

    test("should disable clearButton when history is empty", () => {
      clearButton.disabled = false;

      state.dispatch({ type: "HISTORY_SET", items: [] });

      expect(clearButton.disabled).toBe(true);
    });

    test("should reflect favorite status on each item's icon", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });

      expect(global.favorite.createFavoriteIcon).toHaveBeenCalledWith("Location 1", ["Location 1"]);
      expect(global.favorite.createFavoriteIcon).toHaveBeenCalledWith("Location 2", ["Location 1"]);
    });

    test("should show checkboxes and hide icons while in delete mode", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });

      const li = searchHistoryListContainer.querySelector("li");
      expect(li.classList.contains("delete-list")).toBe(true);
      expect(li.classList.contains("history-list")).toBe(false);
      expect(li.querySelector("input").classList.contains("d-none")).toBe(false);
      expect(li.querySelector("i").classList.contains("d-none")).toBe(true);
    });

    test("should remove mb-3 from the first item (due to flex-column-reverse)", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2", "Location 3"] });

      const items = searchHistoryListContainer.querySelectorAll(".history-list");
      expect(items[0].classList.contains("mb-3")).toBe(false);
    });

    test("should clear existing content before rendering", () => {
      searchHistoryListContainer.innerHTML = "<div>Old content</div>";

      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });

      expect(searchHistoryListContainer.innerHTML).not.toContain("Old content");
    });

    test("should render the onboarding demo item when demoHistoryVisible is true", () => {
      state.dispatch({ type: "HISTORY_SET", items: [] });
      state.dispatch({ type: "ONBOARDING_DEMO_SET", visible: true });

      const demoItem = searchHistoryListContainer.querySelector(".onboarding-demo-item");
      expect(demoItem).toBeTruthy();
      // Demo item keeps empty message hidden.
      expect(emptyMessage.classList.contains("d-none")).toBe(true);
    });

    test("should remove the onboarding demo item when demoHistoryVisible is false", () => {
      state.dispatch({ type: "HISTORY_SET", items: [] });
      state.dispatch({ type: "ONBOARDING_DEMO_SET", visible: true });
      state.dispatch({ type: "ONBOARDING_DEMO_SET", visible: false });

      expect(searchHistoryListContainer.querySelector(".onboarding-demo-item")).toBeNull();
      expect(emptyMessage.classList.contains("d-none")).toBe(false);
    });

    test("should not tear down an in-flight spring-animation icon on a favorite-only re-render", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });

      const li = searchHistoryListContainer.querySelector("li");
      const icon = li.querySelector("i");
      icon.classList.add("spring-animation");

      // Simulate popup.js renderPopup for favorite change only
      historyInstance.render(state.getSnapshot(), {
        historyChanged: false,
        deleteModeChanged: false,
        onboardingChanged: false,
      });

      const liAfter = searchHistoryListContainer.querySelector("li");
      expect(liAfter).toBe(li);
      expect(liAfter.querySelector("i")).toBe(icon);
      expect(icon.classList.contains("spring-animation")).toBe(true);
    });

    test("should patch a non-animating icon's favorite className in place on a favorite-only re-render", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });

      const li = searchHistoryListContainer.querySelector("li");
      const iconBefore = li.querySelector("i");
      expect(iconBefore.classList.contains("matched")).toBe(false);

      // Build snapshot for favorite change to test single render() call
      const favoriteSnapshot = {
        ...state.getSnapshot(),
        favorite: { ...state.getSnapshot().favorite, items: ["Location 1"] },
      };
      historyInstance.render(favoriteSnapshot, {
        historyChanged: false,
        deleteModeChanged: false,
        onboardingChanged: false,
      });

      const liAfter = searchHistoryListContainer.querySelector("li");
      expect(liAfter).toBe(li);
      const iconAfter = liAfter.querySelector("i");
      expect(iconAfter).toBe(iconBefore);
      expect(iconAfter.classList.contains("matched")).toBe(true);
    });
  });

  // Integration Tests

  describe("Integration Tests", () => {
    test("complete workflow: create item, add listeners, click to open", async () => {
      const favoriteList = ["Favorite Place"];
      const li = historyInstance.createListItem("Test Location", favoriteList);
      searchHistoryListContainer.appendChild(li);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

      await withWindowOpenSpy(async (openSpy) => {
        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        await wait();

        expect(openSpy).toHaveBeenCalledWith("http://maps.test/search", "_blank");
      });
    });

    test("complete workflow: create item, click favorite icon, verify update", async () => {
      const li = historyInstance.createListItem("Test Location", []);
      searchHistoryListContainer.appendChild(li);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");
      mockChromeStorage({ favoriteList: [] });

      const icon = li.querySelector("i");
      icon.classList.add("bi");

      const mouseEvent = createMouseEvent(icon, 0);
      icon.dispatchEvent(mouseEvent);

      await wait();

      expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
      expect(icon.className).toContain("spring-animation");

      // Wait for animation (500ms)
      await wait(500);

      expect(icon.classList.contains("spring-animation")).toBe(false);
    });

    test("complete workflow: create items, clear all, verify state", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });

      historyInstance.addHistoryPageListener();

      clearButton.click();

      expect(searchHistoryListContainer.querySelectorAll("li").length).toBe(0);
      expect(clearButton.disabled).toBe(true);
      expect(emptyMessage.classList.contains("d-none")).toBe(false);
      expect(state.getSnapshot().history.items).toEqual([]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
    });

    test("complete workflow: toggle delete mode and check items", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });

      historyInstance.addHistoryPageListener();

      const [li1] = searchHistoryListContainer.querySelectorAll("li");
      li1.dispatchEvent(createMouseEvent(li1, 0));

      expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["Location 1"]);
      const [updatedLi1] = searchHistoryListContainer.querySelectorAll("li");
      expect(updatedLi1.classList.contains("checked-list")).toBe(true);
      expect(updatedLi1.querySelector("input").checked).toBe(true);

      const [, li2] = searchHistoryListContainer.querySelectorAll("li");
      li2.dispatchEvent(createMouseEvent(li2, 0));

      expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["Location 1", "Location 2"]);
      const [, updatedLi2] = searchHistoryListContainer.querySelectorAll("li");
      expect(updatedLi2.classList.contains("checked-list")).toBe(true);
      expect(updatedLi2.querySelector("input").checked).toBe(true);
    });

    test("complete workflow: middle click multiple items to open in background tabs", async () => {
      const li1 = historyInstance.createListItem("Location 1", []);
      const li2 = historyInstance.createListItem("Location 2", []);
      const li3 = historyInstance.createListItem("Location 3", []);

      searchHistoryListContainer.appendChild(li1);
      searchHistoryListContainer.appendChild(li2);
      searchHistoryListContainer.appendChild(li3);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl
        .mockResolvedValueOnce("http://maps.test/location1")
        .mockResolvedValueOnce("http://maps.test/location2")
        .mockResolvedValueOnce("http://maps.test/location3");

      const mouseEvent1 = createMouseEvent(li1, 1);
      const mouseEvent2 = createMouseEvent(li2, 1);
      const mouseEvent3 = createMouseEvent(li3, 1);

      li1.dispatchEvent(mouseEvent1);
      li2.dispatchEvent(mouseEvent2);
      li3.dispatchEvent(mouseEvent3);

      await wait();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "openTab",
        url: "http://maps.test/location1",
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "openTab",
        url: "http://maps.test/location2",
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "openTab",
        url: "http://maps.test/location3",
      });
    });

    test("stress test: create many items and verify performance", () => {
      const startTime = Date.now();
      const items = [];

      for (let i = 0; i < 100; i++) {
        const li = historyInstance.createListItem(`Location ${i}`, []);
        items.push(li);
        searchHistoryListContainer.appendChild(li);
      }

      historyInstance.addHistoryPageListener();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
      expect(items.length).toBe(100);
    });
  });

  // Edge Cases and Error Handling

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle empty container when adding listeners", () => {
      expect(() => {
        historyInstance.addHistoryPageListener();
      }).not.toThrow();
    });

    test("should handle multiple listener additions", () => {
      historyInstance.addHistoryPageListener();
      historyInstance.addHistoryPageListener();
      historyInstance.addHistoryPageListener();
      historyInstance.addHistoryPageListener();

      expect(true).toBe(true);
    });

    test("should handle rapid sequential clicks", async () => {
      const li = createMockHistoryItem("Test Location");
      searchHistoryListContainer.appendChild(li);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

      await withWindowOpenSpy(async (openSpy) => {
        const event1 = createMouseEvent(li, 0);
        const event2 = createMouseEvent(li, 0);
        const event3 = createMouseEvent(li, 0);

        li.dispatchEvent(event1);
        li.dispatchEvent(event2);
        li.dispatchEvent(event3);

        await wait();

        expect(openSpy).toHaveBeenCalledTimes(3);
      });
    });

    test("should handle simultaneous favorite and URL operations", async () => {
      const li = createMockHistoryItem("Test Location");
      searchHistoryListContainer.appendChild(li);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");
      mockChromeStorage({ favoriteList: [] });

      const icon = li.querySelector("i");
      icon.classList.add("bi");

      const iconEvent = createMouseEvent(icon, 0);
      icon.dispatchEvent(iconEvent);

      await wait();

      expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
    });

    test("should handle null chrome.i18n.getMessage", () => {
      historyInstance.addHistoryPageListener();
      chrome.i18n.getMessage.mockReturnValue(null);

      expect(() => {
        clearButton.click();
      }).not.toThrow();

      expect(clearButton.disabled).toBe(true);
      expect(emptyMessage.innerHTML).toBe("");
    });

    test("should handle detached DOM elements", () => {
      const li = historyInstance.createListItem("Test Location", []);

      historyInstance.addHistoryPageListener();

      expect(() => {
        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);
      }).not.toThrow();
    });

    test("should handle DOM modifications during event handling", async () => {
      const li = createMockHistoryItem("Test Location");
      searchHistoryListContainer.appendChild(li);

      historyInstance.addHistoryPageListener();

      global.state.buildSearchUrl.mockImplementation(() => {
        searchHistoryListContainer.innerHTML = "";
        return Promise.resolve("http://maps.test/search");
      });

      const mouseEvent = createMouseEvent(li, 0);
      li.dispatchEvent(mouseEvent);

      await wait();

      expect(searchHistoryListContainer.innerHTML).toBe("");
    });
  });

  // Module Export Tests

  describe("Module Export", () => {
    test("should export History class", () => {
      expect(History).toBeDefined();
      expect(typeof History).toBe("function");
    });

    test("should be instantiable", () => {
      const instance = new History();
      expect(instance).toBeInstanceOf(History);
    });

    test("should have all required methods", () => {
      const instance = new History();
      expect(typeof instance.addHistoryPageListener).toBe("function");
      expect(typeof instance.createListItem).toBe("function");
    });

    test("should create independent instances", () => {
      const instance1 = new History();
      const instance2 = new History();

      expect(instance1).not.toBe(instance2);
    });
  });
});
