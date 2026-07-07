// Page
const historyPanel = document.getElementById("historyPanel");
const favoritePanel = document.getElementById("favoritePanel");
const geminiPanel = document.getElementById("geminiPanel");

// Context
const searchInput = document.getElementById("searchInput");
const apiInput = document.getElementById("apiInput");
const subtitleElement = document.getElementById("subtitle");
const emptyMessage = document.getElementById("emptyMessage");
const favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");
const geminiEmptyMessage = document.getElementById("geminiEmptyMessage");
const dirInput = document.getElementById("dirInput");
const authUserInput = document.getElementById("authUserInput");
const historyMaxInput = document.getElementById("historyMaxInput");
const incognitoToggle = document.getElementById("incognitoToggle");
const darkModeToggle = document.getElementById("darkModeToggle");
const responseField = document.getElementById("response");

// Lists
const searchHistoryListContainer = document.getElementById("searchHistoryList");
const favoriteListContainer = document.getElementById("favoriteList");
const summaryListContainer = document.getElementById("summaryList");
const searchHistoryUl = searchHistoryListContainer.getElementsByTagName("ul");
const favoriteUl = favoriteListContainer.getElementsByTagName("ul");

// Page Buttons
const searchHistoryButton = document.getElementById("searchHistoryButton");
const favoriteListButton = document.getElementById("favoriteListButton");
const deleteListButton = document.getElementById("deleteListButton");
const geminiSummaryButton = document.getElementById("geminiSummaryButton");
const videoSummaryButton = document.getElementById("videoSummaryButton");

// Buttons
const searchButtonGroup = document.getElementById("searchButtonGroup");
const deleteButtonGroup = document.getElementById("deleteButtonGroup");
const exportButtonGroup = document.getElementById("exportButtonGroup");
const geminiButtonGroup = document.getElementById("geminiButtonGroup");
const clearButton = document.getElementById("clearButton");
const cancelButton = document.getElementById("cancelButton");
const deleteButton = document.getElementById("deleteButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("fileInput");
const apiButton = document.getElementById("apiButton");
const sendButton = document.getElementById("sendButton");
const enterButton = document.getElementById("enterButton");
const clearButtonSummary = document.getElementById("clearButtonSummary");
const premiumModal = document.getElementById("premiumModalLabel");
const closeButton = premiumModal.parentElement.querySelector(".btn-close");
const optionalButton = document.getElementById("optionalButton");
const mapsButton = document.getElementById("mapsButton");

// ExtensionPay
const paymentButton = document.getElementById("paymentButton");
const restoreButton = document.getElementById("restoreButton");
const shortcutTip = document.getElementsByClassName("premium-only");
const premiumNoteElement = document.querySelector(`p[data-locale="premiumNote"]`);

// Spans
const clearButtonSpan = document.querySelector("#clearButton > i + span");
const cancelButtonSpan = document.querySelector("#cancelButton > span");
const deleteButtonSpan = document.querySelector("#deleteButton > i + span");
const mapsButtonSpan = document.getElementById("mapsButtonSpan");
const clearButtonSummarySpan = document.querySelector("#clearButtonSummary > i + span");
const sendButtonSpan = document.querySelector("#sendButton > i + span");
const paymentSpan = document.querySelector("#paymentButton > span");

// Import Scripts
let state, remove, favorite, history, gemini, modal, payment, onboarding;
let unsubscribeState = null;
let hydrationPromise = null;
let iframeRevealed = false;

function initializeDependencies(deps = {}) {
  state = deps.state || new State();
  remove = deps.remove || new Remove();
  favorite = deps.favorite || new Favorite();
  history = deps.history || new History();
  gemini = deps.gemini || new Gemini();
  modal = deps.modal || new Modal();
  payment = deps.payment || new Payment();
  onboarding = deps.onboarding || (typeof Onboarding !== "undefined" ? new Onboarding() : null);
  history.favoriteComponent = favorite;
  gemini.favoriteComponent = favorite;
  gemini.store = state;
  // Let Modal delegate directly to the Gemini controller instead of relying
  // solely on the storage.onChanged round-trip to update the API-key UI.
  modal.onApiKeyChange = (apiKey) => gemini.fetchAPIKey(apiKey);
  if (onboarding) onboarding.store = state;

  // renderPopup must be subscribed to whichever `state` is active. Re-running
  // this wires it to a newly-provided state instance instead of leaving a
  // stale subscription on the previous one. Guarded since callers may pass a
  // minimal/mock state object with no subscribe() method.
  if (unsubscribeState) unsubscribeState();
  if (typeof state.subscribe === "function") {
    unsubscribeState = state.subscribe(renderPopup);
  }
  previousPopupSnapshot = null;

  return { state, remove, favorite, history, gemini, modal, payment, onboarding };
}

function initializeTheme() {
  ThemeUtils.initialize(document.documentElement, true, (isDark) => {
    updateDarkModeToggle(isDark);
    ThemeUtils.notifyContentScript(isDark);
  });
}

function applyTheme(isDark) {
  ThemeUtils.applyToElement(document.documentElement, isDark, true);
  updateDarkModeToggle(isDark);
  ThemeUtils.notifyContentScript(isDark);
}

function updateDarkModeToggle(isDark) {
  if (modal && typeof modal.updateDarkModeModal === "function") {
    modal.updateDarkModeModal(isDark);
  }
}

function initializePopup() {
  if (!state) {
    initializeDependencies();
  }

  // Initialize theme first to prevent flash
  initializeTheme();

  if (window.Analytics) window.Analytics.trackExtensionOpened();

  searchInput.focus();

  // Run payment check in background to avoid blocking UI
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      payment.checkPay();
    });
  } else {
    setTimeout(() => payment.checkPay(), 0);
  }

  remove.addRemoveListener();
  favorite.addFavoritePageListener();
  history.addHistoryPageListener();
  gemini.addGeminiPageListener();
  modal.addModalListener();

  requestAnimationFrame(() => {
    hydrationPromise = hydratePopup().then(() => {
      if (onboarding && typeof onboarding.maybeStart === "function") onboarding.maybeStart();
    });
  });

  // Fix: "Blocked aria-hidden..."
  document.addEventListener("hide.bs.modal", function () {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializePopup();
});

