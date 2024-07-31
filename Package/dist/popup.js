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

// Spans
const clearButtonSpan = document.querySelector("#clearButton > i + span");
const cancelButtonSpan = document.querySelector("#cancelButton > span");
const deleteButtonSpan = document.querySelector("#deleteButton > i + span");
const mapsButtonSpan = document.getElementById("mapsButtonSpan");

let [hasHistory, hasFavorite, hasSummary] = [false, false, false];

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(popupLayout, 0);
  setTimeout(fetchData, 0);
});

// Update the popup layout
function popupLayout() {
  for (let i = 0; i < pageSearch.length; i++) pageSearch[i].classList.remove("d-none");
  for (let i = 0; i < pageFavorite.length; i++) pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++) pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++) pageGemini[i].classList.add("d-none");

  checkTextOverflow();
};

// Fetch the search history list
function fetchData() {
  chrome.storage.local.get(
    ["searchHistoryList", "favoriteList", "geminiApiKey"],
    ({ searchHistoryList, favoriteList, geminiApiKey }) => {

      // Retrieve searchHistoryList and favoriteList from Chrome storage
      if (searchHistoryList && searchHistoryList.length > 0) {
        emptyMessage.style.display = "none";
        hasHistory = true;

        const ul = document.createElement("ul");
        ul.className = "list-group d-flex flex-column-reverse";

        // Create list item from new selectedText
        const fragment = document.createDocumentFragment();
        searchHistoryList.forEach((selectedText) => {
          const li = document.createElement("li");
          li.className =
            "list-group-item border rounded mb-3 px-3 history-list d-flex justify-content-between align-items-center";

          const span = document.createElement("span");
          span.textContent = selectedText;
          li.appendChild(span);

          const favoriteIcon = document.createElement("i");
          favoriteIcon.className =
            favoriteList && favoriteList.includes(selectedText)
              ? "bi bi-patch-check-fill matched"
              : "bi bi-patch-plus-fill";
          favoriteIcon.title = chrome.i18n.getMessage("plusLabel");
          li.appendChild(favoriteIcon);

          const checkbox = document.createElement("input");
          checkbox.className = "form-check-input d-none";
          checkbox.type = "checkbox";
          checkbox.value = "delete";
          checkbox.id = "checkDelete";
          checkbox.ariaLabel = "Delete";
          checkbox.style.cursor = "pointer";
          li.appendChild(checkbox);
          fragment.appendChild(li);
        });
        ul.appendChild(fragment);
        searchHistoryListContainer.appendChild(ul);

        const lastListItem = searchHistoryListContainer.querySelector(".list-group .list-group-item:first-child");
        if (lastListItem) {
          lastListItem.classList.remove("mb-3");
        }
      } else {
        emptyMessage.style.display = "block";
        hasHistory = false;
        clearButton.disabled = true;
      }

      attachCheckboxEventListener(searchHistoryListContainer);

      // Check if the API key is defined and valid
      if (geminiApiKey) {
        verifyApiKey(geminiApiKey).then(isValid => {
          if (!isValid) {
            sendButton.disabled = true;
            geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
          }
        });
      } else {
        sendButton.disabled = true;
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
        return;
      }
    }
  );
}

// Check if the text overflows the button since locale
function checkTextOverflow() {
  const mapsButtonHeight = mapsButtonSpan.offsetHeight;
  const clearButtonHeight = clearButtonSpan.offsetHeight;
  const deleteButtonHeight = deleteButtonSpan.offsetHeight;
  const cancelButtonHeight = cancelButtonSpan.offsetHeight;

  if (clearButtonHeight > mapsButtonHeight) {
    clearButton.classList.remove("w-25");
    clearButton.classList.add("w-auto");
  }
  if (cancelButtonHeight > deleteButtonHeight) {
    cancelButton.classList.remove("w-25");
    cancelButton.classList.add("w-auto");
  }
}

// Add event listeners to the checkboxes
function attachCheckboxEventListener(container) {
  const checkboxes = container.querySelectorAll("input");
  const liElements = container.querySelectorAll("li");

  checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener("click", function () {
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
searchInput.addEventListener("keydown", function (event) {
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
  }
});

searchInput.addEventListener("input", function () {
  if (searchInput.value.trim() === "") {
    enterButton.classList.add("d-none");
  } else {
    enterButton.classList.remove("d-none");
  }
});

enterButton.addEventListener("click", function () {
  if (searchInput.value.trim() === "") {
    return;
  } else {
    chrome.runtime.sendMessage({
      searchTerm: searchInput.value,
      action: "searchInput",
    });
  }
});

searchHistoryButton.addEventListener("click", function () {
  for (let i = 0; i < pageSearch.length; i++) pageSearch[i].classList.remove("d-none");
  for (let i = 0; i < pageFavorite.length; i++) pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++) pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++) pageGemini[i].classList.add("d-none");

  searchHistoryButton.classList.add("active-button");
  favoriteListButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.remove("active-button");

  subtitleElement.textContent = chrome.i18n.getMessage("searchHistorySubtitle");
  if (!hasHistory) {
    emptyMessage.style.display = "block";
    clearButton.disabled = true;
  } else {
    emptyMessage.style.display = "none";
    clearButton.disabled = false;
  }

  deleteListButton.disabled = false;

  updateInput();
});

