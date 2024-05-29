// Context
const emptyMessage = document.getElementById("emptyMessage");
const favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");
const searchInput = document.getElementById("searchInput");
const subtitleElement = document.getElementById("subtitle");

// Lists
const searchHistoryListContainer = document.getElementById("searchHistoryList");
const favoriteListContainer = document.getElementById("favoriteList");
const searchHistoryButton = document.getElementById("searchHistoryButton");
const favoriteListButton = document.getElementById("favoriteListButton");
const deleteListButton = document.getElementById("deleteListButton");

// Buttons
const searchButtonGroup = document.getElementById("searchButtonGroup");
const deleteButtonGroup = document.getElementById("deleteButtonGroup");
const exportButtonGroup = document.getElementById("exportButtonGroup");
const clearButton = document.getElementById("clearButton");
const cancelButton = document.getElementById("cancelButton");
const deleteButton = document.getElementById("deleteButton");
const deleteButtonSpan = document.querySelector("#deleteButton > i + span");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("fileInput");

let [hasHistory, hasFavorite] = [false, false];

// Track keypress events on the search bar
if (searchInput) {
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
}

// Executed after the document has finished loading
document.addEventListener("DOMContentLoaded", function () {
  if (!hasHistory) {
    emptyMessage.style.display = "block";
  }

  // Add event listeners to the checkboxes
  attachEventListeners(searchHistoryListContainer);
  attachEventListeners(favoriteListContainer);
});

function attachEventListeners(container) {
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

searchHistoryButton.addEventListener("click", function () {
  searchButtonGroup.classList.remove("d-none");
  exportButtonGroup.classList.add("d-none");

  searchHistoryListContainer.style.display = "block";
  favoriteListContainer.style.display = "none";

  searchHistoryButton.classList.add("active-button");
  favoriteListButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");

  subtitleElement.textContent = chrome.i18n.getMessage("searchHistorySubtitle");
  if (!hasHistory) {
    emptyMessage.style.display = "block";
    clearButton.disabled = true;
    clearButton.setAttribute("aria-disabled", "true");
  } else {
    emptyMessage.style.display = "none";
    clearButton.disabled = false;
    clearButton.setAttribute("aria-disabled", "false");
  }
  favoriteEmptyMessage.style.display = "none";

  updateInput();
});

favoriteListButton.addEventListener("click", function () {
  searchButtonGroup.classList.add("d-none");
  exportButtonGroup.classList.remove("d-none");

  favoriteListContainer.style.display = "block";
  searchHistoryListContainer.style.display = "none";

  favoriteListButton.classList.add("active-button");
  searchHistoryButton.classList.remove("active-button");
  deleteListButton.classList.remove("active-button");

  subtitleElement.textContent = chrome.i18n.getMessage("favoriteListSubtitle");
  if (!hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  } else {
    favoriteEmptyMessage.style.display = "none";
  }
  emptyMessage.style.display = "none";
  clearButton.disabled = true;
  clearButton.setAttribute("aria-disabled", "true");

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
      updateDeleteCount();
    } else {
      searchHistoryButton.disabled = true;
      updateDeleteCount();
    }
  }
});

exportButton.addEventListener("click", function () {
  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    const json = JSON.stringify(favoriteList);

    const blob = new Blob([json], {
      type: "application/json",
    });

    // Create a temporary anchor element and trigger the download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "GoogleMapsFast_FavoriteList.json";
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
      const importedData = JSON.parse(event.target.result);
      chrome.storage.local.set({ favoriteList: importedData });
    } catch (error) {
      alert("Please retry or report the issue: ", error);
    }
  };

  reader.readAsText(file);

  chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
    updateFavoriteListContainer(favoriteList);
  });
});

cancelButton.addEventListener("click", backToNormal);

deleteButton.addEventListener("click", function () {
  if (searchHistoryButton.classList.contains("active-button")) {
    deleteFromHistoryList();
  } else {
    deleteFromFavoriteList();
  }
  backToNormal();
});

