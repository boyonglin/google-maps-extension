// Page
const pageSearch = document.getElementsByClassName("page-S");
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

let [hasHistory, hasFavorite, hasSummary, hasInit] = [
  false,
  false,
  false,
  false,
];

document.addEventListener("DOMContentLoaded", () => {
  searchInput.focus();
  popupLayout();

  // Optimize by running heavy operations asynchronously
  requestAnimationFrame(() => {
    fetchData();
    checkCurrentTabForYoutube();
  });

  // Run payment check in background to avoid blocking UI
  setTimeout(() => {
    checkPay();
  }, 0);
});

// Update the popup layout
function popupLayout() {
  for (let i = 0; i < pageSearch.length; i++)
    pageSearch[i].classList.remove("d-none");
  for (let i = 0; i < pageFavorite.length; i++)
    pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++)
    pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++)
    pageGemini[i].classList.add("d-none");

  checkTextOverflow();
}

// Fetch the search history list
function fetchData() {
  searchHistoryListContainer.innerHTML = "";

  chrome.storage.local.get(
    ["searchHistoryList", "favoriteList", "geminiApiKey", "startAddr"],
    ({ searchHistoryList, favoriteList, geminiApiKey, startAddr }) => {
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
          li = createListItem(itemName, favoriteList);
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

      attachCheckboxEventListener(searchHistoryListContainer);

      if (hasInit) {
        measureContentSizeLast();
      } else {
        retryMeasureContentSize();
      }

      fetchAPIKey(geminiApiKey);
      fetchStartAddr(startAddr);
    }
  );
}

function createListItem(itemName, favoriteList) {
  const li = document.createElement("li");
  li.className = "list-group-item border rounded mb-3 px-3 history-list d-flex justify-content-between align-items-center text-break";

  const span = document.createElement("span");
  span.textContent = itemName;
  li.appendChild(span);

  const icon = createFavoriteIcon(itemName, favoriteList);
  li.appendChild(icon);

  const checkbox = document.createElement("input");
  checkbox.className = "form-check-input d-none";
  checkbox.type = "checkbox";
  checkbox.value = "delete";
  checkbox.name = "checkDelete";
  checkbox.ariaLabel = "Delete";
  checkbox.style.cursor = "pointer";
  li.appendChild(checkbox);

  return li;
}

// Create favorite action icon
function createFavoriteIcon(itemName, favoriteList) {
  const favoriteIcon = document.createElement("i");
  favoriteIcon.className =
    favoriteList && favoriteList.includes(itemName)
      ? "bi bi-patch-check-fill matched"
      : "bi bi-patch-plus-fill";
  favoriteIcon.title = chrome.i18n.getMessage("plusLabel");
  return favoriteIcon;
}

// Check if the API key is defined and valid
function fetchAPIKey(apiKey) {
  apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");

  if (apiKey) {
    chrome.runtime.sendMessage(
      { action: "verifyApiKey", apiKey: apiKey },
      (response) => {
        if (response.error) {
          sendButton.disabled = true;
          geminiEmptyMessage.innerText =
            chrome.i18n.getMessage("geminiFirstMsg");
        } else {
          apiInput.placeholder = "............" + apiKey.slice(-4);
        }
      }
    );
  } else {
    sendButton.disabled = true;
    geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
  }
}

function fetchStartAddr(startAddr) {
  dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");

  if (startAddr) {
    dirInput.placeholder = startAddr;
  }
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

// Add event listeners to the checkboxes
function attachCheckboxEventListener(container) {
  const checkboxes = container.querySelectorAll("input");
  const liElements = container.querySelectorAll("li");

  checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener("click", () => {
      const li = liElements[index];

      if (checkbox.checked) {
        li.classList.add("checked-list");
      } else {
        li.classList.remove("checked-list");
      }

      updateDeleteCount();
    });
  });
}

// Track events on the search bar
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

searchHistoryButton.addEventListener("click", () => {
  for (let i = 0; i < pageSearch.length; i++)
    pageSearch[i].classList.remove("d-none");
  for (let i = 0; i < pageFavorite.length; i++)
    pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++)
    pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++)
    pageGemini[i].classList.add("d-none");

  searchHistoryButton.classList.add("active-button");
  favoriteListButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.remove("active-button");
  videoSummaryButton.classList.add("d-none");

  subtitleElement.textContent = chrome.i18n.getMessage("searchHistorySubtitle");
  if (!hasHistory) {
    emptyMessage.style.display = "block";
    clearButton.disabled = true;
  } else {
    emptyMessage.style.display = "none";
    clearButton.disabled = false;
  }

  deleteListButton.disabled = false;

  measureContentSize();
  updateInput();
});