document.addEventListener("visibilitychange", () => {
  if (window.Analytics) {
    window.Analytics.handleVisibilityChange(document.visibilityState === "visible");
  }
});

function popupLayout() {
  return hydratePopup();
}

// Check if the text overflows the button since locale
function checkTextOverflow() {
  const mapsButtonHeight = mapsButtonSpan.offsetHeight;
  const clearButtonHeight = clearButtonSpan.offsetHeight;
  const deleteButtonHeight = deleteButtonSpan.offsetHeight;
  const cancelButtonHeight = cancelButtonSpan.offsetHeight;
  const sendButtonHeight = sendButtonSpan.offsetHeight;
  const clearButtonSummaryHeight = clearButtonSummarySpan.offsetHeight;

  if (clearButtonHeight > mapsButtonHeight) {
    clearButton.classList.remove("w-25");
    clearButton.classList.add("w-auto");
  }
  if (cancelButtonHeight > deleteButtonHeight) {
    cancelButton.classList.remove("w-25");
    cancelButton.classList.add("w-auto");
  }
  if (clearButtonSummaryHeight > sendButtonHeight) {
    clearButtonSummary.classList.remove("w-25");
    clearButtonSummary.classList.add("w-auto");
  }
}

async function getWarmState(retries = 3, delay = 200) {
  return new Promise((resolve) => {
    if (!chrome.runtime?.id) {
      resolve({});
      return;
    }

    const maxDelay = 3000;
    const backoffDelay = Math.min(delay * 2, maxDelay);

    const timeout = setTimeout(() => {
      if (retries > 0) {
        resolve(getWarmState(retries - 1, backoffDelay));
      } else {
        resolve({});
      }
    }, delay);

    try {
      chrome.runtime.sendMessage({ action: "getWarmState" }, (state) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          if (retries > 0) {
            resolve(getWarmState(retries - 1, backoffDelay));
          } else {
            resolve({});
          }
        } else {
          resolve(state ?? {});
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      resolve({});
    }
  });
}

async function fetchData() {
  return hydratePopup();
}

async function hydratePopup() {
  // Independent of each other: run together instead of serializing, so the
  // youtube-tab probe doesn't add its own latency on top of getWarmState().
  const [warmState] = await Promise.all([getWarmState(), gemini.checkCurrentTabForYoutube()]);
  const payload = {
    searchHistoryList: warmState.searchHistoryList || [],
    favoriteList: warmState.favoriteList || [],
    summaryList: warmState.summaryList || [],
    timestamp: warmState.timestamp ?? null,
    lastActiveTab: warmState.lastActiveTab,
    geminiApiKey: warmState.geminiApiKey || "",
    videoSummaryToggle: Boolean(warmState.videoSummaryToggle),
    now: Date.now(),
  };

  const hadPersistedSummary = payload.summaryList.length > 0 || payload.timestamp != null;
  const timestamp = Number(payload.timestamp);
  const persistedSummaryIsValid = State.isSummaryFresh(payload.summaryList, timestamp, payload.now);

  state.dispatch({ type: "HYDRATE", payload });

  if (hadPersistedSummary && !persistedSummaryIsValid) {
    chrome.storage.local.remove(["summaryList", "timestamp"]);
  }

  gemini.fetchAPIKey(payload.geminiApiKey);
  modal.updateOptionalModal(
    warmState.startAddr || "",
    warmState.authUser || 0,
    warmState.historyMax || 10
  );
  modal.updateIncognitoModal(Boolean(warmState.isIncognito));
  state.buildMapsButtonUrl();

  checkTextOverflow();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  measureContentSize();
  revealIframe();

  if (window.Analytics) window.Analytics.trackPageView(state.getSnapshot().activeTab);
  return state.getSnapshot();
}

function revealIframe() {
  if (iframeRevealed) return;
  iframeRevealed = true;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: "finishIframe" });
  });
}

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (searchInput.value.trim() === "") {
      event.preventDefault();
    } else {
      if (window.Analytics) window.Analytics.trackSearch();
      chrome.runtime.sendMessage({
        searchTerm: searchInput.value,
        action: "searchInput",
      });
    }
    searchInput.value = "";
    searchInput.blur();
  }
});

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() === "") {
    enterButton.classList.add("d-none");
  } else {
    enterButton.classList.remove("d-none");
  }
});

