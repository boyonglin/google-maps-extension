/**
 * Jest Unit Tests for DOMUtils (dom.js)
 * Tests for shared DOM manipulation utilities
 */

const DOMUtils = require("../Package/dist/utils/dom.js");
const { mockChromeStorage } = require("./testHelpers");

describe("DOMUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeStorage({ favoriteList: ["Tokyo", "Paris"] });

    global.favorite = {
      updateFavorite: jest.fn(),
    };
  });

  // ============================================================================
  // findClosestListItem Tests
  // ============================================================================

  describe("findClosestListItem", () => {
    test("should return event target when it is an LI element", () => {
      const li = document.createElement("li");
      const event = { target: li };

      const result = DOMUtils.findClosestListItem(event);

      expect(result).toBe(li);
    });

    test("should return parent element when parent is an LI element", () => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      li.appendChild(span);
      const event = { target: span };

      const result = DOMUtils.findClosestListItem(event);

      expect(result).toBe(li);
    });

    test("should return null when neither target nor parent is an LI element", () => {
      const div = document.createElement("div");
      const span = document.createElement("span");
      div.appendChild(span);
      const event = { target: span };

      const result = DOMUtils.findClosestListItem(event);

      expect(result).toBeNull();
    });

    test("should return null when target has no parent", () => {
      const span = document.createElement("span");
      const event = { target: span };

      const result = DOMUtils.findClosestListItem(event);

      expect(result).toBeNull();
    });

    test("should handle deeply nested elements (only checks one level up)", () => {
      const li = document.createElement("li");
      const div = document.createElement("div");
      const span = document.createElement("span");
      li.appendChild(div);
      div.appendChild(span);
      const event = { target: span };

      const result = DOMUtils.findClosestListItem(event);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // animateFavoriteIcon Tests
  // ============================================================================

  describe("animateFavoriteIcon", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("should set the correct class name on the icon", () => {
      const icon = document.createElement("i");
      icon.className = "bi bi-patch-plus-fill";

      DOMUtils.animateFavoriteIcon(icon);

      expect(icon.className).toBe("bi bi-patch-check-fill matched spring-animation");
    });

    test("should remove spring-animation class after 500ms", () => {
      const icon = document.createElement("i");

      DOMUtils.animateFavoriteIcon(icon);

      expect(icon.classList.contains("spring-animation")).toBe(true);

      jest.advanceTimersByTime(500);

      expect(icon.classList.contains("spring-animation")).toBe(false);
      expect(icon.classList.contains("matched")).toBe(true);
      expect(icon.classList.contains("bi-patch-check-fill")).toBe(true);
    });

    test("should not remove other classes after timeout", () => {
      const icon = document.createElement("i");

      DOMUtils.animateFavoriteIcon(icon);
      jest.advanceTimersByTime(500);

      expect(icon.className).toBe("bi bi-patch-check-fill matched");
    });
  });

  // ============================================================================
  // createSelectAllBar Tests
  // ============================================================================

  describe("createSelectAllBar", () => {
    beforeEach(() => {
      chrome.i18n.getMessage = jest.fn((key) => key);
    });

    test("should render an unchecked, non-indeterminate checkbox when nothing is selected", () => {
      const bar = DOMUtils.createSelectAllBar(["A", "B"], new Set());

      const checkbox = bar.querySelector("input.select-all-checkbox");
      expect(checkbox.checked).toBe(false);
      expect(checkbox.indeterminate).toBe(false);
      expect(bar.querySelector("span").textContent).toBe("selectAllBtnText");
    });

    test("should render a checked checkbox when every item is selected", () => {
      const bar = DOMUtils.createSelectAllBar(["A", "B"], new Set(["A", "B"]));

      const checkbox = bar.querySelector("input.select-all-checkbox");
      expect(checkbox.checked).toBe(true);
      expect(checkbox.indeterminate).toBe(false);
    });

    test("should render an indeterminate checkbox when only some items are selected", () => {
      const bar = DOMUtils.createSelectAllBar(["A", "B", "C"], new Set(["A"]));

      const checkbox = bar.querySelector("input.select-all-checkbox");
      expect(checkbox.checked).toBe(false);
      expect(checkbox.indeterminate).toBe(true);
    });

    test("should not be checked or indeterminate for an empty item list", () => {
      const bar = DOMUtils.createSelectAllBar([], new Set());

      const checkbox = bar.querySelector("input.select-all-checkbox");
      expect(checkbox.checked).toBe(false);
      expect(checkbox.indeterminate).toBe(false);
    });
  });

  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe("Module Export", () => {
    test("should export DOMUtils object", () => {
      expect(DOMUtils).toBeDefined();
      expect(typeof DOMUtils).toBe("object");
    });

    test("should have all required methods", () => {
      expect(typeof DOMUtils.findClosestListItem).toBe("function");
      expect(typeof DOMUtils.animateFavoriteIcon).toBe("function");
      expect(typeof DOMUtils.createSelectAllBar).toBe("function");
    });
  });
});
