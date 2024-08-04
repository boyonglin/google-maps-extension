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
  if (request.action === "openTab") {
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
    files: ["dist/contentScript.js"]
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callApi" && request.text) {
    callApi(request.text, request.apiKey, sendResponse);
    return true; // Will respond asynchronously
  }
});

function callApi(text, apiKey, sendResponse) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const customPrompt = `You are now a place seeker tasked with identifying specific places or landmarks mentioned in the page content. Please list the most relevant sub-landmarks (these can be marked by <h2> or <strong>) associated with the subject or topic (identified by the <title> or <h1>) from the provided page content. Please format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for contextual clues around it, these can include cities or states or countries, then fill in <span> for the clue. It’s best to choose only one key clue. The final format should look like this example (do not include the example or other tags like <h1>):

  <ul class="list-group d-flex">
    <li class="list-group-item border rounded mb-3 px-3 summary-list">
      <span>Sub-landmark 1</span>
      <span class="d-none">Clue 1</span>
    </li>
    <li class="list-group-item border rounded mb-3 px-3 summary-list">
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
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(data => {
      const generatedText = data.candidates[0].content.parts[0].text;
      sendResponse(generatedText);
    })
    .catch((error) => {
      console.error("Error:", error);
      sendResponse({ error: error.toString() });
    });
}

// let popupWindowId = null;

// chrome.action.onClicked.addListener(async () => {
//   const result = await chrome.storage.local.get("coords");
//   const coords = result.coords || { x: 1040, y: 120 };

//   chrome.windows.create({
//     url: "../popup.html",
//     type: "popup",
//     width: 400,
//     height: 420,
//     left: coords.x,
//     top: coords.y
//   }, (popupWindow) => {
//     popupWindowId = popupWindow.id;

//     // Update position when the window is moved
//     chrome.windows.onBoundsChanged.addListener(async (window) => {
//       if (window.id === popupWindowId) {
//         const updatedWindow = await chrome.windows.get(popupWindowId);
//         const { left, top } = updatedWindow;
//         await chrome.storage.local.set({ coords: { x: left, y: top } });
//       }
//     });
//   });
// });

// // Resize the window to fit the content
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "content-size" && popupWindowId !== null) {
//     chrome.windows.update(popupWindowId, {
//       width: message.width + message.frameWidth,
//       height: message.height + message.titleBarHeight
//     });
//   }
// });