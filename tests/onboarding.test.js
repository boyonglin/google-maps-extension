/**
 * Jest Tests for Onboarding Component (onboarding.js)
 *
 * Covers:
 * - First-time gating via chrome.storage.local.onboardingDone
 * - 4-step flow (Hints -> Favorite -> API -> Premium)
 * - DOM construction (overlay, spotlight, tooltip)
 * - Demo search-history item injection + cleanup
 * - Next / Skip / Finish behaviors and persistence
 * - i18n labels (Next vs Got it on final step)
 * - Tooltip positioning (placement: top/bottom + viewport clamp)
 * - Graceful no-op when target element is missing
 */

const { mockI18n, cleanupDOM } = require("./testHelpers");

const Onboarding = require("../Package/dist/components/onboarding.js");

// Build the DOM that the onboarding targets (mirrors popup.html selectors)
const setupOnboardingDOM = () => {
  document.body.innerHTML = `
    <div id="geminiSummaryButton" style="position:absolute; top:20px; left:30px; width:40px; height:40px;"></div>
    <div id="searchHistoryList"></div>
    <p id="emptyMessage" style="display:block;">No history</p>
    <ul>
      <li class="footer-li" data-bs-toggle="modal" data-bs-target="#tipsModal" style="position:absolute; top:300px; left:50px; width:60px; height:24px;"></li>
      <li class="footer-li" data-bs-toggle="modal" data-bs-target="#premiumModal" style="position:absolute; top:300px; left:130px; width:60px; height:24px;"></li>
    </ul>
  `;
};

// JSDOM does not implement layout — fake getBoundingClientRect using inline style
const stubBoundingRects = () => {
  const elements = document.querySelectorAll("[style]");
  elements.forEach((el) => {
    const style = el.getAttribute("style") || "";
    const top = parseInt(/top:\s*(\d+)/.exec(style)?.[1] ?? "0", 10);
    const left = parseInt(/left:\s*(\d+)/.exec(style)?.[1] ?? "0", 10);
    const width = parseInt(/width:\s*(\d+)/.exec(style)?.[1] ?? "0", 10);
    const height = parseInt(/height:\s*(\d+)/.exec(style)?.[1] ?? "0", 10);
    el.getBoundingClientRect = () => ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON() {},
    });
  });
};

// Force tooltip to a known measured size so positionTooltip math is deterministic
const stubTooltipSize = (instance, width = 200, height = 100) => {
  const original = instance.tooltip.getBoundingClientRect.bind(instance.tooltip);
  instance.tooltip.getBoundingClientRect = () => ({
    top: parseInt(instance.tooltip.style.top || "0", 10),
    left: parseInt(instance.tooltip.style.left || "0", 10),
    width,
    height,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON() {},
  });
  return original;
};

const setDocumentViewport = (width, height) => {
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: height,
  });
};

