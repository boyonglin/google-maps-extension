// Page
const pageHistory = document.getElementsByClassName("page-H");
const pageFavorite = document.getElementsByClassName("page-F");
const pageDelete = document.getElementsByClassName("page-D");
const pageGemini = document.getElementsByClassName("page-G");

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

function initializeDependencies(deps = {}) {
  state = deps.state || new State();
  remove = deps.remove || new Remove();
  favorite = deps.favorite || new Favorite();
  history = deps.history || new History();
  gemini = deps.gemini || new Gemini();
  modal = deps.modal || new Modal();
  payment = deps.payment || new Payment();
  onboarding = deps.onboarding || (typeof Onboarding !== "undefined" ? new Onboarding() : null);

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

  // Optimize by running heavy operations asynchronously
  requestAnimationFrame(() => {
    popupLayout();
    Promise.all([fetchData(), gemini.checkCurrentTabForYoutube()]);
  });

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

  if (onboarding && typeof onboarding.maybeStart === "function") {
    onboarding.maybeStart();
  }

  // Fix: "Blocked aria-hidden..."
  document.addEventListener("hide.bs.modal", function (event) {
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

document.addEventListener("readystatechange", () => {
  if (document.readyState === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "finishIframe",
      });
    });
  }
});

function popupLayout() {
  chrome.storage.local.get("lastActiveTab", (result) => {
    const lastTab = ["history", "favorite", "gemini"].includes(result?.lastActiveTab)
      ? result.lastActiveTab
      : "history";

    showPage(lastTab);
    checkTextOverflow();

    if (window.Analytics) {
      window.Analytics.trackPageView(lastTab);
    }

    if (lastTab === "favorite") {
      getWarmState().then(({ favoriteList = [] }) => {
        favorite.updateFavorite(favoriteList);
        state.hasFavorite = favoriteList.length > 0;
        favoriteEmptyMessage.style.display = favoriteList.length ? "none" : "block";
      });
    } else if (lastTab === "gemini") {
      deleteListButton.disabled = true;
      gemini.clearExpiredSummary();

      // showPage() just set geminiSummaryButton to active, but the earlier
      // checkCurrentTabForYoutube() call (fired synchronously from
      // initializePopup, before this async storage callback ran) captured
      // isGeminiActive as false and skipped un-hiding videoSummaryButton.
      // Re-run now so the YouTube toggle reflects the restored tab state.
      gemini.checkCurrentTabForYoutube();
    }
  });
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
  searchHistoryListContainer.innerHTML = "";

  const {
    searchHistoryList = [],
    favoriteList = [],
    geminiApiKey = "",
    startAddr = "",
    authUser = 0,
    isIncognito = false,
    videoSummaryToggle = false,
    historyMax = 10,
  } = await getWarmState();

  if (searchHistoryList.length) {
    emptyMessage.style.display = "none";
    state.hasHistory = true;
    clearButton.disabled = false;

    const ul = document.createElement("ul");
    ul.className = "list-group d-flex flex-column-reverse";

    const frag = document.createDocumentFragment();
    searchHistoryList.forEach((item) =>
      frag.appendChild(history.createListItem(item, favoriteList))
    );
    ul.appendChild(frag);
    searchHistoryListContainer.appendChild(ul);

    const first = searchHistoryListContainer.querySelector(
      ".list-group .list-group-item:first-child"
    );
    first?.classList.remove("mb-3");
  } else {
    emptyMessage.style.display = "block";
    state.hasHistory = false;
    clearButton.disabled = true;
  }

  remove.attachCheckboxEventListener(searchHistoryListContainer);

  state.hasInit ? measureContentSizeLast() : retryMeasureContentSize();

  gemini.fetchAPIKey(geminiApiKey);
  modal.updateOptionalModal(startAddr, authUser, historyMax);
  modal.updateIncognitoModal(!!isIncognito);
  state.localVideoToggle = videoSummaryToggle;
  videoSummaryButton.classList.toggle("active-button", videoSummaryToggle);

  state.buildMapsButtonUrl();
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

function showPage(tabName) {
  const tabMap = {
    history: pageHistory,
    favorite: pageFavorite,
    gemini: pageGemini,
    delete: pageDelete,
  };

  Object.keys(tabMap).forEach((key) => {
    for (let i = 0; i < tabMap[key].length; i++) {
      tabMap[key][i].classList[key === tabName ? "remove" : "add"]("d-none");
    }
  });

  searchHistoryButton.classList.toggle("active-button", tabName === "history");
  favoriteListButton.classList.toggle("active-button", tabName === "favorite");
  geminiSummaryButton.classList.toggle("active-button", tabName === "gemini");
  deleteListButton.classList.toggle("active-button", tabName === "delete");

  if (tabName === "history" || tabName === "favorite") {
    videoSummaryButton.classList.add("d-none");
  }

  switch (tabName) {
    case "history":
      subtitleElement.textContent = chrome.i18n.getMessage("searchHistorySubtitle");
      break;
    case "favorite":
      subtitleElement.textContent = chrome.i18n.getMessage("favoriteListSubtitle");
      break;
    case "gemini":
      subtitleElement.textContent = chrome.i18n.getMessage("geminiSummarySubtitle");
      break;
  }
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
  showPage("history");

  if (!state.hasHistory) {
    emptyMessage.style.display = "block";
    clearButton.disabled = true;
  } else {
    emptyMessage.style.display = "none";
    clearButton.disabled = false;
  }

  deleteListButton.disabled = false;

  measureContentSize();
  remove.updateInput();
});

favoriteListButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackPageView("favorite");
  chrome.storage.local.set({ lastActiveTab: "favorite" });
  getWarmState().then(({ favoriteList = [] }) => {
    favorite.updateFavorite(favoriteList);
  });

  showPage("favorite");

  if (!state.hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  } else {
    favoriteEmptyMessage.style.display = "none";
  }

  deleteListButton.disabled = false;

  remove.updateInput();
  state.favoriteListChanged = false;
});

geminiSummaryButton.addEventListener("click", () => {
  if (window.Analytics) window.Analytics.trackPageView("gemini");
  chrome.storage.local.set({ lastActiveTab: "gemini" });
  showPage("gemini");
  deleteListButton.disabled = true;

  gemini.checkCurrentTabForYoutube();

  gemini.clearExpiredSummary();
  state.summaryListChanged = false;
});

chrome.storage.onChanged.addListener((changes) => {
  state.historyListChanged = changes.searchHistoryList;
  state.favoriteListChanged = changes.favoriteList;
  state.summaryListChanged = changes.summaryList;

  const incognitoChange = changes.isIncognito;

  if (state.favoriteListChanged && state.favoriteListChanged.newValue) {
    favorite.updateFavorite(state.favoriteListChanged.newValue);
  }

  if (state.historyListChanged && state.historyListChanged.newValue) {
    const newList = state.historyListChanged.newValue;
    const oldList = state.historyListChanged.oldValue || [];

    if (newList.length >= oldList.length) {
      fetchData(state.hasInit);
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
window.addEventListener("i18n:changed", () => {
  const subtitleByTab = {
    searchHistoryButton: "searchHistorySubtitle",
    favoriteListButton: "favoriteListSubtitle",
    geminiSummaryButton: "geminiSummarySubtitle",
  };
  const activeTab = document.querySelector(".active-button");
  const key = activeTab && subtitleByTab[activeTab.id];
  if (key && subtitleElement) {
    const v = chrome.i18n.getMessage(key);
    if (v) subtitleElement.textContent = v;
  }
  // Reset buttons to their default width
  [clearButton, cancelButton, clearButtonSummary].forEach((btn) => {
    btn.classList.remove("w-auto");
    btn.classList.add("w-25");
  });
  // Re-measure after the new strings paint
  requestAnimationFrame(() => {
    checkTextOverflow();
    measureContentSize();
  });
});

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
    state.hasInit = true;
  }
}

function measureContentSize(summary = false) {
  const { width: currentWidth, height: currentHeight } = currentDimensions();

  if (currentWidth !== state.previousWidth || currentHeight !== state.previousHeight) {
    state.updateDimensions(currentWidth, currentHeight);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let contentTabId = summary ? state.summarizedTabId : tabs[0].id;

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

// Close by Esc key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["dist/ejectLite.js"],
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    state.videoSummaryMode = undefined;
    gemini.checkCurrentTabForYoutube();
  }
});

if (typeof State === "undefined" && typeof require !== "undefined") {
  global.State = require("./hooks/popupState");
  global.Remove = require("./components/remove");
  global.Favorite = require("./components/favorite");
  global.History = require("./components/history");
  global.Gemini = require("./components/gemini");
  global.Modal = require("./components/modal");
  global.Payment = require("./utils/payment");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeDependencies,
    initializePopup,
    popupLayout,
    showPage,
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
