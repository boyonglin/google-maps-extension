// Track messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "getSelectedText") {
    // Get the selected text from the webpage
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText });
  }
});
