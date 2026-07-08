/**
 * Lightweight 4-step onboarding for first-time users.
 * Steps:
 *   1) Hints    -> highlights the footer "Tips" button (keyboard shortcuts modal)
 *   2) Favorite -> injects a demo search-history item and highlights its "add favorite" icon
 *   3) API      -> highlights the Gemini summary button (entry to API key setup)
 *   4) Premium  -> highlights the footer "Premium" button (premium features)
 *
 * Persistence: chrome.storage.local key `onboardingDone` (boolean).
 *
 * Steps may declare `setup` / `cleanup` hooks. `setup` runs once when the step
 * first renders; `cleanup` runs when leaving the step (via next or finish) so
 * any temporary DOM (e.g. the demo history item) is reliably removed.
 */
const DEMO_ITEM_CLASS = "onboarding-demo-item";

class Onboarding {
  constructor() {
    this.STORAGE_KEY = "onboardingDone";
    this.steps = [
      {
        targetSelector: '.footer-li[data-bs-target="#tipsModal"]',
        titleKey: "onboardingHintsTitle",
        descKey: "onboardingHintsDesc",
        placement: "top",
      },
      {
        targetSelector: `.${DEMO_ITEM_CLASS} .bi`,
        titleKey: "onboardingFavoriteTitle",
        descKey: "onboardingFavoriteDesc",
        placement: "bottom",
        setup: () => this.injectDemoHistoryItem(),
        cleanup: () => this.removeDemoHistoryItem(),
      },
      {
        targetSelector: "#geminiSummaryButton",
        titleKey: "onboardingApiTitle",
        descKey: "onboardingApiDesc",
        placement: "bottom",
      },
      {
        targetSelector: '.footer-li[data-bs-target="#premiumModal"]',
        titleKey: "onboardingPremiumTitle",
        descKey: "onboardingPremiumDesc",
        placement: "top",
      },
    ];
    this.currentStep = 0;
    this.overlay = null;
    this.spotlight = null;
    this.tooltip = null;
  }

  /**
   * Append a fake search-history list item so the user can see the
   * "add to favorite" affordance even on a fresh install with no history.
   * The item is marked with DEMO_ITEM_CLASS so it can be removed later.
   * Clicks inside the demo item are swallowed (capture phase) and routed to
   * `next()` so the real history click handler never adds it to favorites.
   */
  injectDemoHistoryItem() {
    this.store.dispatch({ type: "ONBOARDING_DEMO_SET", visible: true });
    // Click handling for the demo item lives in history.js (container-level
    // listener), since render() would discard a listener bound here.
  }

  removeDemoHistoryItem() {
    this.store.dispatch({ type: "ONBOARDING_DEMO_SET", visible: false });
  }

  maybeStart() {
    if (!chrome?.storage?.local?.get) return;
    chrome.storage.local.get(this.STORAGE_KEY, (result) => {
      if (result && result[this.STORAGE_KEY]) return;
      // Defer slightly to let the popup paint and i18n apply.
      setTimeout(() => this.start(), 250);
    });
  }

  start() {
    if (this.overlay) return;
    this.currentStep = 0;
    this.buildDOM();
    this.render();
  }

  buildDOM() {
    this.overlay = document.createElement("div");
    this.overlay.id = "onboardingOverlay";
    this.overlay.className = "onboarding-overlay";

    this.spotlight = document.createElement("div");
    this.spotlight.className = "onboarding-spotlight";

    this.tooltip = document.createElement("div");
    this.tooltip.className = "onboarding-tooltip";
    this.tooltip.setAttribute("role", "dialog");
    this.tooltip.setAttribute("aria-live", "polite");

    // Build tooltip structure once; render() only updates text + listeners.
    this.tooltip.innerHTML = `
      <div class="onboarding-tooltip-header">
        <span class="onboarding-tooltip-title"></span>
        <span class="onboarding-tooltip-counter"></span>
      </div>
      <p class="onboarding-tooltip-desc"></p>
      <div class="onboarding-tooltip-actions">
        <button type="button" class="btn btn-link btn-sm onboarding-skip"></button>
        <button type="button" class="btn btn-primary btn-sm onboarding-next"></button>
      </div>
    `;
    this._titleEl = this.tooltip.querySelector(".onboarding-tooltip-title");
    this._counterEl = this.tooltip.querySelector(".onboarding-tooltip-counter");
    this._descEl = this.tooltip.querySelector(".onboarding-tooltip-desc");
    this._skipBtn = this.tooltip.querySelector(".onboarding-skip");
    this._nextBtn = this.tooltip.querySelector(".onboarding-next");
    this._skipBtn.addEventListener("click", () => this.finish());
    this._nextBtn.addEventListener("click", () => this.next());

    this.overlay.appendChild(this.spotlight);
    this.overlay.appendChild(this.tooltip);
    document.body.appendChild(this.overlay);
  }

