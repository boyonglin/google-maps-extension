/**
 * Lightweight 3-step onboarding for first-time users.
 * Steps:
 *   1) Hints   -> highlights the footer "Tips" button (keyboard shortcuts modal)
 *   2) API     -> highlights the Gemini summary button (entry to API key setup)
 *   3) Premium -> highlights the footer "Premium" button (premium features)
 *
 * Persistence: chrome.storage.local key `onboardingDone` (boolean).
 */
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
   * Start onboarding only if it has not been completed previously.
   */
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

    this.overlay.appendChild(this.spotlight);
    this.overlay.appendChild(this.tooltip);
    document.body.appendChild(this.overlay);
  }

  render() {
    const step = this.steps[this.currentStep];
    const target = step ? document.querySelector(step.targetSelector) : null;
    if (!step || !target) {
      this.finish();
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(rect.top - pad, 4);
    const left = Math.max(rect.left - pad, 4);
    const width = rect.width + pad * 2;
    const height = rect.height + pad * 2;

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
    this.tooltip.querySelector(".onboarding-tooltip-title").textContent = title;
    this.tooltip.querySelector(".onboarding-tooltip-counter").textContent = counter;
    this.tooltip.querySelector(".onboarding-tooltip-desc").textContent = desc;
    this.tooltip.querySelector(".onboarding-skip").textContent = skipLabel;
    this.tooltip.querySelector(".onboarding-next").textContent = nextLabel;

    this.tooltip.querySelector(".onboarding-skip").addEventListener("click", () => this.finish());
    this.tooltip.querySelector(".onboarding-next").addEventListener("click", () => this.next());

    this.positionTooltip(rect, step.placement);
  }

  positionTooltip(targetRect, placement) {
    // Make tooltip measurable
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
    this.currentStep += 1;
    if (this.currentStep >= this.steps.length) {
      this.finish();
      return;
    }
    this.render();
  }

  finish() {
    if (chrome?.storage?.local?.set) {
      chrome.storage.local.set({ [this.STORAGE_KEY]: true });
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.spotlight = null;
    this.tooltip = null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Onboarding;
}