favoriteListButton.addEventListener("click", () => {
  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    updateFavorite(favoriteList);
  });

  for (let i = 0; i < pageSearch.length; i++)
    pageSearch[i].classList.add("d-none");
  for (let i = 0; i < pageFavorite.length; i++)
    pageFavorite[i].classList.remove("d-none");
  for (let i = 0; i < pageDelete.length; i++)
    pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++)
    pageGemini[i].classList.add("d-none");

  favoriteListButton.classList.add("active-button");
  searchHistoryButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.remove("active-button");
  videoSummaryButton.classList.add("d-none");

  subtitleElement.textContent = chrome.i18n.getMessage("favoriteListSubtitle");
  if (!hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  } else {
    favoriteEmptyMessage.style.display = "none";
  }

  deleteListButton.disabled = false;

  updateInput();
});

deleteListButton.addEventListener("click", () => {
  const historyLiElements = searchHistoryListContainer.querySelectorAll("li");
  const favoriteLiElements = favoriteListContainer.querySelectorAll("li");

  if (deleteListButton.classList.contains("active-button")) {
    backToNormal();
  } else {
    deleteListButton.classList.add("active-button");
    deleteListButton.style.pointerEvents = "auto";

    searchButtonGroup.classList.add("d-none");
    exportButtonGroup.classList.add("d-none");
    deleteButtonGroup.classList.remove("d-none");

    checkTextOverflow();

    historyLiElements.forEach((li) => {
      const checkbox = li.querySelector("input");
      const favoriteIcon = li.querySelector("i");

      checkbox.classList.remove("d-none");
      favoriteIcon.classList.add("d-none");

      li.classList.add("delete-list");
      li.classList.remove("history-list");
    });

    favoriteLiElements.forEach((li) => {
      const checkbox = li.querySelector("input");
      const favoriteIcon = li.querySelector("i");

      checkbox.classList.remove("d-none");
      favoriteIcon.classList.add("d-none");

      li.classList.add("delete-list");
      li.classList.remove("favorite-list");
    });

    if (searchHistoryButton.classList.contains("active-button")) {
      favoriteListButton.disabled = true;
      geminiSummaryButton.disabled = true;
      updateDeleteCount();
    } else {
      searchHistoryButton.disabled = true;
      geminiSummaryButton.disabled = true;
      updateDeleteCount();
    }
  }
});

geminiSummaryButton.addEventListener("click", () => {
  for (let i = 0; i < pageSearch.length; i++)
    pageSearch[i].classList.add("d-none");
  for (let i = 0; i < pageFavorite.length; i++)
    pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++)
    pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++)
    pageGemini[i].classList.remove("d-none");

  searchHistoryButton.classList.remove("active-button");
  favoriteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.add("active-button");
  deleteListButton.disabled = true;

  subtitleElement.textContent = chrome.i18n.getMessage("geminiSummarySubtitle");

  // Update video summary button visibility
  checkCurrentTabForYoutube();

  // Clear summary data if it's older than 1 hour
  chrome.storage.local.get(
    ["summaryList", "timestamp", "favoriteList"],
    (result) => {
      if (result.timestamp && result.summaryList.length > 0) {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - result.timestamp) / 1000;
        if (elapsedTime > 86400) {
          // Data is expired, clear it and show empty state
          hasSummary = false;
          summaryListContainer.innerHTML = "";
          geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
          clearButtonSummary.classList.add("d-none");
          geminiEmptyMessage.classList.remove("d-none");
          apiButton.classList.remove("d-none");
          clearButtonSummary.disabled = true;
          chrome.storage.local.remove(["summaryList", "timestamp"]);
          checkTextOverflow();
          measureContentSize();
        } else {
          if (result.summaryList) {
            hasSummary = true;
            geminiEmptyMessage.classList.add("d-none");
            summaryListContainer.innerHTML = constructSummaryHTML(
              result.summaryList,
              result.favoriteList
            );
            clearButtonSummary.classList.remove("d-none");
            apiButton.classList.add("d-none");
            clearButtonSummary.disabled = false;
            checkTextOverflow();
            measureContentSize();
          }
        }
      } else {
        checkTextOverflow();
        measureContentSize();
      }
    }
  );
});