  render() {
    const step = this.steps[this.currentStep];
    if (!step) {
      this.finish();
      return;
    }

    if (step.setup && !step._setupDone) {
      try {
        step.setup();
      } catch (err) {
        console.error("Onboarding step setup failed:", err);
      }
      step._setupDone = true;
    }

    const target = document.querySelector(step.targetSelector);
    if (!target) {
      this.finish();
      return;
    }

    const rect = target.getBoundingClientRect();
    const top = Math.max(rect.top, 4);
    const left = Math.max(rect.left, 4);
    const width = rect.width;
    const height = rect.height;

    Object.assign(this.spotlight.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    const title = chrome.i18n.getMessage(step.titleKey) || "";
    const desc = chrome.i18n.getMessage(step.descKey) || "";
    const nextLabel =
      this.currentStep === this.steps.length - 1
        ? chrome.i18n.getMessage("onboardingDoneBtn") || "Got it"
        : chrome.i18n.getMessage("onboardingNextBtn") || "Next";
    const skipLabel = chrome.i18n.getMessage("onboardingSkipBtn") || "Skip";
    const counter = `${this.currentStep + 1} / ${this.steps.length}`;

    this._titleEl.textContent = title;
    this._counterEl.textContent = counter;
    this._descEl.textContent = desc;
    this._skipBtn.textContent = skipLabel;
    this._nextBtn.textContent = nextLabel;

    this.positionTooltip(rect, step.placement);
  }

  positionTooltip(targetRect, placement) {
    this.tooltip.style.visibility = "hidden";
    this.tooltip.style.top = "0px";
    this.tooltip.style.left = "0px";

    const ttRect = this.tooltip.getBoundingClientRect();
    const margin = 12;
    const viewportW = document.documentElement.clientWidth;
    const viewportH = document.documentElement.clientHeight;

    let top;
    if (placement === "top") {
      top = targetRect.top - ttRect.height - margin;
      if (top < 8) top = targetRect.bottom + margin; // flip if no room
    } else {
      top = targetRect.bottom + margin;
      if (top + ttRect.height > viewportH - 8) top = targetRect.top - ttRect.height - margin;
    }

    let left = targetRect.left + targetRect.width / 2 - ttRect.width / 2;
    left = Math.max(8, Math.min(left, viewportW - ttRect.width - 8));
    top = Math.max(8, Math.min(top, viewportH - ttRect.height - 8));

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.visibility = "visible";
  }

  next() {
    // Tear down the leaving step (e.g. remove demo history item) before
    // moving forward so transient DOM disappears immediately.
    const leaving = this.steps[this.currentStep];
    if (leaving?.cleanup && leaving._setupDone) {
      try {
        leaving.cleanup();
      } catch (err) {
        console.error("Onboarding step cleanup failed:", err);
      }
      leaving._setupDone = false;
    }

    this.currentStep += 1;
    if (this.currentStep >= this.steps.length) {
      this.finish();
      return;
    }
    this.render();
  }

  finish() {
    // Run cleanup for any step whose setup ran but never got cleaned up.
    this.steps.forEach((s) => {
      if (s._setupDone && s.cleanup) {
        try {
          s.cleanup();
        } catch (err) {
          console.error("Onboarding step cleanup failed:", err);
        }
        s._setupDone = false;
      }
    });

    if (chrome?.storage?.local?.set) {
      chrome.storage.local.set({ [this.STORAGE_KEY]: true });
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.spotlight = null;
    this.tooltip = null;
    this._titleEl = null;
    this._counterEl = null;
    this._descEl = null;
    this._skipBtn = null;
    this._nextBtn = null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Onboarding;
}