enterButton.addEventListener("click", () => {
  if (searchInput.value.trim() === "") {
    return;
  } else {
    if (window.Analytics) window.Analytics.trackSearch();
    chrome.runtime.sendMessage({
      searchTerm: searchInput.value,
      action: "searchInput",
    });
    searchInput.value = "";
    enterButton.classList.add("d-none");
  }
});

mapsButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackFeatureClick("open_maps", "mapsButton");
});

// Tracks the last snapshot renderPopup saw, so a dispatch that only touches
// one slice of state (e.g. VIDEO_CONTEXT_REQUEST) doesn't force every
// component to tear down and rebuild its DOM.
let previousPopupSnapshot = null;

function renderPopup(snapshot = state.getSnapshot(), action = null, force = false) {
  const prev = previousPopupSnapshot;
  previousPopupSnapshot = snapshot;
  const first = force || prev === null;

  const ready = snapshot.boot === "ready";
  const tab = snapshot.activeTab;
  const panels = { history: historyPanel, favorite: favoritePanel, gemini: geminiPanel };

  Object.entries(panels).forEach(([name, panel]) => {
    if (panel) panel.classList.toggle("d-none", !ready || name !== tab);
  });

  searchHistoryButton.classList.toggle("active-button", tab === "history");
  favoriteListButton.classList.toggle("active-button", tab === "favorite");
  geminiSummaryButton.classList.toggle("active-button", tab === "gemini");

  const subtitleKeys = {
    history: "searchHistorySubtitle",
    favorite: "favoriteListSubtitle",
    gemini: "geminiSummarySubtitle",
  };
  subtitleElement.textContent = chrome.i18n.getMessage(subtitleKeys[tab]);

  const historyChanged = first || snapshot.history !== prev.history;
  const favoriteChanged = first || snapshot.favorite !== prev.favorite;
  const deleteModeChanged = first || snapshot.deleteMode !== prev.deleteMode;
  const onboardingChanged = first || snapshot.onboarding !== prev.onboarding;
  const summaryChanged = first || snapshot.summary !== prev.summary;
  const apiChanged = first || snapshot.api !== prev.api;
  const videoChanged = first || snapshot.video !== prev.video;
  const activeTabChanged = first || snapshot.activeTab !== prev.activeTab;

  if (historyChanged || deleteModeChanged || favoriteChanged || onboardingChanged) {
    history.render(snapshot);
  }
  if (favoriteChanged || deleteModeChanged) {
    favorite.render(snapshot);
  }
  if (summaryChanged || apiChanged || videoChanged || favoriteChanged) {
    gemini.render(snapshot, { summaryChanged });
  }
  if (deleteModeChanged || activeTabChanged) {
    remove.render(snapshot);
  }

  deleteListButton.disabled = tab === "gemini";
  if (tab !== "gemini") videoSummaryButton.classList.add("d-none");
  scheduleContentMeasurement(
    action?.type === "SUMMARY_SUCCESS" ? snapshot.summary.originTabId : null
  );
}

apiButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackFeatureClick("open_api_modal", "apiButton");
});

optionalButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackFeatureClick("open_settings", "optionalButton");
});

searchHistoryButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackPageView("history");
  chrome.storage.local.set({ lastActiveTab: "history" });
  state.dispatch({ type: "SET_ACTIVE_TAB", tab: "history" });
});

favoriteListButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackPageView("favorite");
  chrome.storage.local.set({ lastActiveTab: "favorite" });
  state.dispatch({ type: "SET_ACTIVE_TAB", tab: "favorite" });
});

geminiSummaryButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackPageView("gemini");
  chrome.storage.local.set({ lastActiveTab: "gemini" });
  state.dispatch({ type: "SET_ACTIVE_TAB", tab: "gemini" });
  gemini.clearExpiredSummary();
  gemini.checkCurrentTabForYoutube();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName && areaName !== "local") return;
  const incognitoChange = changes.isIncognito;

  if (changes.favoriteList) {
    state.dispatch({ type: "FAVORITE_SET", items: changes.favoriteList.newValue || [] });
  }

  if (changes.searchHistoryList) {
    state.dispatch({ type: "HISTORY_SET", items: changes.searchHistoryList.newValue || [] });
  }

  if (changes.summaryList) {
    state.dispatch({
      type: "SUMMARY_STORAGE_SET",
      items: changes.summaryList.newValue || [],
      timestamp: changes.timestamp?.newValue ?? state.getSnapshot().summary.timestamp,
    });
  }

  if (changes.videoSummaryToggle) {
    state.dispatch({ type: "VIDEO_TOGGLE", enabled: changes.videoSummaryToggle.newValue });
  }

  if (changes.geminiApiKey) {
    if (!changes.geminiApiKey.newValue) {
      gemini.fetchAPIKey("");
    } else {
      chrome.runtime.sendMessage({ action: "getApiKey" }, ({ apiKey = "" } = {}) => {
        gemini.fetchAPIKey(apiKey);
      });
    }
  }

  if (incognitoChange) {
    modal.updateIncognitoModal(!!incognitoChange.newValue);
  }

  if (changes.authUser) {
    state.buildMapsButtonUrl();
  }
});

// Exposed on window so modal.js can re-apply i18n after a language change.
function applyI18n(root = document) {
  root.querySelectorAll("[data-locale]").forEach((el) => {
    const v = chrome.i18n.getMessage(el.dataset.locale);
    if (v) el.innerText = v;
  });
  root.querySelectorAll("[data-locale-title]").forEach((el) => {
    const v = chrome.i18n.getMessage(el.dataset.localeTitle);
    if (v) el.title = v;
  });
  root.querySelectorAll("[data-locale-placeholder]").forEach((el) => {
    const v = chrome.i18n.getMessage(el.dataset.localePlaceholder);
    if (v) el.placeholder = v;
  });
  root.querySelectorAll("[data-locale-aria-label]").forEach((el) => {
    const v = chrome.i18n.getMessage(el.dataset.localeAriaLabel);
    if (v) el.setAttribute("aria-label", v);
  });
}
window.applyI18n = applyI18n;
applyI18n();

// Refresh dynamic strings (set imperatively, not via [data-locale])
// after an in-place language swap from the settings modal.
// Tracked on window (not a module-scope const) so re-requiring this script
// (e.g. across Jest tests) replaces the previous listener instead of
// stacking a new one on top of it every time.
if (window.__popupI18nChangedHandler) {
  window.removeEventListener("i18n:changed", window.__popupI18nChangedHandler);
}
window.__popupI18nChangedHandler = () => {
  // force: nothing in the snapshot changed, but every getMessage() result did.
  if (state?.getSnapshot) renderPopup(state.getSnapshot(), null, true);
  // Re-localize the API key placeholder (set imperatively, not via [data-locale]).
  if (gemini) {
    chrome.runtime.sendMessage({ action: "getApiKey" }, ({ apiKey = "" } = {}) => {
      gemini?.fetchAPIKey(apiKey);
    });
  }
  [clearButton, cancelButton, clearButtonSummary].forEach((btn) => {
    btn.classList.remove("w-auto");
    btn.classList.add("w-25");
  });
  // Re-measure after the new strings paint, through the same coalescing
  // scheduler renderPopup uses instead of a raw, uncoordinated rAF.
  requestAnimationFrame(checkTextOverflow);
  scheduleContentMeasurement();
};
window.addEventListener("i18n:changed", window.__popupI18nChangedHandler);

