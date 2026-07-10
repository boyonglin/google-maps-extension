/**
 * Jest Unit Tests for Remove Component (remove.js)
 */

const State = require("../Package/dist/hooks/popupState.js");
global.State = State;
global.state = new State();

// deleteFromFavoriteList writes through favorite's shared queue so it can't
// race a concurrent single-item removal; mirror that get-then-set behavior.
global.favorite = {
  queueFavoriteWrite: jest.fn(
    (computeNext) =>
      new Promise((resolve) => {
        chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
          const latest = Array.isArray(favoriteList) ? favoriteList : [];
          chrome.storage.local.set({ favoriteList: computeNext(latest) }, resolve);
        });
      })
  ),
};

const Remove = require("../Package/dist/components/remove.js");
const { mockChromeStorage, mockI18n } = require("./testHelpers");
const { setupPopupDOM, teardownPopupDOM } = require("./popupDOMFixture");

describe("Remove Component", () => {
  let removeInstance;

  beforeEach(() => {
    setupPopupDOM();

    global.cancelButton = document.getElementById("cancelButton");
    global.deleteButton = document.querySelector("#deleteButton");
    global.deleteListButton = document.getElementById("deleteListButton");
    global.searchHistoryButton = document.getElementById("searchHistoryButton");
    global.favoriteListButton = document.getElementById("favoriteListButton");
    global.geminiSummaryButton = document.getElementById("geminiSummaryButton");
    global.searchButtonGroup = document.getElementById("searchButtonGroup");
    global.exportButtonGroup = document.getElementById("exportButtonGroup");
    global.deleteButtonGroup = document.getElementById("deleteButtonGroup");
    global.geminiButtonGroup = document.getElementById("geminiButtonGroup");
    global.searchHistoryListContainer = document.getElementById("searchHistoryList");
    global.favoriteListContainer = document.getElementById("favoriteList");
    global.clearButton = document.getElementById("clearButton");
    global.exportButton = document.getElementById("exportButton");
    global.emptyMessage = document.getElementById("emptyMessage");
    global.favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");

    global.state = new State();

    jest.clearAllMocks();
    mockI18n();
    mockChromeStorage();

    removeInstance = new Remove();
    global.state.subscribe((snapshot) => removeInstance.render(snapshot));
  });

  afterEach(() => {
    teardownPopupDOM();
  });

  describe("addRemoveListener", () => {
    describe("cancelButton click handler", () => {
      test("should call backToNormal when cancel button is clicked", () => {
        const spy = jest.spyOn(removeInstance, "backToNormal");
        removeInstance.addRemoveListener();

        cancelButton.click();

        expect(spy).toHaveBeenCalled();
      });

      test("should track cancel button clicks via Analytics", () => {
        window.Analytics = { trackFeatureClick: jest.fn() };
        removeInstance.addRemoveListener();

        cancelButton.click();

        expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
          "cancel_delete",
          "cancelButton"
        );
        delete window.Analytics;
      });
    });

    describe("deleteButton click handler", () => {
      beforeEach(() => {
        removeInstance.addRemoveListener();
      });

      test("should call deleteFromHistoryList when deleteMode.source is history", () => {
        const spy = jest.spyOn(removeInstance, "deleteFromHistoryList");
        const backSpy = jest.spyOn(removeInstance, "backToNormal");

        state.dispatch({ type: "DELETE_ENTER", source: "history" });

        deleteButton.click();

        expect(spy).toHaveBeenCalled();
        expect(backSpy).toHaveBeenCalled();
      });

      test("should call deleteFromFavoriteList when deleteMode.source is favorite", () => {
        const spy = jest.spyOn(removeInstance, "deleteFromFavoriteList");
        const backSpy = jest.spyOn(removeInstance, "backToNormal");

        state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

        deleteButton.click();

        expect(spy).toHaveBeenCalled();
        expect(backSpy).toHaveBeenCalled();
      });
    });

    describe("deleteListButton click handler", () => {
      beforeEach(() => {
        removeInstance.addRemoveListener();
      });

      test("should dispatch DELETE_CANCEL if already in delete mode", () => {
        state.dispatch({ type: "DELETE_ENTER", source: "history" });

        deleteListButton.click();

        expect(state.getSnapshot().deleteMode.source).toBeNull();
      });

      test("should enter delete mode for the active tab when clicked", () => {
        state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });

        deleteListButton.click();

        expect(state.getSnapshot().deleteMode.source).toBe("favorite");
      });

      test("should activate delete mode styling when clicked", () => {
        deleteListButton.click();

        expect(deleteListButton.classList.contains("active-button")).toBe(true);
      });

      test("should show delete button group and hide search button group", () => {
        deleteListButton.click();

        expect(searchButtonGroup.classList.contains("d-none")).toBe(true);
        expect(deleteButtonGroup.classList.contains("d-none")).toBe(false);
      });

      test("should disable favoriteListButton when history is the active tab", () => {
        deleteListButton.click();

        expect(favoriteListButton.disabled).toBe(true);
        expect(geminiSummaryButton.disabled).toBe(true);
      });

      test("should disable searchHistoryButton when favorite is the active tab", () => {
        state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });

        deleteListButton.click();

        expect(searchHistoryButton.disabled).toBe(true);
        expect(geminiSummaryButton.disabled).toBe(true);
      });

      test("should toggle a checked item via the container change listener", () => {
        state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });
        deleteListButton.click();

        const li = document.createElement("li");
        li.dataset.itemValue = "Location 1";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "form-check-input";
        li.appendChild(checkbox);
        searchHistoryListContainer.appendChild(li);

        checkbox.dispatchEvent(new Event("change", { bubbles: true }));

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["Location 1"]);
      });

      test("should ignore change events from elements that are not checkboxes", () => {
        deleteListButton.click();

        const li = document.createElement("li");
        li.dataset.itemValue = "Location 1";
        searchHistoryListContainer.appendChild(li);

        li.dispatchEvent(new Event("change", { bubbles: true }));

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual([]);
      });
    });
  });

  describe("deleteFromHistoryList", () => {
    test("should filter selected items out of the store", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2", "Location 3"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 3" });

      removeInstance.deleteFromHistoryList();

      expect(state.getSnapshot().history.items).toEqual(["Location 2"]);
    });

    test("should update chrome storage with filtered list", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });
      mockChromeStorage({ searchHistoryList: ["Location 1", "Location 2"] });

      removeInstance.deleteFromHistoryList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: ["Location 2"],
      });
      expect(state.getSnapshot().history.items).toEqual(["Location 2"]);
    });

    test("should cancel delete mode after deleting", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });

      removeInstance.deleteFromHistoryList();

      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("should reset delete mode when all items deleted", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });

      removeInstance.deleteFromHistoryList();

      expect(state.getSnapshot().history.items).toEqual([]);
      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("should not change remaining items when only some are selected", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });

      removeInstance.deleteFromHistoryList();

      expect(state.getSnapshot().history.items).toEqual(["Location 2"]);
    });

    test("should keep the full list when nothing is selected", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      mockChromeStorage({ searchHistoryList: ["Location 1"] });

      removeInstance.deleteFromHistoryList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: ["Location 1"],
      });
    });

    test("BUG REPRO: must not clobber an item another context wrote to storage after this snapshot was taken", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });
      // Simulates another instance updating storage before onChanged event
      mockChromeStorage({ searchHistoryList: ["Location 1", "Location 2", "Location 3"] });

      removeInstance.deleteFromHistoryList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: ["Location 2", "Location 3"],
      });
    });
  });

  describe("deleteFromFavoriteList", () => {
    test("should update chrome storage with filtered list", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1", "Favorite 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });
      mockChromeStorage({ favoriteList: ["Favorite 1", "Favorite 2"] });

      removeInstance.deleteFromFavoriteList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: ["Favorite 2"] },
        expect.any(Function)
      );
      expect(state.getSnapshot().favorite.items).toEqual(["Favorite 2"]);
    });

    test("should handle items with clue text", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1 @Clue 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1 @Clue 1" });
      mockChromeStorage({ favoriteList: ["Favorite 1 @Clue 1"] });

      removeInstance.deleteFromFavoriteList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: [] },
        expect.any(Function)
      );
    });

    test("should cancel delete mode after deleting", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });

      removeInstance.deleteFromFavoriteList();

      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("should reset delete mode when all items deleted", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });

      removeInstance.deleteFromFavoriteList();

      expect(state.getSnapshot().favorite.items).toEqual([]);
      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("should not change remaining items when only some are selected", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1", "Favorite 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });

      removeInstance.deleteFromFavoriteList();

      expect(state.getSnapshot().favorite.items).toEqual(["Favorite 2"]);
    });

    test("should keep the full list when nothing is selected", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      mockChromeStorage({ favoriteList: ["Favorite 1"] });

      removeInstance.deleteFromFavoriteList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: ["Favorite 1"] },
        expect.any(Function)
      );
    });

    test("BUG REPRO: must not clobber an item another context wrote to storage after this snapshot was taken", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1", "Favorite 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });
      // Simulates another instance updating storage before onChanged event
      mockChromeStorage({ favoriteList: ["Favorite 1", "Favorite 2", "Favorite 3"] });

      removeInstance.deleteFromFavoriteList();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: ["Favorite 2", "Favorite 3"] },
        expect.any(Function)
      );
    });

    test("should serialize bulk delete through favorite's shared write queue", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1", "Favorite 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Favorite 1" });
      mockChromeStorage({ favoriteList: ["Favorite 1", "Favorite 2"] });

      removeInstance.deleteFromFavoriteList();

      expect(favorite.queueFavoriteWrite).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("render", () => {
    test("should toggle active-button on deleteListButton based on deleteMode", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      expect(deleteListButton.classList.contains("active-button")).toBe(true);

      state.dispatch({ type: "DELETE_CANCEL" });
      expect(deleteListButton.classList.contains("active-button")).toBe(false);
    });

    test("keeps the toggle-active-button marker class through the active-button toggle", () => {
      // Verify toggle-active-button class is preserved for proper styling
      expect(deleteListButton.classList.contains("toggle-active-button")).toBe(true);

      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      expect(deleteListButton.classList.contains("toggle-active-button")).toBe(true);

      state.dispatch({ type: "DELETE_CANCEL" });
      expect(deleteListButton.classList.contains("toggle-active-button")).toBe(true);
    });

    test("should show deleteButtonGroup and hide the tab's action group while deleting", () => {
      state.dispatch({ type: "SET_ACTIVE_TAB", tab: "history" });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });

      expect(deleteButtonGroup.classList.contains("d-none")).toBe(false);
      expect(searchButtonGroup.classList.contains("d-none")).toBe(true);
    });

    test("should restore the tab's action group and hide deleteButtonGroup after cancel", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_CANCEL" });

      expect(deleteButtonGroup.classList.contains("d-none")).toBe(true);
      expect(searchButtonGroup.classList.contains("d-none")).toBe(false);
    });

    test("should disable the other tab buttons while deleting, and re-enable after cancel", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      expect(favoriteListButton.disabled).toBe(true);
      expect(geminiSummaryButton.disabled).toBe(true);
      expect(searchHistoryButton.disabled).toBe(false);

      state.dispatch({ type: "DELETE_CANCEL" });
      expect(favoriteListButton.disabled).toBe(false);
      expect(geminiSummaryButton.disabled).toBe(false);
    });

    test("should show the empty delete label when nothing is selected", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });

      expect(chrome.i18n.getMessage).toHaveBeenCalledWith("deleteBtnTextEmpty", undefined);
      expect(deleteButton.classList.contains("disabled")).toBe(true);
    });

    test("should show the count in the delete label once items are selected", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location 1" });

      expect(chrome.i18n.getMessage).toHaveBeenCalledWith("deleteBtnText", "1");
      expect(deleteButton.querySelector("span").textContent).toBe("Delete (1)");
      expect(deleteButton.classList.contains("disabled")).toBe(false);
    });

    test("should hide the gemini button group only while the gemini tab is not active", () => {
      state.dispatch({ type: "SET_ACTIVE_TAB", tab: "gemini" });
      expect(geminiButtonGroup.classList.contains("d-none")).toBe(false);

      state.dispatch({ type: "SET_ACTIVE_TAB", tab: "history" });
      expect(geminiButtonGroup.classList.contains("d-none")).toBe(true);
    });
  });

  describe("backToNormal", () => {
    beforeEach(() => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
    });

    test("should dispatch DELETE_CANCEL", () => {
      removeInstance.backToNormal();

      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("should reset deleteListButton styling via re-render", () => {
      removeInstance.backToNormal();

      expect(deleteListButton.classList.contains("active-button")).toBe(false);
    });

    test("should show search button group again when history was active", () => {
      removeInstance.backToNormal();

      expect(searchButtonGroup.classList.contains("d-none")).toBe(false);
      expect(favoriteListButton.disabled).toBe(false);
      expect(geminiSummaryButton.disabled).toBe(false);
    });

    test("should show export button group again when favorite was active", () => {
      state.dispatch({ type: "DELETE_CANCEL" });
      state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

      removeInstance.backToNormal();

      expect(exportButtonGroup.classList.contains("d-none")).toBe(false);
      expect(searchHistoryButton.disabled).toBe(false);
      expect(geminiSummaryButton.disabled).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    const appendItem = (container, className, itemValue) => {
      const li = document.createElement("li");
      li.className = className;
      li.dataset.itemValue = itemValue;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input d-none";
      li.appendChild(checkbox);
      container.appendChild(li);
      return li;
    };

    test("complete deletion workflow for history items", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["Location 1", "Location 2"] });
      removeInstance.addRemoveListener();

      const li1 = appendItem(searchHistoryListContainer, "history-list", "Location 1");
      appendItem(searchHistoryListContainer, "history-list", "Location 2");

      // Enter delete mode
      searchHistoryButton.classList.add("active-button");
      deleteListButton.click();
      expect(deleteListButton.classList.contains("active-button")).toBe(true);

      // Check "Location 1"
      li1.querySelector("input").dispatchEvent(new Event("change", { bubbles: true }));

      // Delete
      mockChromeStorage({ searchHistoryList: ["Location 1", "Location 2"] });
      deleteButton.click();

      expect(state.getSnapshot().history.items).toEqual(["Location 2"]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: ["Location 2"] });
      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("complete deletion workflow for favorite items", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Favorite 1", "Favorite 2"] });
      state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });
      removeInstance.addRemoveListener();

      const li1 = appendItem(favoriteListContainer, "favorite-list", "Favorite 1");
      appendItem(favoriteListContainer, "favorite-list", "Favorite 2");

      searchHistoryButton.classList.remove("active-button");
      deleteListButton.click();

      li1.querySelector("input").dispatchEvent(new Event("change", { bubbles: true }));

      mockChromeStorage({ favoriteList: ["Favorite 1", "Favorite 2"] });
      deleteButton.click();

      expect(state.getSnapshot().favorite.items).toEqual(["Favorite 2"]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: ["Favorite 2"] },
        expect.any(Function)
      );
    });

    test("cancel deletion workflow", () => {
      removeInstance.addRemoveListener();

      deleteListButton.click();
      expect(state.getSnapshot().deleteMode.source).toBe("history");

      cancelButton.click();
      expect(state.getSnapshot().deleteMode.source).toBeNull();
    });

    test("toggle delete mode on and off", () => {
      removeInstance.addRemoveListener();

      // Turn on
      deleteListButton.click();
      expect(deleteListButton.classList.contains("active-button")).toBe(true);

      // Turn off
      deleteListButton.click();
      expect(deleteListButton.classList.contains("active-button")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("should handle deleting from an empty history list", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "history" });

      expect(() => {
        removeInstance.deleteFromHistoryList();
      }).not.toThrow();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
    });

    test("should handle deleting from an empty favorite list", () => {
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

      expect(() => {
        removeInstance.deleteFromFavoriteList();
      }).not.toThrow();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favoriteList: [] },
        expect.any(Function)
      );
    });

    test("should handle items with special characters in text", () => {
      state.dispatch({ type: "HISTORY_SET", items: ["!@#$%^&*()"] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "!@#$%^&*()" });

      expect(() => {
        removeInstance.deleteFromHistoryList();
      }).not.toThrow();
      expect(state.getSnapshot().history.items).toEqual([]);
    });

    test("should handle items with very long text", () => {
      const longText = "A".repeat(10000);
      state.dispatch({ type: "HISTORY_SET", items: [longText] });
      state.dispatch({ type: "DELETE_ENTER", source: "history" });
      state.dispatch({ type: "DELETE_TOGGLE", value: longText });

      expect(() => {
        removeInstance.deleteFromHistoryList();
      }).not.toThrow();
      expect(state.getSnapshot().history.items).toEqual([]);
    });

    test("should handle favorite items whose clue text contains @ symbols", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location @Clue 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });
      state.dispatch({ type: "DELETE_TOGGLE", value: "Location @Clue 1" });

      expect(() => {
        removeInstance.deleteFromFavoriteList();
      }).not.toThrow();
      expect(state.getSnapshot().favorite.items).toEqual([]);
    });

    test("should handle rapid button clicks", () => {
      removeInstance.addRemoveListener();

      // Rapidly toggle delete mode
      deleteListButton.click(); // On
      deleteListButton.click(); // Off
      deleteListButton.click(); // On again

      expect(deleteListButton.classList.contains("active-button")).toBe(true);
      expect(state.getSnapshot().deleteMode.source).toBe("history");
    });

    test("should ignore change events from elements that are not checkboxes", () => {
      removeInstance.addRemoveListener();
      deleteListButton.click();

      const li = document.createElement("li");
      li.dataset.itemValue = "Location 1";
      searchHistoryListContainer.appendChild(li);
      li.dispatchEvent(new Event("change", { bubbles: true }));

      expect(state.getSnapshot().deleteMode.selectedValues).toEqual([]);
    });
  });
});