favoriteListButton.addEventListener("click", function () {
  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    updateFavoriteListContainer(favoriteList);
  });

  for (let i = 0; i < pageSearch.length; i++) pageSearch[i].classList.add("d-none");
  for (let i = 0; i < pageFavorite.length; i++) pageFavorite[i].classList.remove("d-none");
  for (let i = 0; i < pageDelete.length; i++) pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++) pageGemini[i].classList.add("d-none");

  favoriteListButton.classList.add("active-button");
  searchHistoryButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.remove("active-button");

  subtitleElement.textContent = chrome.i18n.getMessage("favoriteListSubtitle");
  if (!hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  } else {
    favoriteEmptyMessage.style.display = "none";
  }

  deleteListButton.disabled = false;

  updateInput();
});

deleteListButton.addEventListener("click", function () {
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

geminiSummaryButton.addEventListener("click", function () {
  for (let i = 0; i < pageSearch.length; i++) pageSearch[i].classList.add("d-none");
  for (let i = 0; i < pageFavorite.length; i++) pageFavorite[i].classList.add("d-none");
  for (let i = 0; i < pageDelete.length; i++) pageDelete[i].classList.add("d-none");
  for (let i = 0; i < pageGemini.length; i++) pageGemini[i].classList.remove("d-none");

  searchHistoryButton.classList.remove("active-button");
  favoriteListButton.classList.remove("active-button");
  geminiSummaryButton.classList.add("active-button");
  deleteListButton.disabled = true;

  subtitleElement.textContent = chrome.i18n.getMessage("geminiSummarySubtitle");

  // Clear summary data if it's older than 1 hour
  chrome.storage.local.get(["summaryList", "timestamp"], function(result) {
    if (result.timestamp) {
      const currentTime = Date.now();
      const elapsedTime = (currentTime - result.timestamp) / 1000; // time in seconds
      if (elapsedTime > 3600) {
        chrome.storage.local.remove(["summaryList", "timestamp"]);
      } else {
        if (result.summaryList) {
          hasSummary = true;
          geminiEmptyMessage.classList.add("d-none");
          summaryListContainer.innerHTML = constructSummaryHTML(result.summaryList);
        }
      }
    }
  });
});

function constructSummaryHTML(summaryList) {
  let html = '<ul class="list-group d-flex">';

  summaryList.forEach((item, index) => {
    const isLastItem = index === summaryList.length - 1;
    const mbClass = isLastItem ? "" : "mb-3";

    html += `
      <li class="list-group-item border rounded px-3 summary-list d-flex justify-content-between align-items-center ${mbClass}">
        <span>${item.name}</span>
        <span class="d-none">${item.clue}</span>
      </li>
    `;
  });

  html += "</ul>";
  return html;
}

exportButton.addEventListener("click", function () {
  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    const json = JSON.stringify(favoriteList);

    const blob = new Blob([json], {
      type: "application/json",
    });

    // Create a temporary anchor element and trigger the download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "TheMapsExpress_FavoriteList.json";
    a.click();
  });
});

// Allow the user to select a file from their device
importButton.addEventListener("click", function () {
  fileInput.click();
});

fileInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      let importedData = [];
      const fileContent = event.target.result;

      if (fileContent && fileContent.length > 0) {
        importedData = JSON.parse(fileContent);
        favoriteEmptyMessage.style.display = "none";
      } else {
        favoriteEmptyMessage.style.display = "block";
      }

      chrome.storage.local.set({ favoriteList: importedData }, function () {
        updateFavoriteListContainer(importedData);
        updateHistoryFavoriteIcons();
      });

    } catch (error) {
      favoriteEmptyMessage.style.display = "block";
      favoriteEmptyMessage.innerText = chrome.i18n.getMessage("importErrorMsg");
    }
  };

  reader.readAsText(file);
});

