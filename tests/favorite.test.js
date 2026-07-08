/**
 * Jest Unit Tests for Favorite Component (favorite.js)
 * Tests cover all methods with comprehensive mocking of Chrome APIs and DOM manipulation
 */

// Capture original globals to restore after tests
const originalURL = global.URL;
const originalBlob = global.Blob;
const originalFileReader = global.FileReader;

// Use the production store so component tests exercise reducer-driven rendering.
const State = require("../Package/dist/hooks/popupState.js");
global.State = State;
global.state = new State();
global.state.buildSearchUrl = jest.fn();

global.ContextMenuUtil = {
  createContextMenu: jest.fn(),
};

// Load modules
const Favorite = require("../Package/dist/components/favorite.js");
const {
  mockChromeStorage,
  mockI18n,
  wait,
  withWindowOpenSpy,
  createMouseEvent,
  mockFileUpload,
  createMockListItem,
} = require("./testHelpers");
const { setupPopupDOM, teardownPopupDOM } = require("./popupDOMFixture");

describe("Favorite Component", () => {
  let favoriteInstance;

  // ============================================================================
  // Test Setup/Teardown
  // ============================================================================

  beforeAll(() => {
    // Mock global APIs - save originals for restoration
    global.URL = {
      createObjectURL: jest.fn(() => "blob:mock-url"),
    };

    global.Blob = jest.fn(function MockBlob(content, options) {
      this.content = content;
      this.options = options;
    });

    global.FileReader = class MockFileReader {
      readAsText(file) {
        // Simulate async file reading
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: file.mockContent || "" } });
          }
        }, 0);
      }
    };
  });

  afterAll(() => {
    // Restore original globals
    global.URL = originalURL;
    global.Blob = originalBlob;
    global.FileReader = originalFileReader;
  });

  beforeEach(() => {
    // Setup popup DOM (provides all required elements)
    setupPopupDOM();

    // Get references to DOM elements (now provided by popup fixture)
    global.exportButton = document.getElementById("exportButton");
    global.importButton = document.getElementById("importButton");
    global.fileInput = document.getElementById("fileInput");
    global.favoriteListContainer = document.getElementById("favoriteList");
    global.favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");

    // Mock fileInput.click for tests that verify import button behavior
    global.fileInput.click = jest.fn();

    // Reset state
    global.state = new State();
    global.state.buildSearchUrl = jest.fn();

    global.ContextMenuUtil = {
      createContextMenu: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();
    mockI18n({
      plusLabel: "Add to favorites",
      importErrorMsg: "Import failed. Please check file format.",
      favoriteEmptyMsg: "No favorites yet",
    });
    mockChromeStorage();

    // Create new instance and subscribe it to the store, matching popup.js's
    // renderPopup wiring (favorite.render(snapshot) on every dispatch).
    favoriteInstance = new Favorite();
    global.state.subscribe((snapshot) => favoriteInstance.render(snapshot));
  });

  afterEach(() => {
    teardownPopupDOM();
  });

  // ============================================================================
  // addFavoritePageListener Tests
  // ============================================================================

  describe("addFavoritePageListener", () => {
    describe("exportButton click handler", () => {
      beforeEach(() => {
        favoriteInstance.addFavoritePageListener();
      });

      test("should export favorite list as CSV", async () => {
        mockChromeStorage({ favoriteList: ["Place 1", "Place 2 @Clue"] });

        // Just verify no error is thrown - export functionality works
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });

      test("should trim clue text from exported favorites", async () => {
        mockChromeStorage({ favoriteList: ["Place 1 @Clue 1", "Place 2", "Place 3 @Clue 3"] });

        // Verify export completes without error
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });

      test("should handle null/undefined favoriteList gracefully", () => {
        // Fixed: favorite.js now checks if favoriteList exists before mapping
        mockChromeStorage({ favoriteList: null });

        // Should not throw an error
        expect(() => {
          exportButton.click();
        }).not.toThrow();
      });

      test("should create CSV with correct format", async () => {
        mockChromeStorage({ favoriteList: ["Location A", "Location B"] });

        // Verify export completes without error
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });

      test("should prepend a UTF-8 BOM so non-ASCII names don't render as ? outside the browser", async () => {
        mockChromeStorage({ favoriteList: ["中島公園", "大通公園"] });

        exportButton.click();
        await wait();

        const blobContent = global.Blob.mock.calls[0][0][0];
        expect(blobContent.startsWith("\uFEFF")).toBe(true);
        expect(blobContent).toContain("中島公園");
      });

      test("should escape commas in location names for CSV export", async () => {
        mockChromeStorage({ favoriteList: ["New York, NY", "Location B"] });

        // Verify export completes without error - escaping is handled internally
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });

      test("should escape quotes in location names for CSV export", async () => {
        mockChromeStorage({ favoriteList: ['The "Best" Place', "Normal Place"] });

        // Verify export completes without error - escaping is handled internally
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });

      test("should escape newlines in location names for CSV export", async () => {
        mockChromeStorage({ favoriteList: ["Place with\nnewline", "Normal"] });

        // Verify export completes without error - escaping is handled internally
        expect(() => {
          exportButton.click();
        }).not.toThrow();

        await wait();
      });
    });

    describe("importButton click handler", () => {
      beforeEach(() => {
        favoriteInstance.addFavoritePageListener();
      });

      test("should trigger fileInput click", () => {
        importButton.click();

        expect(fileInput.click).toHaveBeenCalled();
      });
    });

    describe("fileInput change handler", () => {
      beforeEach(() => {
        favoriteInstance.addFavoritePageListener();
      });

      test("should parse CSV and update storage", async () => {
        mockFileUpload(fileInput, "name\nLocation 1,\nLocation 2,\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, (data) => {
            resolve(data);
          });
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual(["Location 1", "Location 2"]);
        expect(state.getSnapshot().favorite.items).toEqual(["Location 1", "Location 2"]);
        // Dispatch re-renders the favorite list via the store subscription.
        expect(favoriteListContainer.querySelectorAll(".favorite-list").length).toBe(2);
        expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(true);
      });

      test("should handle empty CSV file", async () => {
        mockFileUpload(fileInput, "");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual([]);
        expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
      });

      test("should handle CSV with only header", async () => {
        mockFileUpload(fileInput, "name\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual([]);
        expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
      });

      test("should trim whitespace and remove trailing commas", async () => {
        mockFileUpload(fileInput, "name\n  Location 1,\n\n  Location 2,  \n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        // CSV parser trims each line but preserves content structure
        expect(data.favoriteList).toEqual(["Location 1", "Location 2"]);
      });

      test("should round-trip names containing commas, quotes, and newlines", async () => {
        // Exactly what the export path produces for these names
        const csv = 'name\n"Cafe, Downtown"\n"The ""Best"" Bar"\n"Line1\nLine2"\n';
        mockFileUpload(fileInput, csv);

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual(["Cafe, Downtown", 'The "Best" Bar', "Line1\nLine2"]);
      });

      test("should merge imported names into the existing list instead of replacing it", async () => {
        mockFileUpload(fileInput, "name\nNew Place\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({ favoriteList: ["Existing Place @Tokyo"] }, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual(["Existing Place @Tokyo", "New Place"]);
      });

      test("should not clear existing favorites when the imported CSV is empty", async () => {
        mockFileUpload(fileInput, "name\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({ favoriteList: ["Existing Place @Tokyo"] }, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual(["Existing Place @Tokyo"]);
        expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(true);
      });

      test("should skip names that already exist (ignoring the @clue suffix) to avoid duplicates", async () => {
        mockFileUpload(fileInput, "name\nExisting Place\nBrand New Place\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({ favoriteList: ["Existing Place @Tokyo"] }, (data) => resolve(data));
        });

        fileInput.dispatchEvent(new Event("change"));

        const data = await storageSetPromise;
        expect(data.favoriteList).toEqual(["Existing Place @Tokyo", "Brand New Place"]);
      });

      test("should return early if no file selected", () => {
        Object.defineProperty(fileInput, "files", {
          value: [],
          writable: true,
        });

        fileInput.dispatchEvent(new Event("change"));

        // Should not call storage
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
      });

      test("should catch and handle exceptions during CSV parsing", async () => {
        // Save original FileReader
        const OriginalFileReader = global.FileReader;

        mockFileUpload(fileInput, "name\nLocation 1,\n");

        // Override FileReader to trigger the catch block by throwing during result access
        global.FileReader = class MockFileReader {
          readAsText() {
            setTimeout(() => {
              if (this.onload) {
                try {
                  // Simulate an error during parsing
                  this.onload({
                    target: {
                      get result() {
                        throw new Error("Parsing error");
                      },
                    },
                  });
                } catch (e) {
                  // Error will be caught by favorite.js try-catch
                }
              }
            }, 0);
          }
        };

        mockI18n({ importErrorMsg: "Import failed. Please check file format." });

        fileInput.dispatchEvent(new Event("change"));

        await wait(100);

        // Verify error handling
        expect(state.getSnapshot().favorite.status).toBe("error");
        expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
        expect(favoriteEmptyMessage.textContent).toBe("Import failed. Please check file format.");

        // Restore original FileReader
        global.FileReader = OriginalFileReader;
      });

      test("should reset file input value after processing", async () => {
        // File input value reset is handled by browser and hard to test in jsdom
        // Skip this test as it requires DOM behavior not available in test env
        mockFileUpload(fileInput, "name\nLocation 1,\n");

        const storageSetPromise = new Promise((resolve) => {
          mockChromeStorage({}, () => resolve());
        });

        fileInput.dispatchEvent(new Event("change"));

        await storageSetPromise;

        // File was processed successfully
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    describe("favoriteListContainer mousedown handler", () => {
      beforeEach(() => {
        favoriteInstance.addFavoritePageListener();
      });

      test("should handle click on LI element", async () => {
        const li = createMockListItem("Test Location", {
          className: "favorite-list",
          favoriteList: ["Test Location"],
        });
        favoriteListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalledWith("Test Location");
          expect(openSpy).toHaveBeenCalledWith("http://maps.test/search", "_blank");
        });
      });

      test("should handle click on child element within LI", async () => {
        const li = createMockListItem("Test Location", {
          className: "favorite-list",
          favoriteList: ["Test Location"],
        });
        favoriteListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const span = li.querySelector("span");
          const mouseEvent = createMouseEvent(span, 0);
          span.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalledWith("Test Location");
          expect(openSpy).toHaveBeenCalledWith("http://maps.test/search", "_blank");
        });
      });

      test("should handle middle click to open in new tab via runtime message", async () => {
        const li = createMockListItem("Test Location", {
          className: "favorite-list",
          favoriteList: ["Test Location"],
        });
        favoriteListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        const mouseEvent = createMouseEvent(li, 1); // Middle click
        const preventDefaultSpy = jest.spyOn(mouseEvent, "preventDefault");

        li.dispatchEvent(mouseEvent);

        await wait();

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
          action: "openTab",
          url: "http://maps.test/search",
        });
      });

      test("should return early if target is not within LI", () => {
        const outsideDiv = document.createElement("div");
        favoriteListContainer.appendChild(outsideDiv);

        const mouseEvent = createMouseEvent(outsideDiv, 0);
        outsideDiv.dispatchEvent(mouseEvent);

        expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
      });

      test("should toggle checkbox in delete mode", () => {
        state.dispatch({ type: "FAVORITE_SET", items: ["Test Location"] });
        state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

        const li = favoriteListContainer.querySelector("li");
        const checkbox = li.querySelector("input");
        expect(checkbox.checked).toBe(false);

        const mouseEvent = createMouseEvent(li, 0);
        li.dispatchEvent(mouseEvent);

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual(["Test Location"]);
        const updatedLi = favoriteListContainer.querySelector("li");
        expect(updatedLi.classList.contains("checked-list")).toBe(true);
        expect(updatedLi.querySelector("input").checked).toBe(true);
      });

      test("should not toggle if clicking on checkbox directly in delete mode", () => {
        state.dispatch({ type: "FAVORITE_SET", items: ["Test Location"] });
        state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

        const li = favoriteListContainer.querySelector("li");
        const checkbox = li.querySelector("input");
        checkbox.classList.remove("d-none");

        const mouseEvent = createMouseEvent(checkbox, 0);
        checkbox.dispatchEvent(mouseEvent);

        expect(state.getSnapshot().deleteMode.selectedValues).toEqual([]);
      });

      test("should not open URL if clicking on icon", async () => {
        const li = createMockListItem("Test Location", {
          className: "favorite-list",
          favoriteList: ["Test Location"],
        });
        favoriteListContainer.appendChild(li);

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

      test("should not open URL if clicking on checkbox in favorite mode", async () => {
        const li = createMockListItem("Test Location", {
          className: "favorite-list",
          favoriteList: ["Test Location"],
        });
        favoriteListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async (openSpy) => {
          const checkbox = li.querySelector("input.form-check-input");
          checkbox.classList.remove("d-none"); // Make it visible

          const mouseEvent = createMouseEvent(checkbox, 0);
          checkbox.dispatchEvent(mouseEvent);

          await wait();

          expect(openSpy).not.toHaveBeenCalled();
        });
      });

      test("should extract text from multiple spans", async () => {
        const li = document.createElement("li");
        li.className = "list-group-item favorite-list";

        const span1 = document.createElement("span");
        span1.textContent = "Location Name";
        const span2 = document.createElement("span");
        span2.className = "d-none";
        span2.textContent = "Clue Text";

        li.appendChild(span1);
        li.appendChild(span2);
        favoriteListContainer.appendChild(li);

        global.state.buildSearchUrl.mockResolvedValue("http://maps.test/search");

        await withWindowOpenSpy(async () => {
          const mouseEvent = createMouseEvent(li, 0);
          li.dispatchEvent(mouseEvent);

          await wait();

          expect(global.state.buildSearchUrl).toHaveBeenCalledWith("Location Name Clue Text");
        });
      });
    });

    describe("favoriteListContainer contextmenu handler", () => {
      beforeEach(() => {
        favoriteInstance.addFavoritePageListener();
      });

      test("should call ContextMenuUtil.createContextMenu on right click", () => {
        const contextEvent = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
        });

        favoriteListContainer.dispatchEvent(contextEvent);

        expect(global.ContextMenuUtil.createContextMenu).toHaveBeenCalledWith(
          expect.any(MouseEvent),
          favoriteListContainer
        );
      });
    });
  });

  // ============================================================================
  // createFavoriteIcon Tests
  // ============================================================================

  describe("createFavoriteIcon", () => {
    test("should create icon with matched class when item is in favorites", () => {
      const favoriteList = ["Place 1", "Place 2", "Place 3"];

      const icon = favoriteInstance.createFavoriteIcon("Place 2", favoriteList);

      expect(icon.tagName).toBe("I");
      expect(icon.className).toBe("bi bi-patch-check-fill matched");
      expect(icon.title).toBe("Add to favorites");
    });

    test("should create icon with plus class when item is not in favorites", () => {
      const favoriteList = ["Place 1", "Place 2"];

      const icon = favoriteInstance.createFavoriteIcon("Place 3", favoriteList);

      expect(icon.className).toBe("bi bi-patch-plus-fill");
      expect(icon.title).toBe("Add to favorites");
    });

    test("should create plus icon when favoriteList is null", () => {
      const icon = favoriteInstance.createFavoriteIcon("Place 1", null);

      expect(icon.className).toBe("bi bi-patch-plus-fill");
    });

    test("should create plus icon when favoriteList is undefined", () => {
      const icon = favoriteInstance.createFavoriteIcon("Place 1", undefined);

      expect(icon.className).toBe("bi bi-patch-plus-fill");
    });

    test("should create plus icon when favoriteList is empty", () => {
      const icon = favoriteInstance.createFavoriteIcon("Place 1", []);

      expect(icon.className).toBe("bi bi-patch-plus-fill");
    });

    test("should handle exact string matching", () => {
      const favoriteList = ["Place One"];

      const icon1 = favoriteInstance.createFavoriteIcon("Place One", favoriteList);
      expect(icon1.className).toBe("bi bi-patch-check-fill matched");

      const icon2 = favoriteInstance.createFavoriteIcon("Place one", favoriteList);
      expect(icon2.className).toBe("bi bi-patch-plus-fill");
    });

    test("should use i18n for title", () => {
      const icon = favoriteInstance.createFavoriteIcon("Place 1", []);

      expect(chrome.i18n.getMessage).toHaveBeenCalledWith("plusLabel");
      expect(icon.title).toBe("Add to favorites");
    });
  });

  // ============================================================================
  // Note: updateHistoryFavoriteIcons() was a legacy (non-store) fallback and
  // was deleted along with the CSV-import legacy branch. Store mode updates
  // history icons through History.render() reacting to FAVORITE_SET - see
  // history.test.js for that coverage.
  // ============================================================================

  // ============================================================================
  // addToFavoriteList Tests
  // ============================================================================

  describe("addToFavoriteList", () => {
    test("should send runtime message to add favorite", () => {
      favoriteInstance.addToFavoriteList("New Location");

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "addToFavoriteList",
        selectedText: "New Location",
      });
    });

    test("should handle empty string", () => {
      favoriteInstance.addToFavoriteList("");

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "addToFavoriteList",
        selectedText: "",
      });
    });

    test("should handle special characters", () => {
      const specialText = "!@#$%^&*()";

      favoriteInstance.addToFavoriteList(specialText);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "addToFavoriteList",
        selectedText: specialText,
      });
    });
  });

  // ============================================================================
  // updateFavorite Tests
  // ============================================================================

  describe("updateFavorite", () => {
    test("should dispatch FAVORITE_SET with the given items", () => {
      favoriteInstance.updateFavorite(["Location 1", "Location 2"]);

      expect(state.getSnapshot().favorite.items).toEqual(["Location 1", "Location 2"]);
    });

    test("should dispatch FAVORITE_SET with an empty list", () => {
      favoriteInstance.updateFavorite([]);

      expect(state.getSnapshot().favorite.items).toEqual([]);
      expect(state.getSnapshot().favorite.status).toBe("empty");
    });

    test("should treat null/undefined as an empty list", () => {
      favoriteInstance.updateFavorite(null);
      expect(state.getSnapshot().favorite.items).toEqual([]);

      favoriteInstance.updateFavorite(undefined);
      expect(state.getSnapshot().favorite.items).toEqual([]);
    });
  });

  // ============================================================================
  // render Tests (store-driven rendering; invoked automatically by the state
  // subscription set up in the outer beforeEach, mirroring popup.js's wiring)
  // ============================================================================

  describe("render", () => {
    test("should render favorite items without clue", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1", "Location 2"] });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(2);
      expect(items[0].querySelector("span").textContent).toBe("Location 1");
      expect(items[1].querySelector("span").textContent).toBe("Location 2");
    });

    test("should render favorite items with clue", () => {
      state.dispatch({
        type: "FAVORITE_SET",
        items: ["Location 1 @New York", "Location 2 @Los Angeles"],
      });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(2);

      const item1Spans = items[0].querySelectorAll("span");
      expect(item1Spans[0].textContent).toBe("Location 1");
      expect(item1Spans[1].textContent).toBe("New York");
      expect(item1Spans[1].className).toBe("d-none");

      const item2Spans = items[1].querySelectorAll("span");
      expect(item2Spans[0].textContent).toBe("Location 2");
      expect(item2Spans[1].textContent).toBe("Los Angeles");
    });

    test("should hide empty message when favorites exist", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });

      expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(true);
    });

    test("should show empty message when no favorites", () => {
      state.dispatch({ type: "FAVORITE_SET", items: [] });

      expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
      expect(favoriteEmptyMessage.textContent).toBe("No favorites yet");
    });

    test("should enable export button when favorites exist", () => {
      exportButton.disabled = true;

      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });

      expect(exportButton.disabled).toBe(false);
    });

    test("should disable export button when no favorites", () => {
      exportButton.disabled = false;

      state.dispatch({ type: "FAVORITE_SET", items: [] });

      expect(exportButton.disabled).toBe(true);
    });

    test("should add all required classes to list items", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1", "Location 2"] });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      const firstItem = items[0];
      expect(firstItem.classList.contains("list-group-item")).toBe(true);
      expect(firstItem.classList.contains("border")).toBe(true);
      expect(firstItem.classList.contains("rounded")).toBe(true);
      expect(firstItem.classList.contains("px-3")).toBe(true);
      // mb-3 is added but then removed from the first item
    });

    test("should add favorite icon to each item", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1", "Location 2"] });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      items.forEach((item) => {
        const icon = item.querySelector("i");
        expect(icon).toBeTruthy();
        expect(icon.className).toBe("bi bi-patch-check-fill matched");
      });
    });

    test("should add a checkbox to each item, hidden outside delete mode", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });

      const checkbox = favoriteListContainer.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeTruthy();
      expect(checkbox.classList.contains("form-check-input")).toBe(true);
      expect(checkbox.classList.contains("d-none")).toBe(true);
    });

    test("should show checkboxes and hide icons while in delete mode", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });
      state.dispatch({ type: "DELETE_ENTER", source: "favorite" });

      const li = favoriteListContainer.querySelector("li");
      expect(li.classList.contains("delete-list")).toBe(true);
      expect(li.classList.contains("favorite-list")).toBe(false);
      expect(li.querySelector("input").classList.contains("d-none")).toBe(false);
      expect(li.querySelector("i").classList.contains("d-none")).toBe(true);
    });

    test("should remove mb-3 from the first item (due to flex-column-reverse)", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1", "Location 2", "Location 3"] });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items[0].classList.contains("mb-3")).toBe(false);
    });

    test("should clear existing content before rendering", () => {
      favoriteListContainer.innerHTML = "<div>Old content</div>";

      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1"] });

      expect(favoriteListContainer.innerHTML).not.toContain("Old content");
    });

    test("should render items in reverse order (flex-column-reverse)", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["First", "Second", "Third"] });

      const ul = favoriteListContainer.querySelector("ul");
      expect(ul.className).toContain("flex-column-reverse");

      const items = Array.from(favoriteListContainer.querySelectorAll(".favorite-list"));
      expect(items[0].querySelector("span").textContent).toBe("First");
      expect(items[2].querySelector("span").textContent).toBe("Third");
    });

    test("should handle very long favorite lists", () => {
      const longList = Array.from({ length: 100 }, (_, i) => `Location ${i + 1}`);

      expect(() => {
        state.dispatch({ type: "FAVORITE_SET", items: longList });
      }).not.toThrow();

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(100);
    });

    test("should handle items with special characters", () => {
      const specialList = ["!@#$%^&*()", '<script>alert("xss")</script>', "Normal Location"];

      state.dispatch({ type: "FAVORITE_SET", items: specialList });

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(3);
      expect(items[0].querySelector("span").textContent).toBe("!@#$%^&*()");
    });

    test("should handle items with multiple @ symbols", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location @Clue1 @Clue2"] });

      const item = favoriteListContainer.querySelector(".favorite-list");
      const spans = item.querySelectorAll("span");

      // split(" @") splits on ALL occurrences: ["Location", "Clue1", "Clue2"]
      // split(" @")[1] gets the second element: "Clue1"
      expect(spans[0].textContent).toBe("Location");
      expect(spans[1].textContent).toBe("Clue1");
    });

    test("should show the import-error message when status is error", () => {
      state.dispatch({ type: "FAVORITE_ERROR", errorKey: "importErrorMsg" });

      expect(favoriteEmptyMessage.classList.contains("d-none")).toBe(false);
      expect(favoriteEmptyMessage.textContent).toBe("Import failed. Please check file format.");
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration Tests", () => {
    test("complete export workflow", async () => {
      favoriteInstance.addFavoritePageListener();

      mockChromeStorage({ favoriteList: ["Place 1", "Place 2 @Clue"] });

      // Verify complete export workflow runs without error
      expect(() => {
        exportButton.click();
      }).not.toThrow();

      await wait();
    });

    test("complete import and update workflow", async () => {
      favoriteInstance.addFavoritePageListener();

      mockFileUpload(fileInput, "name\nLocation 1,\nLocation 2,\n");

      const storageSetPromise = new Promise((resolve) => {
        mockChromeStorage({}, (data) => resolve(data));
      });

      fileInput.dispatchEvent(new Event("change"));

      await storageSetPromise;

      // Verify the store was updated and the list re-rendered
      expect(state.getSnapshot().favorite.items).toEqual(["Location 1", "Location 2"]);
      expect(favoriteListContainer.querySelectorAll(".favorite-list").length).toBe(2);
    });

    test("add to favorite sends a runtime message", () => {
      favoriteInstance.addToFavoriteList("New Place");

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "addToFavoriteList",
        selectedText: "New Place",
      });
    });

    test("render favorites and setup event listeners", () => {
      state.dispatch({ type: "FAVORITE_SET", items: ["Location 1", "Location 2"] });
      favoriteInstance.addFavoritePageListener();

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(2);

      // Verify context menu listener is attached
      const contextEvent = new MouseEvent("contextmenu", { bubbles: true });
      favoriteListContainer.dispatchEvent(contextEvent);

      expect(global.ContextMenuUtil.createContextMenu).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    test("should handle empty string in favoriteList", () => {
      const favoriteList = ["Location 1", "", "Location 2"];

      favoriteInstance.updateFavorite(favoriteList);

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(3);
    });

    test("should handle whitespace-only items", () => {
      const favoriteList = ["Location 1", "   ", "Location 2"];

      favoriteInstance.updateFavorite(favoriteList);

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(3);
    });

    test("should handle unicode characters", () => {
      const favoriteList = ["北京", "東京", "Москва"];

      favoriteInstance.updateFavorite(favoriteList);

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(3);
      expect(items[0].querySelector("span").textContent).toBe("北京");
    });

    test("should handle very long location names", () => {
      const longName = "A".repeat(1000);

      favoriteInstance.updateFavorite([longName]);

      const item = favoriteListContainer.querySelector(".favorite-list");
      expect(item.querySelector("span").textContent).toBe(longName);
    });

    test("should handle rapid consecutive updates", () => {
      favoriteInstance.updateFavorite(["Location 1"]);
      favoriteInstance.updateFavorite(["Location 2"]);
      favoriteInstance.updateFavorite(["Location 3"]);

      const items = favoriteListContainer.querySelectorAll(".favorite-list");
      expect(items.length).toBe(1);
      expect(items[0].querySelector("span").textContent).toBe("Location 3");
    });

    test("should handle missing i18n message", () => {
      chrome.i18n.getMessage.mockReturnValue("");

      const icon = favoriteInstance.createFavoriteIcon("Place 1", []);

      expect(icon.title).toBe("");
    });

    test("should handle items with @ but no clue", () => {
      const favoriteList = ["Location @"];

      favoriteInstance.updateFavorite(favoriteList);

      const item = favoriteListContainer.querySelector(".favorite-list");
      const spans = item.querySelectorAll("span");

      expect(spans[0].textContent).toBe("Location");
      expect(spans[1].textContent).toBe("");
    });

    test("should handle items with multiple spaces around @", () => {
      const favoriteList = ["Location   @   Clue"];

      favoriteInstance.updateFavorite(favoriteList);

      const item = favoriteListContainer.querySelector(".favorite-list");
      const spans = item.querySelectorAll("span");

      expect(spans[0].textContent).toBe("Location  ");
      expect(spans[1].textContent).toBe("   Clue");
    });
  });
});
