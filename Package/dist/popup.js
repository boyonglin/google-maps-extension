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

// ExtensionPay
const paymentButton = document.getElementById("paymentButton");
const restoreButton = document.getElementById("restoreButton");
const shortcutTip = document.getElementsByClassName("premium-only");

// Spans
const clearButtonSpan = document.querySelector("#clearButton > i + span");
const cancelButtonSpan = document.querySelector("#cancelButton > span");
const deleteButtonSpan = document.querySelector("#deleteButton > i + span");
const mapsButtonSpan = document.getElementById("mapsButtonSpan");
const clearButtonSummarySpan = document.querySelector(
  "#clearButtonSummary > i + span"
);
const sendButtonSpan = document.querySelector("#sendButton > i + span");
const paymentSpan = document.querySelector("#paymentButton > span");

// Import Scripts
const deleteM = new DeleteM();
const favorite = new Favorite();
const history = new History();
const gemini = new Gemini();
const modal = new Modal();

let [hasHistory, hasFavorite, hasSummary, hasInit] = [
  false, false, false, false,
];

let videoSummaryMode;
let localVideoToggle;

document.addEventListener("DOMContentLoaded", () => {
  searchInput.focus();

  // Optimize by running heavy operations asynchronously
  requestAnimationFrame(() => {
    popupLayout();
    fetchData();
    gemini.checkCurrentTabForYoutube();
  });

  // Run payment check in background to avoid blocking UI
  setTimeout(() => {
    checkPay();
  }, 0);

  // Add event listeners
  deleteM.addDeleteModeListener();
  favorite.addFavoritePageListener();
  history.addHistoryPageListener();
  gemini.addGeminiPageListener();
  modal.addModalListener();

  // Fix: "Blocked aria-hidden..."
  document.addEventListener("hide.bs.modal", function (event) {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });
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

// Update the popup layout
function popupLayout() {
  showPage("history");
  checkTextOverflow();
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

// Fetch lists from Chrome storage
function fetchData() {
  searchHistoryListContainer.innerHTML = "";

  chrome.storage.local.get(
    ["searchHistoryList", "favoriteList", "geminiApiKey", "startAddr", "videoSummaryToggle"],
    ({ searchHistoryList, favoriteList, geminiApiKey, startAddr, videoSummaryToggle }) => {
      // Retrieve searchHistoryList and favoriteList from Chrome storage
      if (searchHistoryList && searchHistoryList.length > 0) {
        emptyMessage.style.display = "none";
        hasHistory = true;
        clearButton.disabled = false;

        const ul = document.createElement("ul");
        ul.className = "list-group d-flex flex-column-reverse";

        // Create list item
        const fragment = document.createDocumentFragment();

        searchHistoryList.forEach((itemName) => {
          li = history.createListItem(itemName, favoriteList);
          fragment.appendChild(li);
        });

        ul.appendChild(fragment);
        searchHistoryListContainer.appendChild(ul);

        const lastListItem = searchHistoryListContainer.querySelector(
          ".list-group .list-group-item:first-child"
        );
        if (lastListItem) {
          lastListItem.classList.remove("mb-3");
        }
      } else {
        emptyMessage.style.display = "block";
        hasHistory = false;
        clearButton.disabled = true;
      }

      deleteM.attachCheckboxEventListener(searchHistoryListContainer);

      if (hasInit) {
        measureContentSizeLast();
      } else {
        retryMeasureContentSize();
      }

      gemini.fetchAPIKey(geminiApiKey);
      fetchStartAddr(startAddr);
      localVideoToggle = videoSummaryToggle;
      videoSummaryButton.classList.toggle("active-button", videoSummaryToggle);
    }
  );
}

function fetchStartAddr(startAddr) {
  dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");

  if (startAddr) {
    dirInput.placeholder = startAddr;
  }
}

// Search bar event
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (searchInput.value.trim() === "") {
      // If it contains only blanks, prevent the default behavior of the event and do not allow submission
      event.preventDefault();
    } else {
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
    chrome.runtime.sendMessage({
      searchTerm: searchInput.value,
      action: "searchInput",
    });
    searchInput.value = "";
    enterButton.classList.add("d-none");
  }
});

// Page layout
function showPage(tabName) {
  const tabMap = {
    history: pageHistory,
    favorite: pageFavorite,
    delete: pageDelete,
    gemini: pageGemini,
  };

  Object.keys(tabMap).forEach((key) => {
    for (let i = 0; i < tabMap[key].length; i++) {
      tabMap[key][i].classList[key === tabName ? "remove" : "add"]("d-none");
    }
  });

  searchHistoryButton.classList.toggle("active-button", tabName === "history");
  favoriteListButton.classList.toggle("active-button", tabName === "favorite");
  deleteListButton.classList.toggle("active-button", tabName === "delete");
  geminiSummaryButton.classList.toggle("active-button", tabName === "gemini");

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

searchHistoryButton.addEventListener("click", () => {
  showPage("history");

  if (!hasHistory) {
    emptyMessage.style.display = "block";
    clearButton.disabled = true;
  } else {
    emptyMessage.style.display = "none";
    clearButton.disabled = false;
  }

  deleteListButton.disabled = false;

  measureContentSize();
  deleteM.updateInput();
});

favoriteListButton.addEventListener("click", () => {
  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    favorite.updateFavorite(favoriteList);
  });

  showPage("favorite");

  if (!hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  } else {
    favoriteEmptyMessage.style.display = "none";
  }

  deleteListButton.disabled = false;

  deleteM.updateInput();
});

