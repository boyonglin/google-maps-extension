let searchHistoryList = [];
let favoriteList = [];
var maxListLength = 10;

// Create the right-click context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "myContextMenuId",
    title: "Search by Google Maps (fast)",
    contexts: ["selection"],
  });
});

// Track the right-click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check if clicked menu item ID matches the ID defined in manifest.json
  if (info.menuItemId === "myContextMenuId") {
    const selectedText = info.selectionText;
    handleSelectedText(selectedText);
  }
});

// Track the shortcuts event
chrome.commands.onCommand.addListener((command) => {
  if (command === "run-search") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Check that the tab array is not empty
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "getSelectedText" },
          (response) => {
            if (response && response.selectedText) {
              const selectedText = response.selectedText;
              handleSelectedText(selectedText);
            }
          }
        );
      }
    });
  }
});

// Handle selected text and send messages to background.js
function handleSelectedText(selectedText) {
  // Check that the selected text is not empty or null
  if (!selectedText || selectedText.trim() === "") {
    console.log("No valid selected text.");
    return;
  }

  // Use chrome.tabs.create to open a new tab for search
  const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    selectedText
  )}`;
  chrome.tabs.create({ url: searchUrl });

  updateTextList(selectedText);
}

// Track the runtime.onMessage event
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the action in the message is "clearSearchHistoryList"
  if (request.action === "clearSearchHistoryList") {
    // Perform the operation to clear the selected text list data
    chrome.storage.local.set({ searchHistoryList: [] });
    // Send a response message to popup.js indicating that the clear operation is completed
    sendResponse({ message: "Selected text list cleared." });
  } else if (request.action === "searchInput") {
    var searchTerm = request.searchTerm;
    // If the user has entered a keyword, search
    if (searchTerm) {
      const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
        searchTerm
      )}`;
      chrome.tabs.create({ url: searchUrl });
      updateTextList(searchTerm);
    }
  } else if (request.action === "addToFavoriteList") {
    const selectedText = request.selectedText;
    addToFavoriteList(selectedText);
  }
});

function updateTextList(selectedText) {
  // Store the selected text to storage
  chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
    // If searchHistoryList is not set, initialize as an empty array
    if (!searchHistoryList) {
      searchHistoryList = [];
    }

    // If already exists in searchHistoryList, remove the old one
    // Add the newly selected text to searchHistoryList
    const index = searchHistoryList.findIndex((item) => item === selectedText);
    if (index !== -1) {
      searchHistoryList.splice(index, 1);
    }
    searchHistoryList.push(selectedText);

    // If the number of items in searchHistoryList exceeds maxListLength, keep only the last items
    if (searchHistoryList.length > maxListLength) {
      searchHistoryList.shift();
    }

    // Store the updated searchHistoryList to storage
    chrome.storage.local.set({ searchHistoryList });
  });
}

function addToFavoriteList(selectedText) {
  // Store the selected text to storage as part of the favorite list
  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    // If favoriteList is not set, initialize as an empty array
    if (!favoriteList) {
      favoriteList = [];
    }

    // If already exists in favoriteList, remove the old one
    // Add the newly selected text to favoriteList
    const index = favoriteList.findIndex((item) => item === selectedText);
    if (index !== -1) {
      favoriteList.splice(index, 1);
    }
    favoriteList.push(selectedText);

    // Store the updated favoriteList to storage
    chrome.storage.local.set({ favoriteList });
  });
}
