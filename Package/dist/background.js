let searchHistoryList = [];
let favoriteList = [];
var maxListLength = 10;

// Create the right-click context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "myContextMenuId",
    title: chrome.i18n.getMessage("contextMenus"),
    contexts: ["selection"],
  });
});

// Track the right-click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
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

  updateHistoryList(selectedText);
}

// Track the runtime.onMessage event
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "clearSearchHistoryList") {
    chrome.storage.local.set({ searchHistoryList: [] });
  } else if (request.action === "searchInput") {
    var searchTerm = request.searchTerm;
    if (searchTerm) {
      const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
        searchTerm
      )}`;
      chrome.tabs.create({ url: searchUrl });
      updateHistoryList(searchTerm);
    }
  } else if (request.action === "addToFavoriteList") {
    const selectedText = request.selectedText;
    addToFavoriteList(selectedText);
  }

  // Opens the tab without focusing on it
  if (request.action === 'openTab') {
    chrome.tabs.create({
      url: request.url,
      active: false
    });
  }
});

// Add the selected text to history list
function updateHistoryList(selectedText) {
  chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
    // Initialize
    if (!searchHistoryList) {
      searchHistoryList = [];
    }

    // Remove and rejoin existing selected text item
    const index = searchHistoryList.indexOf(selectedText);
    if (index !== -1) {
      searchHistoryList.splice(index, 1);
    }
    searchHistoryList.push(selectedText);

    // Trim excess items
    if (searchHistoryList.length > maxListLength) {
      searchHistoryList.shift();
    }

    // Updated searchHistoryList to storage
    chrome.storage.local.set({ searchHistoryList });
  });
}

// Add the target item to favorite list
function addToFavoriteList(selectedText) {
  chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
    if (!favoriteList) {
      favoriteList = [];
    }

    const index = favoriteList.indexOf(selectedText);
    if (index !== -1) {
      favoriteList.splice(index, 1);
    }
    favoriteList.push(selectedText);

    chrome.storage.local.set({ favoriteList });
  });
}

// Gemini API
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['dist/contentScript.js']
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callApi' && request.text) {
    callApi(request.text, request.apiKey, sendResponse);
    return true; // Will respond asynchronously
  }
});

function callApi(text, apiKey, sendResponse) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const customPrompt = `You are now a searcher for a specific location or landmark. Please list the sub-landmarks most relevant to the title (possibly <title> or <h1>) in the text below. Please Format the output as an unordered list (<ul>) with each sub-landmark as a list item (<li>), and retain the original language of the content. Moreover, look for contextual clues around the ambiguous sub-landmark name, these can include cities, states, or countries, then fill in <span> for the clue. Format like the example below (do not include the example or other tags like <h1>):

  <ul class="list-group d-flex">
    <li class="list-group-item border rounded mb-3 px-3 summary-list d-flex justify-content-between">
      <span>Sub-landmark 1</span>
      <span class="d-none">Clue 1</span>
    </li>
    <li class="list-group-item border rounded mb-3 px-3 summary-list d-flex justify-content-between">
      <span>Sub-landmark 2</span>
      <span class="d-none">Clue 2</span>
    </li>
    ...
  </ul>`;

  const data = {
    contents: [{
      parts: [{
        text: customPrompt + text
      }]
    }]
  };

  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(data => {
      const generatedText = data.candidates[0].content.parts[0].text;
      sendResponse(generatedText);
    })
    .catch((error) => {
      console.error('Error:', error);
      sendResponse({ error: error.toString() });
    });
}