// Handle IME composition for CJK input
let isComposing = false;

searchInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
searchInput.addEventListener("compositionend", () => {
  isComposing = false;
});

document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Enter" && isComposing) {
      e.stopPropagation();
    }
  },
  true
);

// configureElements is consumed by modal.js for the shortcuts click handler.
const configureElements = document.querySelectorAll(".modal-body p");

// Resize utils
const body = document.body;
let measurementFrame = null;
let measurementTargetTabId = null;

function scheduleContentMeasurement(targetTabId = null) {
  if (targetTabId != null) measurementTargetTabId = targetTabId;
  if (measurementFrame != null) cancelAnimationFrame(measurementFrame);
  measurementFrame = requestAnimationFrame(() => {
    measurementFrame = null;
    const target = measurementTargetTabId;
    measurementTargetTabId = null;
    measureContentSize(false, target);
  });
}

function currentDimensions() {
  return {
    width: body.offsetWidth,
    height: body.offsetHeight,
  };
}

function sendUpdateIframeSize(id, width, height) {
  chrome.tabs.sendMessage(id, {
    action: "updateIframeSize",
    width,
    height,
  });
}

// Prevent layout glitch
function delayMeasurement() {
  setTimeout(() => {
    measureContentSize();
  }, 100);
}

function retryMeasureContentSize() {
  if (body.offsetWidth === 0) {
    setTimeout(retryMeasureContentSize, 100);
  } else {
    measureContentSize();
  }
}

function measureContentSize(summary = false, targetTabId = null) {
  const { width: currentWidth, height: currentHeight } = currentDimensions();

  if (currentWidth !== state.previousWidth || currentHeight !== state.previousHeight) {
    state.updateDimensions(currentWidth, currentHeight);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let contentTabId = targetTabId ?? (summary ? state.summarizedTabId : tabs[0]?.id);

      if (contentTabId == null) return;

      sendUpdateIframeSize(contentTabId, currentWidth, currentHeight);

      if (summary) {
        state.summarizedTabId = undefined;
      }
    });
  }
}

function measureContentSizeLast() {
  const { width: currentWidth, height: currentHeight } = currentDimensions();

  if (currentWidth !== state.previousWidth || currentHeight !== state.previousHeight) {
    state.updateDimensions(currentWidth, currentHeight);

    chrome.tabs.query({ active: false, lastFocusedWindow: true }, (tabs) => {
      let LastAccessedTab = tabs[0];

      if (tabs.length === 0) {
        return;
      } else {
        tabs.forEach((tab) => {
          if (tab.lastAccessed > LastAccessedTab.lastAccessed) {
            LastAccessedTab = tab;
          }
        });

        sendUpdateIframeSize(LastAccessedTab.id, currentWidth, currentHeight);
      }
    });
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["dist/ejectLite.js"],
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "apiNotify") {
    geminiSummaryButton.click();
    apiButton.click();
  }

  if (message.type === "resize") {
    const heightChange = message.heightChange;

    function updateHeight(element) {
      const newMaxHeight = Math.max(heightChange, 112);
      element.style.maxHeight = `${newMaxHeight}px`;
    }

    updateHeight(searchHistoryListContainer);
    updateHeight(favoriteListContainer);
    updateHeight(summaryListContainer);
  }

  if (message.action === "addrNotify") {
    optionalButton.click();
  }

  if (message.action === "premiumNotify") {
    document.querySelector('[data-bs-target="#premiumModal"]').click();
  }

  if (message.action === "checkYoutube") {
    gemini.checkCurrentTabForYoutube();
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeDependencies,
    initializePopup,
    popupLayout,
    hydratePopup,
    renderPopup,
    checkTextOverflow,
    getWarmState,
    fetchData,
    currentDimensions,
    sendUpdateIframeSize,
    delayMeasurement,
    retryMeasureContentSize,
    measureContentSize,
    measureContentSizeLast,
  };
}
