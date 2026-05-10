/**
 * Jest Tests for Onboarding Component (onboarding.js)
 *
 * Covers:
 * - First-time gating via chrome.storage.local.onboardingDone
 * - 3-step flow (Hints -> API -> Premium)
 * - DOM construction (overlay, spotlight, tooltip)
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

describe("Onboarding Component", () => {
  let onboarding;

  beforeEach(() => {
    jest.useFakeTimers();
    setupOnboardingDOM();
    stubBoundingRects();

    mockI18n({
      onboardingHintsTitle: "Keyboard shortcuts",
      onboardingHintsDesc: "Open Tips to view shortcuts.",
      onboardingApiTitle: "AI place summaries",
      onboardingApiDesc: "Add a Gemini API key.",
      onboardingPremiumTitle: "Premium features",
      onboardingPremiumDesc: "Start your free trial.",
      onboardingNextBtn: "Next",
      onboardingSkipBtn: "Skip",
      onboardingDoneBtn: "Got it",
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
    test("should expose 3 ordered steps (hints -> api -> premium)", () => {
      expect(onboarding.steps).toHaveLength(3);
      expect(onboarding.steps[0].targetSelector).toContain("tipsModal");
      expect(onboarding.steps[1].targetSelector).toBe("#geminiSummaryButton");
      expect(onboarding.steps[2].targetSelector).toContain("premiumModal");
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
      expect(tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe("1 / 3");
      expect(tooltip.querySelector(".onboarding-skip").textContent).toBe("Skip");
      expect(tooltip.querySelector(".onboarding-next").textContent).toBe("Next");
    });

    test("should be idempotent: calling start twice does not duplicate overlays", () => {
      onboarding.start();
      onboarding.start();

      expect(document.querySelectorAll("#onboardingOverlay")).toHaveLength(1);
    });

    test("should set spotlight position around target with padding", () => {
      onboarding.start();

      const spotlight = onboarding.spotlight;
      // Step 1 target is the tipsModal footer item: top:300, left:50, w:60, h:24
      // pad = 6 -> top 294, left 44, w 72, h 36
      expect(spotlight.style.top).toBe("294px");
      expect(spotlight.style.left).toBe("44px");
      expect(spotlight.style.width).toBe("72px");
      expect(spotlight.style.height).toBe("36px");
    });
  });

  // ==========================================================================
  // next: progressing through steps
  // ==========================================================================

  describe("next", () => {
    test("should advance to step 2 (API / Gemini button)", () => {
      onboarding.start();
      onboarding.next();

      expect(onboarding.currentStep).toBe(1);
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "AI place summaries"
      );
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe(
        "2 / 3"
      );
    });

    test("should advance to step 3 (Premium) and show 'Got it' button", () => {
      onboarding.start();
      onboarding.next();
      onboarding.next();

      expect(onboarding.currentStep).toBe(2);
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-title").textContent).toBe(
        "Premium features"
      );
      expect(onboarding.tooltip.querySelector(".onboarding-next").textContent).toBe("Got it");
      expect(onboarding.tooltip.querySelector(".onboarding-tooltip-counter").textContent).toBe(
        "3 / 3"
      );
    });

    test("should finish tour after the final step", () => {
      onboarding.start();
      onboarding.next(); // -> 2
      onboarding.next(); // -> 3
      onboarding.next(); // -> finish

      expect(document.getElementById("onboardingOverlay")).toBeNull();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ onboardingDone: true });
    });

    test("clicking the next button should advance the step", () => {
      onboarding.start();
      onboarding.tooltip.querySelector(".onboarding-next").click();

      expect(onboarding.currentStep).toBe(1);
    });
  });

  // ==========================================================================
  // finish / skip
  // ==========================================================================

  describe("finish", () => {
    test("should remove overlay and persist onboardingDone=true", () => {
      onboarding.start();
      onboarding.finish();

      expect(document.getElementById("onboardingOverlay")).toBeNull();
      expect(onboarding.overlay).toBeNull();
      expect(onboarding.tooltip).toBeNull();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ onboardingDone: true });
    });

    test("clicking Skip should finish the tour", () => {
      onboarding.start();
      onboarding.tooltip.querySelector(".onboarding-skip").click();

      expect(document.getElementById("onboardingOverlay")).toBeNull();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ onboardingDone: true });
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
      expect(document.getElementById("onboardingOverlay")).toBeNull();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ onboardingDone: true });
    });
  });

  // ==========================================================================
  // Tooltip positioning
  // ==========================================================================

  describe("positionTooltip", () => {
    test("placement 'top' should place tooltip above the target with margin", () => {
      Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: 400,
      });
      Object.defineProperty(document.documentElement, "clientHeight", {
        configurable: true,
        value: 600,
      });

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
      Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: 400,
      });
      Object.defineProperty(document.documentElement, "clientHeight", {
        configurable: true,
        value: 600,
      });

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
      Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: 300,
      });
      Object.defineProperty(document.documentElement, "clientHeight", {
        configurable: true,
        value: 600,
      });

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
