const emptyMessage = document.getElementById("emptyMessage");
const favoriteEmptyMessage = document.getElementById("favoriteEmptyMessage");
const clearButton = document.getElementById("clearButton");
const searchInput = document.getElementById("searchInput");
const searchHistoryListContainer = document.getElementById("searchHistoryList");
const favoriteListContainer = document.getElementById("favoriteList");
const searchHistoryButton = document.getElementById("searchHistoryButton");
const favoriteListButton = document.getElementById("favoriteListButton");
const deleteHistoryButton = document.getElementById("deleteHistoryButton");
const titleElement = document.getElementById("title");
let [hasHistory, hasFavorite]  = [false, false];
let favoriteIndices = [];

// Track the click event on the lists button
searchHistoryButton.addEventListener("click", function () {
  searchHistoryListContainer.style.display = "block";
  favoriteListContainer.style.display = "none";

  searchHistoryButton.classList.add("active-button");
  favoriteListButton.classList.remove("active-button");
  deleteHistoryButton.classList.remove("active-button");

  titleElement.textContent = "Search History";
  if (!hasHistory) {
    emptyMessage.style.display = "block";
  }
  favoriteEmptyMessage.style.display = "none";
});

favoriteListButton.addEventListener("click", function () {
  favoriteListContainer.style.display = "block";
  searchHistoryListContainer.style.display = "none";

  favoriteListButton.classList.add("active-button");
  searchHistoryButton.classList.remove("active-button");
  deleteHistoryButton.classList.remove("active-button");

  titleElement.textContent = "Favorite List";
  if (!hasFavorite) {
    favoriteEmptyMessage.style.display = "block";
  }
  emptyMessage.style.display = "none";
});

deleteHistoryButton.addEventListener("click", function () {
  if (deleteHistoryButton.classList.contains("active-button")) {
    deleteHistoryButton.classList.remove("active-button");
  } else {
    deleteHistoryButton.classList.add("active-button");
    deleteHistoryButton.style.pointerEvents = "auto";
  }
});

// Read selected text list from storage
chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
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
      favoriteIcon.className = "bi bi-patch-plus-fill";

      li.appendChild(favoriteIcon);
      ul.appendChild(li);
    });
    searchHistoryListContainer.appendChild(ul);
  } else {
    emptyMessage.style.display = "block";
    favoriteEmptyMessage.style.display = "none";
    hasHistory = false;
    clearButton.disabled = true;
  }
});

chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
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
      ul.appendChild(li);
    });
    favoriteListContainer.appendChild(ul);
  } else {
    hasFavorite = false;
  }
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

  const selectedText = liElement.textContent;
  const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    selectedText
  )}`;

  // Check if the clicked element has the "bi" class (indicating it is the icon)
  if (event.target.classList.contains("bi")) {
    // Add the selected text to the favorite list
    addToFavoriteList(selectedText);
    // Change the favorite icon
    event.target.classList.replace("bi-patch-plus-fill", "bi-patch-check-fill");
  } else {
    // Open in a new window
    window.open(searchUrl, "_blank");
  }
});

function addToFavoriteList(selectedText) {
  // Send a message to background.js to add the selected text to the favorite list
  chrome.runtime.sendMessage({ action: "addToFavoriteList", selectedText });
}

// Function to check if an item exists in the search history list
function isInFavoriteHistoryList(selectedText) {
  const favoriteListItems = favoriteListContainer.getElementsByTagName("li");
  for (let i = 0; i < favoriteListItems.length; i++) {
    const listItem = favoriteListItems[i];
    if (listItem.textContent === selectedText) {
      return true;
    }
  }
  return false;
}

// Track the click event on clear button
clearButton.addEventListener("click", () => {
  searchHistoryListContainer.innerHTML = "";
  // Send a message to background.js to request clearing of selected text list data
  chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });

  // Clear all searchHistoryList data
  chrome.storage.local.set({ searchHistoryList: [] }, () => {
    clearButton.disabled = true;
    clearButton.setAttribute("aria-disabled", "true");
    emptyMessage.style.display = "block";
    emptyMessage.innerHTML = "Cleared up! &#128077;&#127997;";
  });
});

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