function constructSummaryHTML(summaryList, favoriteList = []) {
  let html = '<ul class="list-group d-flex">';
  const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);

  summaryList.forEach((item, index) => {
    const isLastItem = index === summaryList.length - 1;
    const mbClass = isLastItem ? "" : "mb-3";

    const icon = createFavoriteIcon(item.name, trimmedFavorite);
    iconHTML = icon.outerHTML;

    html += `
      <li class="list-group-item border rounded px-3 summary-list d-flex justify-content-between align-items-center text-break ${mbClass}">
        <span>${item.name}</span>
        <span class="d-none">${item.clue}</span>
        ${iconHTML}
      </li>
    `;
  });

  html += "</ul>";
  return html;
}

exportButton.addEventListener("click", () => {
  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);
    const csv = "name\n" + trimmedFavorite.map((item) => `${item},`).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv; charset=utf-8;",
    });

    // Create a temporary anchor element and trigger the download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "TheMapsExpress_FavoriteList.csv";
    a.click();
  });
});

// Allow the user to select a file from their device
importButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      let importedData = [];
      const fileContent = event.target.result;

      if (fileContent && fileContent.length > 0) {
        // Parse CSV content
        const rows = fileContent
          .split("\n")
          .map((row) => row.trim())
          .filter((row) => row.length > 0);
        importedData = rows.slice(1).map((row) => row.replace(/,$/, ""));
        favoriteEmptyMessage.style.display = "none";
      } else {
        favoriteEmptyMessage.style.display = "block";
      }

      chrome.storage.local.set({ favoriteList: importedData }, () => {
        updateFavorite(importedData);
        updateHistoryFavoriteIcons();
      });
    } catch (error) {
      favoriteEmptyMessage.style.display = "block";
      favoriteEmptyMessage.innerText = chrome.i18n.getMessage("importErrorMsg");
    }
  };

  reader.readAsText(file);

  // Reset the file input value to allow re-selecting the same file
  event.target.value = "";
});

// Update the favorite icons in the search history list
function updateHistoryFavoriteIcons() {
  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    const historyItems = document.querySelectorAll(".history-list");
    historyItems.forEach((item) => {
      const text = item.querySelector("span").textContent;
      const favoriteIcon = item.querySelector("i");
      if (favoriteList && !favoriteList.includes(text)) {
        favoriteIcon.className = "bi bi-patch-plus-fill";
      } else {
        favoriteIcon.className = "bi bi-patch-check-fill matched";
      }
    });
  });
}

cancelButton.addEventListener("click", backToNormal);

deleteButton.addEventListener("click", () => {
  if (searchHistoryButton.classList.contains("active-button")) {
    deleteFromHistoryList();
  } else {
    deleteFromFavoriteList();
  }
  backToNormal();
  measureContentSize();
});

// Track the click event on li elements
searchHistoryListContainer.addEventListener("mousedown", (event) => {
  let liElement;
  if (event.target.tagName === "LI") {
    liElement = event.target;
  } else if (event.target.parentElement.tagName === "LI") {
    liElement = event.target.parentElement;
  } else {
    return;
  }

  if (liElement.classList.contains("delete-list")) {
    if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      liElement.classList.toggle("checked-list");
      const checkbox = liElement.querySelector("input");
      checkbox.checked = !checkbox.checked;
      updateDeleteCount();
    }
  } else {
    const selectedText = liElement.textContent;
    const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
      selectedText
    )}`;

    // Check if the clicked element has the "bi" class (favorite icon)
    if (event.target.classList.contains("bi")) {
      // Add the selected text to the favorite list
      addToFavoriteList(selectedText);
      event.target.className =
        "bi bi-patch-check-fill matched spring-animation";
      setTimeout(function () {
        event.target.classList.remove("spring-animation");
      }, 500);

      chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
        updateFavorite(favoriteList);
      });
    } else if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      if (event.button === 1) {
        // Middle click
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
      } else if (event.button === 0) {
        // Left click
        window.open(searchUrl, "_blank");
      }
    }
  }
});

function addToFavoriteList(selectedText) {
  chrome.runtime.sendMessage({ action: "addToFavoriteList", selectedText });
  exportButton.disabled = false;
}

favoriteListContainer.addEventListener("mousedown", (event) => {
  let liElement;
  if (event.target.tagName === "LI") {
    liElement = event.target;
  } else if (event.target.parentElement.tagName === "LI") {
    liElement = event.target.parentElement;
  } else {
    return;
  }

  if (liElement.classList.contains("delete-list")) {
    if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      liElement.classList.toggle("checked-list");
      const checkbox = liElement.querySelector("input");
      checkbox.checked = !checkbox.checked;
      updateDeleteCount();
    }
  } else {
    const spanItem = liElement.querySelectorAll("span");
    let selectedText = "";
    if (spanItem.length > 1) {
      selectedText = spanItem[0].textContent + " " + spanItem[1].textContent;
    } else {
      selectedText = spanItem[0].textContent;
    }
    const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
      selectedText
    )}`;

    if (event.target.classList.contains("bi")) {
      return;
    } else if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      if (event.button === 1) {
        // Middle click
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
      } else if (event.button === 0) {
        // Left click
        window.open(searchUrl, "_blank");
      }
    }
  }
});