// Retrieve searchHistoryList and favoriteList from Chrome storage
chrome.storage.local.get(
  ["searchHistoryList", "favoriteList"],
  ({ searchHistoryList, favoriteList }) => {
    if (searchHistoryList && searchHistoryList.length > 0) {
      emptyMessage.style.display = "none";
      favoriteEmptyMessage.style.display = "none";
      hasHistory = true;

      const ul = document.createElement("ul");
      ul.className = "list-group d-flex flex-column-reverse";

      // Create list item from new selectedText
      searchHistoryList.forEach((selectedText) => {
        const li = document.createElement("li");
        li.className =
          "list-group-item border rounded mb-3 px-3 history-list d-flex justify-content-between";

        const span = document.createElement("span");
        span.textContent = selectedText;
        li.appendChild(span);

        const favoriteIcon = document.createElement("i");
        favoriteIcon.className =
          favoriteList && favoriteList.includes(selectedText)
            ? "bi bi-patch-check-fill matched"
            : "bi bi-patch-plus-fill";
        li.appendChild(favoriteIcon);

        const checkbox = document.createElement("input");
        checkbox.className = "form-check-input d-none";
        checkbox.type = "checkbox";
        checkbox.value = "delete";
        checkbox.id = "checkDelete";
        li.appendChild(checkbox);
        ul.appendChild(li);
      });
      searchHistoryListContainer.appendChild(ul);
    } else {
      emptyMessage.style.display = "block";
      favoriteEmptyMessage.style.display = "none";
      hasHistory = false;
      clearButton.disabled = true;
      clearButton.setAttribute("aria-disabled", "true");
    }

    if (favoriteList && favoriteList.length > 0) {
      favoriteEmptyMessage.style.display = "none";
      emptyMessage.style.display = "none";
      hasFavorite = true;

      const ul = document.createElement("ul");
      ul.className = "list-group d-flex flex-column-reverse";

      // Create list item from new selectedText
      favoriteList.forEach((selectedText) => {
        const li = document.createElement("li");
        li.className =
          "list-group-item border rounded mb-3 px-3 favorite-list d-flex justify-content-between";

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
        li.appendChild(checkbox);
        ul.appendChild(li);
      });
      favoriteListContainer.appendChild(ul);
    } else {
      hasFavorite = false;
      exportButton.disabled = true;
    }
  }
);

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

// Track the click event on clear button
clearButton.addEventListener("click", () => {
  searchHistoryListContainer.innerHTML = "";
  hasHistory = false;
  // Send a message to background.js to request clearing of selected text list data
  chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });

  // Clear all searchHistoryList data
  chrome.storage.local.set({ searchHistoryList: [] }, () => {
    clearButton.disabled = true;
    clearButton.setAttribute("aria-disabled", "true");
    emptyMessage.style.display = "block";
    emptyMessage.innerHTML = chrome.i18n.getMessage('clearedUpMsg');
  });
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
    emptyMessage.style.display = "none";
    hasFavorite = true;

    const ul = document.createElement("ul");
    ul.className = "list-group d-flex flex-column-reverse";

    // Create list item from new selectedText
    favoriteList.forEach((selectedText) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item border rounded mb-3 px-3 favorite-list d-flex justify-content-between";

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
      li.appendChild(checkbox);
      ul.appendChild(li);

      exportButton.disabled = false;
    });

    favoriteListContainer.appendChild(ul);

    attachEventListeners(favoriteListContainer);
  } else {
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
      emptyMessage.innerHTML = chrome.i18n.getMessage('clearedUpMsg');
      emptyMessage.style.display = "block";
      hasHistory = false;
      clearButton.disabled = true;
      clearButton.setAttribute("aria-disabled", "true");
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
      favoriteEmptyMessage.innerHTML = chrome.i18n.getMessage('clearedUpMsg');
      favoriteEmptyMessage.style.display = "block";
      hasFavorite = false;
      exportButton.disabled = true;
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
    deleteButtonSpan.textContent = chrome.i18n.getMessage('deleteBtnText', checkedCount + '');
    deleteButton.classList.remove("disabled");
    deleteButton.setAttribute("aria-disabled", "false");
  } else {
    deleteButtonSpan.textContent = chrome.i18n.getMessage('deleteBtnTextEmpty');
    deleteButton.classList.add("disabled");
    deleteButton.setAttribute("aria-disabled", "true");
  }
}

function backToNormal() {
  deleteListButton.classList.remove("active-button");
  deleteButtonGroup.classList.add("d-none");

  if (searchHistoryButton.classList.contains("active-button")) {
    searchButtonGroup.classList.remove("d-none");
    favoriteListButton.disabled = false;
    favoriteListButton.setAttribute("aria-disabled", "false");
  } else {
    exportButtonGroup.classList.remove("d-none");
    searchHistoryButton.disabled = false;
    searchHistoryButton.setAttribute("aria-disabled", "false");
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
