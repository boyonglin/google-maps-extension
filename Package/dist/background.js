// Define and initialize selectedTextList as an empty array
let selectedTextList = [];
var maxListLength = 10;

// Create the right-click context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "myContextMenuId",
    title: "Search by Google Maps (fast)",
    contexts: ["selection"]
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
        chrome.tabs.sendMessage(tabs[0].id, { action: "getSelectedText" }, (response) => {
          if (response && response.selectedText) {
            const selectedText = response.selectedText;
            handleSelectedText(selectedText);
          }
        });
      }
    });
  }
});

// Handle selected text and send messages to background.js
function handleSelectedText(selectedText) {

  // Check that the selected text is not empty or null
  if (!selectedText || selectedText.trim() === '') {
    console.log("No valid selected text.");
    return;
  }

  // Use chrome.tabs.create to open a new tab for search
  const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(selectedText)}`;
  chrome.tabs.create({ url: searchUrl });

  updateTextList(selectedText);
}

// Track the runtime.onMessage event
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Check if the action in the message is "clearSelectedTextList"
  if (request.action === 'clearSelectedTextList') {
    // Perform the operation to clear the selected text list data
    chrome.storage.local.set({ selectedTextList: [] });
    // Send a response message to popup.js indicating that the clear operation is completed
    sendResponse({ message: 'Selected text list cleared.' });
  }

  else if (request.action === 'searchInput') {
    var searchTerm = request.searchTerm;
    // If the user has entered a keyword, search
    if (searchTerm) {
      const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(searchTerm)}`;
      chrome.tabs.create({ url: searchUrl });
      updateTextList(searchTerm);
    }
  }
});

function updateTextList(selectedText) {
  // Store the selected text to storage
  chrome.storage.local.get("selectedTextList", ({ selectedTextList }) => {
    // If selectedTextList is not set, initialize as an empty array
    if (!selectedTextList) {
      selectedTextList = [];
    }

    // If already exists in selectedTextList, remove the old one
    // Add the newly selected text to selectedTextList
    const index = selectedTextList.findIndex(item => item === selectedText);
    if (index !== -1) {
      selectedTextList.splice(index, 1);
    }
    selectedTextList.push(selectedText);

    // If the number of items in selectedTextList exceeds maxListLength, keep only the last items
    if (selectedTextList.length > maxListLength) {
      selectedTextList.shift();
    }

    // Store the updated selectedTextList to storage
    chrome.storage.local.set({ selectedTextList });
  });
};