describe("Onboarding Component", () => {
  let onboarding;

  const expectTourFinished = () => {
    expect(document.getElementById("onboardingOverlay")).toBeNull();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ onboardingDone: true });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    setupOnboardingDOM();
    stubBoundingRects();

    mockI18n({
      onboardingHintsTitle: "Keyboard shortcuts",
      onboardingHintsDesc: "Open Tips to view shortcuts.",
      onboardingFavoriteTitle: "Save places to favorites",
      onboardingFavoriteDesc: "Tap the + icon to save it.",
      onboardingDemoPlace: "Eiffel Tower",
      onboardingApiTitle: "AI place summaries",
      onboardingApiDesc: "Add a Gemini API key.",
      onboardingPremiumTitle: "Premium features",
      onboardingPremiumDesc: "Start your free trial.",
      onboardingNextBtn: "Next",
      onboardingSkipBtn: "Skip",
      onboardingDoneBtn: "Got it",
      plusLabel: "Add to favorites",
    });

    // Default: onboarding NOT done
    chrome.storage.local.get.mockImplementation((key, cb) => cb({}));
    chrome.storage.local.set.mockImplementation((data, cb) => cb && cb());

    onboarding = new Onboarding();
  });

  afterEach(() => {
    jest.useRealTimers();
    cleanupDOM();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Construction
  // ==========================================================================

  describe("constructor", () => {
    test("should expose 4 ordered steps (hints -> favorite -> api -> premium)", () => {
      expect(onboarding.steps).toHaveLength(4);
      expect(onboarding.steps[0].targetSelector).toContain("tipsModal");
      expect(onboarding.steps[1].targetSelector).toBe(".onboarding-demo-item .bi");
      expect(onboarding.steps[2].targetSelector).toBe("#geminiSummaryButton");
      expect(onboarding.steps[3].targetSelector).toContain("premiumModal");
    });

    test("favorite step should declare setup and cleanup hooks", () => {
      expect(typeof onboarding.steps[1].setup).toBe("function");
      expect(typeof onboarding.steps[1].cleanup).toBe("function");
    });

    test("should use onboardingDone storage key", () => {
      expect(onboarding.STORAGE_KEY).toBe("onboardingDone");
    });

    test("should start at step 0 with no DOM nodes", () => {
      expect(onboarding.currentStep).toBe(0);
      expect(onboarding.overlay).toBeNull();
      expect(onboarding.tooltip).toBeNull();
      expect(onboarding.spotlight).toBeNull();
    });
  });

  // ==========================================================================
  // maybeStart: gating via chrome.storage.local
  // ==========================================================================

  describe("maybeStart", () => {
    test("should start tour when onboardingDone is not set", () => {
      chrome.storage.local.get.mockImplementation((key, cb) => cb({}));

      onboarding.maybeStart();
      jest.advanceTimersByTime(300);

      expect(chrome.storage.local.get).toHaveBeenCalledWith("onboardingDone", expect.any(Function));
      expect(document.getElementById("onboardingOverlay")).not.toBeNull();
    });

    test("should NOT start tour when onboardingDone is true", () => {
      chrome.storage.local.get.mockImplementation((key, cb) => cb({ onboardingDone: true }));

      onboarding.maybeStart();
      jest.advanceTimersByTime(1000);

      expect(document.getElementById("onboardingOverlay")).toBeNull();
    });

    test("should be a no-op when chrome.storage is unavailable", () => {
      const original = chrome.storage;
      // @ts-ignore intentional removal
      delete chrome.storage;

      expect(() => onboarding.maybeStart()).not.toThrow();
      expect(document.getElementById("onboardingOverlay")).toBeNull();

      chrome.storage = original;
    });
  });

  // ==========================================================================
  // start: builds DOM and renders first step
  // ==========================================================================

  describe("start", () => {
    test("should build overlay, spotlight and tooltip", () => {
      onboarding.start();

      const overlay = document.getElementById("onboardingOverlay");
      expect(overlay).not.toBeNull();
      expect(overlay.querySelector(".onboarding-spotlight")).not.toBeNull();
      expect(overlay.querySelector(".onboarding-tooltip")).not.toBeNull();
    });

    test("should render localized title/desc/buttons for step 1", () => {
      onboarding.start();

      const tooltip = onboarding.tooltip;
      expect(tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "Keyboard shortcuts"
      );
      expect(tooltip.querySelector(".onboarding-tooltip-desc").textContent).toBe(
        "Open Tips to view shortcuts."
      );
      expect(tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe("1 / 4");
      expect(tooltip.querySelector(".onboarding-skip").textContent).toBe("Skip");
      expect(tooltip.querySelector(".onboarding-next").textContent).toBe("Next");
    });

    test("should be idempotent: calling start twice does not duplicate overlays", () => {
      onboarding.start();
      onboarding.start();

      expect(document.querySelectorAll("#onboardingOverlay")).toHaveLength(1);
    });

    test("should set spotlight position around target", () => {
      onboarding.start();

      const spotlight = onboarding.spotlight;
      // Step 1 target is the tipsModal footer item: top:300, left:50, w:60, h:24
      expect(spotlight.style.top).toBe("300px");
      expect(spotlight.style.left).toBe("50px");
      expect(spotlight.style.width).toBe("60px");
      expect(spotlight.style.height).toBe("24px");
    });
  });

  // ==========================================================================
  // next: progressing through steps
  // ==========================================================================

  describe("next", () => {
    test("should advance to step 2 (Favorite / demo history item)", () => {
      onboarding.start();
      onboarding.next();

      expect(onboarding.currentStep).toBe(1);
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "Save places to favorites"
      );
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe(
        "2 / 4"
      );
    });

    test("should advance to step 3 (API / Gemini button)", () => {
      onboarding.start();
      onboarding.next();
      onboarding.next();

      expect(onboarding.currentStep).toBe(2);
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "AI place summaries"
      );
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe(
        "3 / 4"
      );
    });

    test("should advance to step 4 (Premium) and show 'Got it' button", () => {
      onboarding.start();
      onboarding.next();
      onboarding.next();
      onboarding.next();

      expect(onboarding.currentStep).toBe(3);
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "Premium features"
      );
      expect(onboarding.tooltip.querySelector(".onboarding-next").textContent).toBe("Got it");
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe(
        "4 / 4"
      );
    });

    test("should finish tour after the final step", () => {
      onboarding.start();
      onboarding.next(); // -> 2 (favorite)
      onboarding.next(); // -> 3 (api)
      onboarding.next(); // -> 4 (premium)
      onboarding.next(); // -> finish

      expectTourFinished();
    });

    test("clicking the next button should advance the step", () => {
      onboarding.start();
      onboarding.tooltip.querySelector(".onboarding-next").click();

      expect(onboarding.currentStep).toBe(1);
    });
  });

  // ==========================================================================
  // Favorite step: demo history item injection + cleanup
  // ==========================================================================

  describe("favorite step (demo history item)", () => {
    const advanceToFavoriteStep = () => {
      onboarding.start();
      onboarding.next(); // -> step 2 (favorite)
    };

    test("should inject a demo history item with the favorite icon when entering the step", () => {
      advanceToFavoriteStep();

      const demo = document.querySelector(".onboarding-demo-item");
      expect(demo).not.toBeNull();
      expect(demo.querySelector("span").textContent).toBe("Eiffel Tower");
      expect(demo.querySelector("i.bi-patch-plus-fill")).not.toBeNull();
      // Demo item must be inside the real search history container
      expect(document.getElementById("searchHistoryList").contains(demo)).toBe(true);
    });

    test("should hide the empty-history message while the demo item is shown", () => {
      advanceToFavoriteStep();
      expect(document.getElementById("emptyMessage").style.display).toBe("none");
    });

    test("should remove the demo item when advancing to the next step", () => {
      advanceToFavoriteStep();
      expect(document.querySelector(".onboarding-demo-item")).not.toBeNull();

      onboarding.next();

      expect(document.querySelector(".onboarding-demo-item")).toBeNull();
    });

    test("should restore the empty-history message after cleanup", () => {
      advanceToFavoriteStep();
      onboarding.next();

      expect(document.getElementById("emptyMessage").style.display).toBe("block");
    });

    test("should remove the demo item when the tour is skipped mid-step", () => {
      advanceToFavoriteStep();
      onboarding.finish();

      expect(document.querySelector(".onboarding-demo-item")).toBeNull();
      expect(document.getElementById("emptyMessage").style.display).toBe("block");
    });

    test("clicking the demo favorite icon should advance to the next step without persisting a real favorite", () => {
      advanceToFavoriteStep();
      const icon = document.querySelector(".onboarding-demo-item .bi");

      icon.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

      expect(onboarding.currentStep).toBe(2);
      // Demo item should be cleaned up after leaving the step
      expect(document.querySelector(".onboarding-demo-item")).toBeNull();
      // chrome.storage.set should only ever be called for onboardingDone, never for favoriteList
      const setCalls = chrome.storage.local.set.mock.calls.map((c) => c[0]);
      const favoriteCalls = setCalls.filter((arg) => arg && "favoriteList" in arg);
      expect(favoriteCalls).toHaveLength(0);
    });

    test("should be a no-op when the search history container is missing", () => {
      document.getElementById("searchHistoryList").remove();
      // Should still complete without throwing — the favorite step's target won't
      // be found, so the tour finishes early.
      expect(() => {
        onboarding.start();
        onboarding.next();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // finish / skip
  // ==========================================================================

  describe("finish", () => {
    test("should remove overlay and persist onboardingDone=true", () => {
      onboarding.start();
      onboarding.finish();

      expectTourFinished();
      expect(onboarding.overlay).toBeNull();
      expect(onboarding.tooltip).toBeNull();
    });

    test("clicking Skip should finish the tour", () => {
      onboarding.start();
      onboarding.tooltip.querySelector(".onboarding-skip").click();

      expectTourFinished();
    });

    test("should not throw when storage.set is unavailable", () => {
      onboarding.start();
      const originalSet = chrome.storage.local.set;
      // @ts-ignore intentional removal
      delete chrome.storage.local.set;

      expect(() => onboarding.finish()).not.toThrow();

      chrome.storage.local.set = originalSet;
    });
  });

  // ==========================================================================
  // Missing target -> graceful skip
  // ==========================================================================

  describe("missing target element", () => {
    test("should finish without throwing when target is missing", () => {
      document.body.innerHTML = ""; // wipe targets
      onboarding.start();

      // No tooltip should remain because render() finished early
      expectTourFinished();
    });
  });

  // ==========================================================================
  // Tooltip positioning
  // ==========================================================================

  describe("positionTooltip", () => {
    test("placement 'top' should place tooltip above the target with margin", () => {
      setDocumentViewport(400, 600);

      onboarding.start(); // step 1, placement "top", target top:300
      stubTooltipSize(onboarding, 200, 100);

      const targetRect = document
        .querySelector('.footer-li[data-bs-target="#tipsModal"]')
        .getBoundingClientRect();
      onboarding.positionTooltip(targetRect, "top");

      // expected top = 300 - 100 - 12 = 188
      expect(parseInt(onboarding.tooltip.style.top, 10)).toBe(188);
    });

    test("placement 'top' should flip below target when there is no room above", () => {
      setDocumentViewport(400, 600);

      // Move target to the very top
      const target = document.querySelector('.footer-li[data-bs-target="#tipsModal"]');
      target.getBoundingClientRect = () => ({
        top: 4,
        left: 50,
        width: 60,
        height: 24,
        right: 110,
        bottom: 28,
        x: 50,
        y: 4,
        toJSON() {},
      });

      onboarding.start();
      stubTooltipSize(onboarding, 200, 100);

      onboarding.positionTooltip(target.getBoundingClientRect(), "top");

      // Flipped: top = 28 + 12 = 40
      expect(parseInt(onboarding.tooltip.style.top, 10)).toBe(40);
    });

    test("should clamp tooltip horizontally inside the viewport", () => {
      // Force a narrow viewport via documentElement.clientWidth
      setDocumentViewport(300, 600);

      onboarding.start();
      stubTooltipSize(onboarding, 200, 100);

      // Target far to the right
      const targetRect = {
        top: 100,
        left: 280,
        width: 40,
        height: 40,
        right: 320,
        bottom: 140,
        x: 280,
        y: 100,
        toJSON() {},
      };
      onboarding.positionTooltip(targetRect, "bottom");

      const left = parseInt(onboarding.tooltip.style.left, 10);
      // viewportW(300) - tooltipW(200) - 8 = 92
      expect(left).toBeLessThanOrEqual(92);
      expect(left).toBeGreaterThanOrEqual(8);
    });

    test("should make tooltip visible after positioning", () => {
      onboarding.start();
      expect(onboarding.tooltip.style.visibility).toBe("visible");
    });
  });
});
