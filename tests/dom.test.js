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
      expect(typeof DOMUtils.fadeOutFavoriteIcon).toBe("function");
    });
  });
});