geminiSummaryButton.addEventListener("click", () => {
  showPage("gemini");
  deleteListButton.disabled = true;

  // Update video summary button visibility
  gemini.checkCurrentTabForYoutube();

  gemini.clearExpiredSummary();
});

// Track the storage change event
chrome.storage.onChanged.addListener((changes) => {
  const searchHistoryListChange = changes.searchHistoryList;
  const favoriteListChange = changes.favoriteList;

  if (favoriteListChange && favoriteListChange.newValue) {
    favorite.updateFavorite(favoriteListChange.newValue);
  }

  if (searchHistoryListChange && searchHistoryListChange.newValue) {
    const newList = searchHistoryListChange.newValue;
    const oldList = searchHistoryListChange.oldValue || [];

    if (newList.length >= oldList.length) {
      fetchData(hasInit);
    }
  }
});

// Localization
document.querySelectorAll("[data-locale]").forEach((elem) => {
  elem.innerText = chrome.i18n.getMessage(elem.dataset.locale);
});

// Ignore pressing the Enter key which means confirmation (macOS)
searchInput.placeholder = chrome.i18n.getMessage("searchInputPlaceholder");
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

// tooltips
videoSummaryButton.title = chrome.i18n.getMessage("videoLabel");
geminiSummaryButton.title = chrome.i18n.getMessage("geminiLabel");
searchHistoryButton.title = chrome.i18n.getMessage("historyLabel");
favoriteListButton.title = chrome.i18n.getMessage("favoriteLabel");
deleteListButton.title = chrome.i18n.getMessage("deleteLabel");
enterButton.title = chrome.i18n.getMessage("enterLabel");
const configureElements = document.querySelectorAll(".modal-body p");
configureElements[0].title = chrome.i18n.getMessage("shortcutsLabel");
configureElements[1].title = chrome.i18n.getMessage("shortcutsLabel");
configureElements[2].title = chrome.i18n.getMessage("shortcutsLabel");
const apiSaveButton = document.querySelectorAll(".modal-body #apiForm button");
apiSaveButton[0].title = chrome.i18n.getMessage("saveLabel");
clearButtonSummary.title = chrome.i18n.getMessage("clearSummaryLabel");

// Measure the frame and title bar sizes from different OS
const body = document.body;
const frameWidth = window.outerWidth - window.innerWidth;
const titleBarHeight = window.outerHeight - window.innerHeight;

// Cache previous dimensions to avoid unnecessary updates
let previousWidth = 0;
let previousHeight = 0;

// Prevent layout glitch
function delayMeasurement() {
  setTimeout(() => {
    measureContentSize();
  }, 50);
}

function measureContentSize() {
  const currentWidth = body.offsetWidth;
  const currentHeight = body.offsetHeight;

  // Only update if dimensions have changed
  if (currentWidth !== previousWidth || currentHeight !== previousHeight) {
    previousWidth = currentWidth;
    previousHeight = currentHeight;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateIframeSize",
        width: currentWidth,
        height: currentHeight,
        frameWidth: frameWidth,
        titleBarHeight: titleBarHeight,
      });
    });
  }
}

function retryMeasureContentSize() {
  if (document.body.offsetWidth === 0) {
    setTimeout(retryMeasureContentSize, 100);
  } else {
    measureContentSize();
    hasInit = true;
  }
}

// If the focus tab is changed
function measureContentSizeLast() {
  const currentWidth = body.offsetWidth;
  const currentHeight = body.offsetHeight;

  if (currentWidth !== previousWidth || currentHeight !== previousHeight) {
    previousWidth = currentWidth;
    previousHeight = currentHeight;

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

        chrome.tabs.sendMessage(LastAccessedTab.id, {
          action: "updateIframeSize",
          width: currentWidth,
          height: currentHeight,
          frameWidth: frameWidth,
          titleBarHeight: titleBarHeight,
        });
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

const pElement = document.querySelector(`p[data-locale="premiumNote"]`);

function checkPay() {
  chrome.runtime.sendMessage({ action: "checkPay" }, (response) => {
    const stage = response.result;

    // Shortcut display
    if (stage.isTrial || stage.isPremium) {
      Array.from(shortcutTip).forEach((element) => {
        element.classList.remove("premium-only");
      });
    }

    // Note display
    if (stage.isFirst) {
      pElement.innerHTML = chrome.i18n.getMessage("firstNote");
    } else if (stage.isTrial) {
      const date = new Date(stage.trialEnd);
      const shortDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const time = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const trialEndOn = `${shortDate}, ${time}`;
      paymentSpan.innerHTML = chrome.i18n.getMessage("trialNote", trialEndOn);
      pElement.innerHTML = chrome.i18n.getMessage("remindNote");
      modal.text2Modal("premiumNote", "Gemini AI", "apiModal");
      modal.text2Modal("premiumNote", "Alt+S / ⌥+S", "tipsModal");
    } else if (stage.isPremium) {
      pElement.innerHTML = chrome.i18n.getMessage("premiumNote");
      modal.text2Link(
        "premiumNote",
        "回饋",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
      modal.text2Link(
        "premiumNote",
        "feedback",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
      modal.text2Link(
        "premiumNote",
        "フィードバック",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
    } else if (stage.isFree) {
      pElement.innerHTML = chrome.i18n.getMessage("freeNote");
      modal.text2Link("premiumNote", "ExtensionPay", "https://extensionpay.com/");
    }
  });
}

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

  if (message.action === "checkYoutube") {
    videoSummaryMode = undefined;
    gemini.checkCurrentTabForYoutube();
  }
});