// Update the favorite icons in the search history list
function updateHistoryFavoriteIcons() {
  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    const historyItems = document.querySelectorAll(".history-list");
    historyItems.forEach(item => {
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

deleteButton.addEventListener("click", function () {
  if (searchHistoryButton.classList.contains("active-button")) {
    deleteFromHistoryList();
  } else {
    deleteFromFavoriteList();
  }
  backToNormal();
});

// Track the click event on li elements
searchHistoryListContainer.addEventListener("click", function (event) {
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

    // Check if the clicked element has the "bi" class (indicating it is the icon)
    if (event.target.classList.contains("bi")) {
      // Add the selected text to the favorite list
      addToFavoriteList(selectedText);
      event.target.className =
        "bi bi-patch-check-fill matched spring-animation";

      setTimeout(function () {
        event.target.classList.remove("spring-animation");
      }, 500);
      chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
        updateFavoriteListContainer(favoriteList);
      });
    } else if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      // Open in a new window
      window.open(searchUrl, "_blank");
    }
  }
});

favoriteListContainer.addEventListener("click", function (event) {
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

    if (event.target.classList.contains("bi")) {
      return;
    } else if (event.target.classList.contains("form-check-input")) {
      return;
    } else {
      window.open(searchUrl, "_blank");
    }
  }
});

summaryListContainer.addEventListener("click", function (event) {
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

  // window.open(searchUrl, "_blank", "popup");
  chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
});

// Track the click event on clear button
clearButton.addEventListener("click", () => {
  // Clear all searchHistoryList data
  chrome.storage.local.set({ searchHistoryList: [] });

  clearButton.disabled = true;
  searchHistoryListContainer.innerHTML = "";

  emptyMessage.style.display = "block";
  emptyMessage.innerHTML = chrome.i18n.getMessage("clearedUpMsg").replace(/\n/g, "<br>");

  hasHistory = false;

  // Send a message to background.js to request clearing of selected text list data
  chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });
});

// Track the storage change event
chrome.storage.onChanged.addListener((changes) => {
  const favoriteListChange = changes.favoriteList;

  if (favoriteListChange && favoriteListChange.newValue) {
    updateFavoriteListContainer(favoriteListChange.newValue);
  }
});

function addToFavoriteList(selectedText) {
  chrome.runtime.sendMessage({ action: "addToFavoriteList", selectedText });
  exportButton.disabled = false;
}

// Update the favorite list container
function updateFavoriteListContainer(favoriteList) {
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
        "list-group-item border rounded mb-3 px-3 favorite-list d-flex justify-content-between align-items-center";

      const span = document.createElement("span");
      span.textContent = selectedText;
      li.appendChild(span);

      const favoriteIcon = document.createElement("i");
      favoriteIcon.className = "bi bi-patch-check-fill matched";
      li.appendChild(favoriteIcon);

      const checkbox = document.createElement("input");
      checkbox.className = "form-check-input d-none";
      checkbox.type = "checkbox";
      checkbox.value = "delete";
      checkbox.id = "checkDelete";
      checkbox.ariaLabel = "Delete";
      checkbox.style.cursor = "pointer";
      li.appendChild(checkbox);
      fragment.appendChild(li);

      exportButton.disabled = false;
    });
    ul.appendChild(fragment);
    favoriteListContainer.appendChild(ul);

    const lastListItem = favoriteListContainer.querySelector(".list-group .list-group-item:first-child");
    if (lastListItem) {
      lastListItem.classList.remove("mb-3");
    }

    attachCheckboxEventListener(favoriteListContainer);
  } else {
    favoriteEmptyMessage.style.display = "block";
    hasFavorite = false;
    exportButton.disabled = true;
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
      emptyMessage.innerHTML = chrome.i18n.getMessage("clearedUpMsg").replace(/\n/g, "<br>");
    }
  });
}