summaryListContainer.addEventListener("click", (event) => {
  let liElement;
  if (event.target.tagName === "LI") {
    liElement = event.target;
  } else if (event.target.parentElement.tagName === "LI") {
    liElement = event.target.parentElement;
  } else {
    return;
  }

  const selectedText = liElement.textContent;
  const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    selectedText
  )}`;

  if (event.target.classList.contains("bi")) {
    const nameSpan = liElement.querySelector("span:first-child").textContent;
    const clueSpan = liElement.querySelector("span.d-none").textContent;
    addToFavoriteList(nameSpan + " @" + clueSpan);
    event.target.className = "bi bi-patch-check-fill matched spring-animation";
    setTimeout(function () {
      event.target.classList.remove("spring-animation");
    }, 500);

    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
      updateFavorite(favoriteList);
    });
  } else {
    // window.open(searchUrl, "_blank", "popup");
    chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
  }
});

// Track the click event on clear button
clearButton.addEventListener("click", () => {
  chrome.storage.local.set({ searchHistoryList: [] });

  clearButton.disabled = true;
  searchHistoryListContainer.innerHTML = "";

  emptyMessage.style.display = "block";
  emptyMessage.innerHTML = chrome.i18n
    .getMessage("clearedUpMsg")
    .replace(/\n/g, "<br>");

  hasHistory = false;

  // Send a message to background.js to request clearing of selected text list data
  chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });

  measureContentSize();
});

clearButtonSummary.addEventListener("click", () => {
  chrome.storage.local.remove(["summaryList", "timestamp"]);

  hasSummary = false;
  summaryListContainer.innerHTML = "";
  geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
  clearButtonSummary.classList.add("d-none");
  geminiEmptyMessage.classList.remove("d-none");
  apiButton.classList.remove("d-none");

  measureContentSize();
});

let videoSummaryMode;

// Check if current tab URL contains "youtube" and show/hide videoSummaryButton
async function checkCurrentTabForYoutube() {
  const isGeminiActive = geminiSummaryButton.classList.contains("active-button");
  if (videoSummaryMode === undefined) {
    const { currentVideoInfo, videoSummaryToggle } =
    await chrome.storage.local.get(["currentVideoInfo", "videoSummaryToggle"]);

    videoSummaryMode = Boolean(currentVideoInfo?.videoId);
    videoSummaryButton.classList.toggle("active-button", videoSummaryToggle);
  }

  if (isGeminiActive) {
    videoSummaryButton.classList.toggle("d-none", !videoSummaryMode);
  }
}

// Video Summary Button toggle functionality
videoSummaryButton.addEventListener("click", () => {
  chrome.storage.local.get("videoSummaryToggle", ({ videoSummaryToggle }) => {
    const newToggleState = !videoSummaryToggle;

    // Save new state to localStorage
    chrome.storage.local.set({ videoSummaryToggle: newToggleState });

    // Update button appearance
    if (newToggleState) {
      videoSummaryButton.classList.add("active-button");
      videoSummaryButton.classList.remove("no-hover-temp");
    } else {
      videoSummaryButton.classList.remove("active-button");
      videoSummaryButton.classList.add("no-hover-temp");
    }
  });
});

// One time hover disable effect for videoSummaryButton
videoSummaryButton.addEventListener("mouseleave", () => {
  if (videoSummaryButton.classList.contains("no-hover-temp")) {
    videoSummaryButton.classList.remove("no-hover-temp");
  }
});

// Track the storage change event
chrome.storage.onChanged.addListener((changes) => {
  const searchHistoryListChange = changes.searchHistoryList;
  const favoriteListChange = changes.favoriteList;

  if (favoriteListChange && favoriteListChange.newValue) {
    updateFavorite(favoriteListChange.newValue);
  }

  if (searchHistoryListChange && searchHistoryListChange.newValue) {
    const newList = searchHistoryListChange.newValue;
    const oldList = searchHistoryListChange.oldValue || [];

    if (newList.length >= oldList.length) {
      fetchData(hasInit);
    }
  }
});

// Update the favorite list container
function updateFavorite(favoriteList) {
  favoriteListContainer.innerHTML = "";

  if (favoriteList && favoriteList.length > 0) {
    favoriteEmptyMessage.style.display = "none";
    hasFavorite = true;

    const ul = document.createElement("ul");
    ul.className = "list-group d-flex flex-column-reverse";

    // Create list item from new selectedText
    const fragment = document.createDocumentFragment();
    favoriteList.forEach((selectedText) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item border rounded mb-3 px-3 favorite-list d-flex justify-content-between align-items-center text-break";

      const span = document.createElement("span");
      if (selectedText.includes(" @")) {
        const name = selectedText.split(" @")[0];
        const clue = selectedText.split(" @")[1];
        span.textContent = name;
        li.appendChild(span);

        const clueSpan = document.createElement("span");
        clueSpan.className = "d-none";
        clueSpan.textContent = clue;
        li.appendChild(clueSpan);
      } else {
        span.textContent = selectedText;
        li.appendChild(span);
      }

      const favoriteIcon = document.createElement("i");
      favoriteIcon.className = "bi bi-patch-check-fill matched";
      li.appendChild(favoriteIcon);

      const checkbox = document.createElement("input");
      checkbox.className = "form-check-input d-none";
      checkbox.type = "checkbox";
      checkbox.value = "delete";
      checkbox.name = "checkDelete";
      checkbox.ariaLabel = "Delete";
      checkbox.style.cursor = "pointer";
      li.appendChild(checkbox);
      fragment.appendChild(li);

      exportButton.disabled = false;
    });
    ul.appendChild(fragment);
    favoriteListContainer.appendChild(ul);

    const lastListItem = favoriteListContainer.querySelector(
      ".list-group .list-group-item:first-child"
    );
    if (lastListItem) {
      lastListItem.classList.remove("mb-3");
    }

    attachCheckboxEventListener(favoriteListContainer);
    measureContentSize();
  } else {
    favoriteEmptyMessage.style.display = "block";
    hasFavorite = false;
    exportButton.disabled = true;
    measureContentSize();
  }
}

// Toggle checkbox display
function updateInput() {
  const historyLiElements = searchHistoryListContainer.querySelectorAll("li");
  const favoriteLiElements = favoriteListContainer.querySelectorAll("li");

  updateListElements(historyLiElements, "history");
  updateListElements(favoriteLiElements, "favorite");
}

function updateListElements(liElements, listType) {
  liElements.forEach((li) => {
    const checkbox = li.querySelector("input");
    const favoriteIcon = li.querySelector("i");

    checkbox.classList.add("d-none");
    favoriteIcon.classList.remove("d-none");

    li.classList.remove("checked-list");
    checkbox.checked = false;

    li.classList.remove("delete-list");
    li.classList.add(listType + "-list");
  });
}

function deleteFromHistoryList() {
  const checkedBoxes =
    searchHistoryListContainer.querySelectorAll("input:checked");
  const selectedTexts = [];

  // Delete checked items from the lists
  checkedBoxes.forEach((checkbox) => {
    // Get the corresponding list item (parent element of the checkbox)
    const listItem = checkbox.closest("li");
    const selectedText = listItem.querySelector("span").textContent;
    selectedTexts.push(selectedText);

    listItem.remove();
  });

  chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
    // Filter out the selected texts from the search history list
    const updatedList = searchHistoryList.filter(
      (item) => !selectedTexts.includes(item)
    );
    chrome.storage.local.set({ searchHistoryList: updatedList });

    if (updatedList.length === 0) {
      hasHistory = false;
      clearButton.disabled = true;
      searchHistoryUl[0].classList.add("d-none");
      emptyMessage.style.display = "block";
      emptyMessage.innerHTML = chrome.i18n
        .getMessage("clearedUpMsg")
        .replace(/\n/g, "<br>");
    }
  });
}

function deleteFromFavoriteList() {
  const checkedBoxes = favoriteListContainer.querySelectorAll("input:checked");
  const selectedTexts = [];

  checkedBoxes.forEach((checkbox) => {
    const listItem = checkbox.closest("li");
    const spanItem = listItem.querySelectorAll("span");
    const selectedText = spanItem[0].textContent;
    if (spanItem.length > 1) {
      const clueText = spanItem[1].textContent;
      selectedTexts.push(selectedText + " @" + clueText);
    } else {
      selectedTexts.push(selectedText);
    }

    listItem.remove();

    const historyIElements = searchHistoryListContainer.querySelectorAll("i");

    historyIElements.forEach((icon) => {
      const spanText = icon.parentElement.querySelector("span").textContent;
      if (selectedText === spanText) {
        icon.className = "bi bi-patch-plus-fill";
      }
    });
  });

  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    const updatedList = favoriteList.filter(
      (item) => !selectedTexts.includes(item)
    );
    chrome.storage.local.set({ favoriteList: updatedList });

    if (updatedList.length === 0) {
      hasFavorite = false;
      exportButton.disabled = true;
      favoriteUl[0].classList.add("d-none");
      favoriteEmptyMessage.style.display = "block";
      favoriteEmptyMessage.innerHTML = chrome.i18n
        .getMessage("clearedUpMsg")
        .replace(/\n/g, "<br>");
    }
  });
}

// Update the delete count based on checked checkboxes
function updateDeleteCount() {
  const historyCheckedCount =
    searchHistoryListContainer.querySelectorAll("input:checked").length;
  const favoriteCheckedCount =
    favoriteListContainer.querySelectorAll("input:checked").length;

  const checkedCount = searchHistoryButton.classList.contains("active-button")
    ? historyCheckedCount
    : favoriteCheckedCount;

  if (checkedCount > 0) {
    // turn const to string
    deleteButtonSpan.textContent = chrome.i18n.getMessage(
      "deleteBtnText",
      checkedCount + ""
    );
    deleteButton.classList.remove("disabled");
  } else {
    deleteButtonSpan.textContent = chrome.i18n.getMessage("deleteBtnTextEmpty");
    deleteButton.classList.add("disabled");
  }
}

function backToNormal() {
  deleteListButton.style.pointerEvents = "";
  deleteListButton.classList.remove("active-button");
  deleteButtonGroup.classList.add("d-none");

  if (searchHistoryButton.classList.contains("active-button")) {
    searchButtonGroup.classList.remove("d-none");
    favoriteListButton.disabled = false;
    geminiSummaryButton.disabled = false;
  } else {
    exportButtonGroup.classList.remove("d-none");
    searchHistoryButton.disabled = false;
    geminiSummaryButton.disabled = false;
  }

  updateInput();
}

// Shortcuts configuration link
const configureElements = document.querySelectorAll(".modal-body p");

for (let i = 0; i < configureElements.length; i++) {
  configureElements[i].onclick = function (event) {
    // Detect user browser
    let userAgent = navigator.userAgent;

    if (/Chrome/i.test(userAgent)) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    } else if (/Opera|OPR\//i.test(userAgent)) {
      chrome.tabs.create({ url: "opera://extensions/shortcuts" });
    }

    event.preventDefault();
  };
}

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

// Get Gemini response
const responseField = document.getElementById("response");

sendButton.addEventListener("click", () => {
  sendButton.disabled = true;
  clearButtonSummary.disabled = true;

  // Check if video summary button is active
  const isVideoSummaryActive = videoSummaryButton.classList.contains("active-button");

  if (isVideoSummaryActive) {
    // Use video summary functionality
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      summarizeFromGeminiVideoUnderstanding(tabs[0].url);
    });
  } else {
    // Use normal content summarization
    performNormalContentSummary();
  }
});

function summarizeFromGeminiVideoUnderstanding(videoUrl) {
  // Clear any existing summary data first to prevent race condition
  chrome.storage.local.remove(["summaryList", "timestamp"]);

  // begin UI update (same as sendButton click)
  sendButton.disabled = true;
  clearButtonSummary.disabled = true;
  summaryListContainer.innerHTML = "";
  geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiLoadMsg");
  geminiEmptyMessage.classList.remove("d-none");
  geminiEmptyMessage.classList.add("shineText");

  // request background video length
  chrome.storage.local.get("currentVideoInfo", ({ currentVideoInfo }) => {
    if (currentVideoInfo && currentVideoInfo.length) {
      const estTime = Math.ceil(currentVideoInfo.length / 10);
      const originalText = geminiEmptyMessage.innerHTML;
      const newText = originalText.replace("NaN", estTime);
      geminiEmptyMessage.innerHTML = newText;
    }
  });

  measureContentSize();

  // request background summary
  chrome.runtime.sendMessage(
    { action: "summarizeVideo", text: videoUrl },
    (response) => {
      // restore send-button state
      sendButton.disabled = false;

      // success when we get a string fragment of <ul>...</ul>
      if (typeof response === "string") {
        createSummaryList(response);
      }
      else {
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiErrorMsg");
      }
    }
  );
}

function performNormalContentSummary() {
  chrome.storage.local.get("geminiApiKey", (data) => {
    const apiKey = data.geminiApiKey;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { message: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          summaryListContainer.innerHTML = "";
          geminiEmptyMessage.innerText =
            chrome.i18n.getMessage("geminiErrorMsg");
          geminiEmptyMessage.classList.remove("d-none");
          sendButton.disabled = false;
          clearButtonSummary.disabled = false;
          return;
        }
      });

      // Check if we're on YouTube and expand description first
      const isYouTube = tabs[0].url && tabs[0].url.toLowerCase().includes("youtube");

      if (isYouTube) {
        // First expand the YouTube description
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "expandYouTubeDescription" },
          (expandResponse) => {
            // Wait a moment for the expansion to complete, then get content
            setTimeout(() => {
              getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url);
            }, 500);
          }
        );
      } else {
        // For non-YouTube pages, get content directly
        getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url);
      }
    });
  });
}

function getContentAndSummarize(tabId, apiKey, url) {
  chrome.tabs.sendMessage(
    tabId,
    { action: "getContent" },
    (response) => {
      if (response && response.content) {
        summaryListContainer.innerHTML = "";
        geminiEmptyMessage.innerText =
          chrome.i18n.getMessage("geminiLoadMsg");
        geminiEmptyMessage.classList.remove("d-none");
        geminiEmptyMessage.classList.add("shineText");

        const originalText = geminiEmptyMessage.innerHTML;
        const divisor = isPredominantlyLatinChars(response.content)
          ? 1500
          : 750;

        const newText = originalText.replace(
          "NaN",
          Math.ceil(response.length / divisor)
        );
        geminiEmptyMessage.innerHTML = newText;

        summarizeContent(response.content, apiKey, url);
        measureContentSize();
      }
    }
  );
}

// Check if the content is predominantly Latin characters
function isPredominantlyLatinChars(text) {
  const latinChars = text.match(/[a-zA-Z\u00C0-\u00FF]/g)?.length || 0;
  const squareChars =
    text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0;

  return latinChars > squareChars;
}

function summarizeContent(content, apiKey, url) {
  responseField.value = "";

  chrome.runtime.sendMessage(
    { action: "summarizeApi", text: content, apiKey: apiKey, url: url },
    (response) => {
      if (response.error) {
        responseField.value = `API Error: ${response.error}`;
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiErrorMsg");
      } else {
        responseField.value = response;
        try {
          createSummaryList(response);
        } catch (error) {
          responseField.value = `HTML Error: ${error}`;
          geminiEmptyMessage.innerText =
            chrome.i18n.getMessage("geminiErrorMsg");
        }
      }
      sendButton.disabled = false;
    }
  );
}

function createSummaryList(response) {
  summaryListContainer.innerHTML = response;
  const lastListItem = summaryListContainer.querySelector(
    ".list-group .list-group-item:last-child"
  );
  if (lastListItem) {
    lastListItem.classList.remove("mb-3");
  }
  hasSummary = true;
  geminiEmptyMessage.classList.remove("shineText");
  geminiEmptyMessage.classList.add("d-none");
  clearButtonSummary.classList.remove("d-none");
  apiButton.classList.add("d-none");
  clearButtonSummary.disabled = false;

  checkTextOverflow();
  measureContentSize();

  // store the response and current time
  const listItems = document.querySelectorAll(".summary-list");
  const data = [];

  listItems.forEach((item) => {
    const nameSpan = item.querySelector("span:first-child").textContent;
    const clueSpan = item.querySelector("span.d-none").textContent;
    data.push({ name: nameSpan, clue: clueSpan });
  });

  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    if (!favoriteList) {
      return;
    }

    const trimmedFavorite = favoriteList.map(
      (item) => item.split(" @")[0]
    );
    listItems.forEach((item) => {
      const itemName =
        item.querySelector("span:first-child").textContent;
      const icon = createFavoriteIcon(itemName, trimmedFavorite);
      item.appendChild(icon);
    });
  });

  const currentTime = Date.now();
  chrome.storage.local.set({
    summaryList: data,
    timestamp: currentTime,
  });
}

// Replace text from note with a link
function text2Link(dataLocale, linkText, linkHref) {
  const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
  if (pElement) {
    const originalText = pElement.innerHTML;
    const newText = originalText.replace(
      linkText,
      `<a href="${linkHref}" target="_blank">${linkText}</a>`
    );
    pElement.innerHTML = newText;
  }
}

function text2Modal(dataLocale, linkText, modalId) {
  const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
  if (pElement) {
    const originalText = pElement.innerHTML;
    const newText = originalText.replace(
      linkText,
      `<a href="#" data-bs-toggle="modal" data-bs-target="#${modalId}">${linkText}</a>`
    );
    pElement.innerHTML = newText;
  }
}

text2Link(
  "apiNote",
  "Google AI Studio",
  "https://aistudio.google.com/app/apikey"
);

// Save the API key
document.getElementById("apiForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const apiKey = apiInput.value;

  chrome.storage.local.set({ geminiApiKey: apiKey });

  chrome.runtime.sendMessage(
    { action: "verifyApiKey", apiKey: apiKey },
    (response) => {
      if (response.error) {
        geminiEmptyMessage.classList.remove("d-none");
        apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("apiInvalidMsg");
        sendButton.disabled = true;
      } else {
        apiInput.placeholder = "............" + apiKey.slice(-4);
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
        sendButton.disabled = false;
      }
    }
  );
});

// Modal close event
const apiModal = document.getElementById("apiModal");
apiModal.addEventListener("hidden.bs.modal", () => {
  apiInput.value = "";
});

const optionalModal = document.getElementById("optionalModal");
optionalModal.addEventListener("hidden.bs.modal", () => {
  dirInput.value = "";
});

// Save the starting address
document.getElementById("dirForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const startAddr = dirInput.value.trim();

  if (startAddr === "") {
    chrome.storage.local.remove("startAddr");
    dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
  } else {
    chrome.storage.local.set({ startAddr: startAddr });
    dirInput.placeholder = startAddr;
  }
});

// tooltips
videoSummaryButton.title = chrome.i18n.getMessage("videoLabel");
geminiSummaryButton.title = chrome.i18n.getMessage("geminiLabel");
searchHistoryButton.title = chrome.i18n.getMessage("historyLabel");
favoriteListButton.title = chrome.i18n.getMessage("favoriteLabel");
deleteListButton.title = chrome.i18n.getMessage("deleteLabel");
enterButton.title = chrome.i18n.getMessage("enterLabel");
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

function measureContentSize() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "updateIframeSize",
      width: body.offsetWidth,
      height: body.offsetHeight,
      frameWidth: frameWidth,
      titleBarHeight: titleBarHeight,
    });
  });
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
        width: body.offsetWidth,
        height: body.offsetHeight,
        frameWidth: frameWidth,
        titleBarHeight: titleBarHeight,
      });
    }
  });
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

// Premium panel
paymentButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "extPay" });
});

restoreButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "restorePay" });
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
      text2Modal("premiumNote", "Gemini AI", "apiModal");
      text2Modal("premiumNote", "Alt+S / ⌥+S", "tipsModal");
    } else if (stage.isPremium) {
      pElement.innerHTML = chrome.i18n.getMessage("premiumNote");
      text2Link(
        "premiumNote",
        "回饋",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
      text2Link(
        "premiumNote",
        "feedback",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
      text2Link(
        "premiumNote",
        "フィードバック",
        "https://forms.fillout.com/t/dFSEkAwKYKus"
      );
    } else if (stage.isFree) {
      pElement.innerHTML = chrome.i18n.getMessage("freeNote");
      text2Link("premiumNote", "ExtensionPay", "https://extensionpay.com/");
    }
  });
}

closeButton.addEventListener("click", () => {
  checkPay();
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

  if (message.action === "checkYoutube") {
    videoSummaryMode = undefined;
    checkCurrentTabForYoutube();
  }
});
