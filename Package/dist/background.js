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
    console.error("No valid selected text.");
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

function callApi(content, apiKey, sendResponse) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const customPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please list the most relevant sub-landmarks (these can be marked by <h2> or <strong>) associated with the content subject or topic (identified by the <title> or <h1>) from the provided page. Please format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for contextual clues around it, these can include cities or states or countries, then fill in <span> for the clue. It’s best to choose only one key clue. The final format should look like this example (do not include the example or other tags like <h1>):

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
  </ul>

  Here is the provided page content:
  `;

  const data = {
    contents: [{
      parts: [{
        text: customPrompt + content
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

let activeTabId = null;

// When the icon is clicked, inject or remove the iframe
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.startsWith("http")) {
    const iframeStatus = await getIframeStatus(tab.id);
    if (iframeStatus?.injected) {
      chrome.tabs.sendMessage(tab.id, { action: "removeIframe" });
    } else {
      tryInjectIframe(tab.id);
    }
  } else {
    console.error("Cannot execute extension on non-HTTP URL.");
  }
});

// Retry mechanism for injecting iframe
async function tryInjectIframe(tabId, retries = 10) {
  while (retries > 0) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "injectIframe" });
      return;
    } catch (error) {
      if (error.message.includes("Receiving end does not exist")) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        retries--;
      } else {
        throw error;
      }
    }
  }
  chrome.runtime.pendingAction = { tabId: tabId };
}

// Update iframe status
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (sender.tab.id === activeTabId) {
    if (message.type === "iframeLoaded") {
      await setIframeStatus(activeTabId, true);
      chrome.tabs.sendMessage(activeTabId, { action: "adjustIframeX" });
    } else if (message.type === "iframeRemoved") {
      await setIframeStatus(activeTabId, false);
    }

    updateIcon(activeTabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // When the tab is loaded, stop pending and inject the iframe
  if (chrome.runtime.pendingAction?.tabId === tabId && changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { action: "injectIframe" });
    chrome.runtime.pendingAction = null;
  }

  // When the tab reloads, reset the iframe status
  if (changeInfo.status === "loading" && tab.active) {
    await setIframeStatus(tabId, false);
    updateIcon(tabId);
  }
});

// Handle active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  updateIcon(activeTabId);
});

// Handle active window changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // No window is focused
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  // Get the active tab in the focused window
  const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
  if (tabs.length > 0) {
    activeTabId = tabs[0].id;
    updateIcon(activeTabId);
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeIframeStatus(tabId);
});

async function getIframeStatus(tabId) {
  const result = await chrome.storage.session.get(`iframeStatus_${tabId}`);
  return result[`iframeStatus_${tabId}`] || { injected: false };
}

async function setIframeStatus(tabId, injected) {
  await chrome.storage.session.set({ [`iframeStatus_${tabId}`]: { injected: injected } });
}

async function removeIframeStatus(tabId) {
  await chrome.storage.session.remove(`iframeStatus_${tabId}`);
}

// Function to update the icon based on iframe status
async function updateIcon(tabId) {
  const iframeStatus = await getIframeStatus(tabId);
  const path = iframeStatus?.injected ? {
    "16": "../images/icon-16.png",
    "32": "../images/icon-32.png",
    "48": "../images/icon-48.png",
    "128": "../images/icon-128.png"
  } : {
    "16": "../images/icon-opacity-16.png",
    "32": "../images/icon-opacity-32.png",
    "48": "../images/icon-opacity-48.png",
    "128": "../images/icon-opacity-128.png"
  };

  chrome.action.setIcon({ path });
}

chrome.windows.onBoundsChanged.addListener(async (window) => {
  const tabs = await chrome.tabs.query({ active: true, windowId: window.id });

  if (tabs.length > 0) {
    const activeTab = tabs[0];
    const url = activeTab.url;

    if (url && url.startsWith("http")) {
      activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { action: "adjustIframeX" });
    } else {
      return;
    }
  }
});