function deleteFromFavoriteList() {
  const checkedBoxes = favoriteListContainer.querySelectorAll("input:checked");
  const selectedTexts = [];

  checkedBoxes.forEach((checkbox) => {
    const listItem = checkbox.closest("li");
    const selectedText = listItem.querySelector("span").textContent;
    selectedTexts.push(selectedText);
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
      favoriteEmptyMessage.innerHTML = chrome.i18n.getMessage("clearedUpMsg").replace(/\n/g, "<br>");
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
    deleteButtonSpan.textContent = chrome.i18n.getMessage("deleteBtnText", checkedCount + "");
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

for (var i = 0; i < configureElements.length; i++) {
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

searchInput.placeholder = chrome.i18n.getMessage("searchInputPlaceholder");

// Ignore pressing the Enter key which means confirmation
let isComposing = false;
searchInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
searchInput.addEventListener("compositionend", () => {
  isComposing = false;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && isComposing) {
    e.stopPropagation();
  }
}, true)

// Get Gemini response
const responseField = document.getElementById("response");

sendButton.addEventListener("click", () => {
  sendButton.disabled = true;

  summaryListContainer.innerHTML = "";

  chrome.storage.local.get("geminiApiKey", function (data) {
    const apiKey = data.geminiApiKey;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getContent" }, (response) => {
        if (response && response.content) {
          summarizeContent(response.content, apiKey);

          geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiLoadMsg");
          geminiEmptyMessage.classList.remove("d-none");
          geminiEmptyMessage.classList.add("shineText");

          const originalText = geminiEmptyMessage.innerHTML;
          const divisor = isPredominantlyLatinChars(response.content) ? 1500 : 750;

          const newText = originalText.replace("NaN", Math.ceil(response.length / divisor));
          geminiEmptyMessage.innerHTML = newText;
        }
      });
    });
  });
});

// Check if the content is predominantly Latin characters
function isPredominantlyLatinChars(text) {
  const latinChars = text.match(/[a-zA-Z\u00C0-\u00FF]/g)?.length || 0;
  const squareChars = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0;

  return latinChars > squareChars;
}

function summarizeContent(content, apiKey) {
  responseField.value = "";

  chrome.runtime.sendMessage({ action: "callApi", text: content, apiKey: apiKey }, (response) => {
    if (response.error) {
      responseField.value = `API Error: ${response.error}`;
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiErrorMsg");
    } else {
      responseField.value = response;
      try {
        summaryListContainer.innerHTML = response;
        const lastListItem = summaryListContainer.querySelector(".list-group .list-group-item:last-child");
        if (lastListItem) {
          lastListItem.classList.remove("mb-3");
        }
        hasSummary = true;
        geminiEmptyMessage.classList.remove("shineText");
        geminiEmptyMessage.classList.add("d-none");

        // store the response and current time
        const listItems = document.querySelectorAll(".summary-list");
        const data = [];

        listItems.forEach(item => {
          const nameSpan = item.querySelector("span:first-child").textContent;
          const clueSpan = item.querySelector("span.d-none").textContent;
          data.push({ name: nameSpan, clue: clueSpan });
        });

        const currentTime = Date.now();
        chrome.storage.local.set({ summaryList: data, timestamp: currentTime });

      } catch (error) {
        responseField.value = `HTML Error: ${error}`;
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiErrorMsg");
      }
    }
    sendButton.disabled = false;
  });
}

// Google AI Studio link
const pElement = document.querySelector('p[data-locale="apiNote"]');

const originalText = pElement.innerHTML;
const newText = originalText.replace("Google AI Studio",
  '<a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>');
pElement.innerHTML = newText;

// Save the API key
document.getElementById("apiForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const apiKey = apiInput.value;

  chrome.storage.local.set({ geminiApiKey: apiKey });

  verifyApiKey(apiKey).then(isValid => {
    if (isValid) {
      if (hasSummary) {
        geminiEmptyMessage.classList.add("d-none");
      }
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
      sendButton.disabled = false;
    } else {
      geminiEmptyMessage.classList.remove("d-none");
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("apiInvalidMsg");
      sendButton.disabled = true;
      chrome.storage.local.remove(["summaryList", "timestamp"]);
      summaryListContainer.innerHTML = "";
      hasSummary = false;
    }
  });
});

// Function to verify the API key
async function verifyApiKey(apiKey) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const data = {
    contents: [{
      parts: [{
        text: "test"
      }]
    }]
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    const candidates = await response.json();
    if (candidates.error) {
      throw new Error(candidates.error.message);
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Clear the API key
const apiModal = document.getElementById("apiModal");
apiModal.addEventListener("hidden.bs.modal", function () {
  apiInput.value = "";
});

apiModal.addEventListener("shown.bs.modal", function () {
  apiInput.focus();
});

// tooltips
geminiSummaryButton.title = chrome.i18n.getMessage("geminiLabel");
searchHistoryButton.title = chrome.i18n.getMessage("historyLabel");
favoriteListButton.title = chrome.i18n.getMessage("favoriteLabel");
deleteListButton.title = chrome.i18n.getMessage("deleteLabel");
enterButton.title = chrome.i18n.getMessage("enterLabel");
configureElements[0].title = chrome.i18n.getMessage("shortcutsLabel");
configureElements[1].title = chrome.i18n.getMessage("shortcutsLabel");
const apiSaveButton = document.querySelectorAll(".modal-body #apiForm button");
apiSaveButton[0].title = chrome.i18n.getMessage("saveLabel");