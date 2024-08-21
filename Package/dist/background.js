let searchHistoryList = [];
let favoriteList = [];
var maxListLength = 10;

const summaryPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks (marked by <h1>, <h2>, <h3>, or <strong>) that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. Avoid listing complete sentences from the original content as sub-landmarks. If different sub-landmarks share the same name, you may add a clue in parentheses after the sub-landmark to provide identifiable differences. Next, you should format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for contextual clues around it, these can include cities or states or countries, then fill in <span> for the clue. It's better to select only one key clue for each sub-landmark. The final format should look like this example (do not include the example or other tags like <h1>):

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

const linkPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks (marked by <h1>, <h2>, <h3>, or <strong>) that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. Avoid listing complete sentences from the original content as sub-landmarks. Retain the original language of the content. Additionally, based on the sub-landmark, look for contextual clues around it, these can include cities or states or countries. It's better to select only one key clue for each sub-landmark. Both the sub-landmark name and its corresponding clue must be provided as plain text, without any additional information or formatting, such as bullet points. Please format the results like this example (the sub-landmark is followed by four spaces and a clue):

sub-landmark-1    clue-1
sub-landmark-2    clue-2
...

Here is the provided page content:
`;

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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    const tabId = tabs[0].id;
    if (url && url.startsWith("http")) {
      if (command === "run-search") {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getSelectedText" }, (response) => {
          if (response && response.selectedText) {
            const selectedText = response.selectedText;
            handleSelectedText(selectedText);
          }
        });
      } else if (command === "auto-attach") {
        extpay.getUser().then(async user => {
          const now = new Date();

          // In trial period
          if (user.trialStartedAt && (now - user.trialStartedAt) < trialPeriod) {
            await trySuggest(tabId, url);
            chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "trial" });
          } else {

            // Paid user
            if (user.paid) {
              await trySuggest(tabId, url);
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "premium" });
            }

            // Free user
            else {
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "free" });
            }
          }
        });
      }
    } else {
      console.error("Cannot execute extension on non-HTTP URL.");
    }
  });
});

// Retry mechanism for trying to suggest places from the content
async function trySuggest(tabId, url, retries = 10) {
  while (retries > 0) {
    try {
      const apiKey = await getApiKey();
      const response = await getContent(tabId, { action: "getContent" });

      if (response && response.content) {
        // Special case for YouTube video descriptions
        if (url.startsWith("https://www.youtube")) {
          const ytLinkPrompt = linkPrompt.replace("(marked by <h1>, <h2>, <h3>, or <strong>) ", "");
          callApi(ytLinkPrompt, response.content, apiKey, (apiResponse) => {
            chrome.tabs.sendMessage(tabId, { action: "attachMapLink", content: apiResponse });
          });
        } else {
          callApi(linkPrompt, response.content, apiKey, (apiResponse) => {
            chrome.tabs.sendMessage(tabId, { action: "attachMapLink", content: apiResponse });
          });
        }

        return true;
      }
    } catch (error) {
      if (error.message.includes("Receiving end does not exist")) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        retries--;
      } else {
        throw new Error(`Something went wrong! Please report the issue to the developer: ${error.message}`);
      }
    }
  }
}

function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("geminiApiKey", function (data) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(data.geminiApiKey);
    });
  });
}

function getContent(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizeApi" && request.text) {

    // Special case for YouTube video descriptions
    if (request.url.startsWith("https://www.youtube")) {
      const ytSummaryPrompt = summaryPrompt.replace("(marked by <h1>, <h2>, <h3>, or <strong>) ", "");
      callApi(ytSummaryPrompt, request.text, request.apiKey, sendResponse);
    } else {
      callApi(summaryPrompt, request.text, request.apiKey, sendResponse);
    }
    return true; // Will respond asynchronously
  }
});

function callApi(prompt, content, apiKey, sendResponse) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const data = {
    contents: [{
      parts: [{
        text: prompt + content
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

// iframe injection
chrome.action.onClicked.addListener(meow);

function meow() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["dist/checkStatus.js"],
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results.length) {
          return; // Permission error, tab closed, etc.
        }
        var result = results[0].result;
        if (result !== true) {
          // chrome.action.setIcon({ path: "iconON.png", tabId: tabs[0].id });

          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["dist/inject.js"],
          });
        } else {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["dist/ejectLite.js"],
          });
        }
      }
    );
  });
}

// ExtensionPay
importScripts("ExtPay.js")

const trialPeriod = 7 * 24 * 60 * 60 * 1000 // 7 days
const extpay = ExtPay("the-maps-express")
extpay.startBackground();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const now = new Date();

  if (request.action === "extPay") {
    extpay.getUser().then(user => {
      // First time user
      if (!user.trialStartedAt) {
        extpay.openTrialPage("7-day");
        chrome.tabs.sendMessage(sender.tab.id, { action: "consoleQuote", stage: "first" });
      }

      // Trial or Pay
      else {
        if (user.trialStartedAt && (now - user.trialStartedAt) < trialPeriod) {
          extpay.openTrialPage();
        } else {
          extpay.openPaymentPage();
          chrome.tabs.sendMessage(sender.tab.id, { action: "consoleQuote", stage: "payment" });
        }
      }
    });
  } else if (request.action === "restorePay") {
    extpay.openLoginPage();
  } else if (request.action === "checkPay") {
    extpay.getUser().then(user => {
      const isPremium = user.paid;
      const isFirst = !user.trialStartedAt && !isPremium;
      const isTrial = user.trialStartedAt && (now - user.trialStartedAt) < trialPeriod && !isPremium;
      const isFree = !isFirst && !isTrial && !isPremium;
      const trialEnd = new Date(user.trialStartedAt).getTime() + trialPeriod;
      sendResponse({ result: { isFirst, isTrial, isPremium, isFree, trialEnd } });
    });
    return true;
  }
});

/********** Deprecated code **********/

// let activeTabId = null;

// // When the icon is clicked, inject or remove the iframe
// chrome.action.onClicked.addListener(async (tab) => {
//   if (tab.url && tab.url.startsWith("http")) {
//     const iframeStatus = await getIframeStatus(tab.id);
//     if (iframeStatus?.injected) {
//       chrome.tabs.sendMessage(tab.id, { action: "removeIframe" });
//     } else {
//       tryInjectIframe(tab.id);
//     }
//   } else {
//     console.error("Cannot execute extension on non-HTTP URL.");
//   }
// });

// // Retry mechanism for injecting iframe (inject faster before the tab is fully loaded)
// async function tryInjectIframe(tabId, retries = 10) {
//   while (retries > 0) {
//     try {
//       await chrome.tabs.sendMessage(tabId, { action: "injectIframe" });
//       return;
//     } catch (error) {
//       if (error.message.includes("Receiving end does not exist")) {
//         await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
//         retries--;
//       } else {
//         throw error;
//       }
//     }
//   }
//   chrome.runtime.pendingAction = { tabId: tabId };
// }

// // Update iframe status
// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (sender.tab.id === activeTabId) {
//     if (message.type === "iframeLoaded") {
//       await setIframeStatus(activeTabId, true);
//     } else if (message.type === "iframeRemoved") {
//       await setIframeStatus(activeTabId, false);
//     }
//     updateIcon(activeTabId);
//   }
// });

// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//   // When the tab is loaded, stop pending and inject the iframe
//   if (chrome.runtime.pendingAction?.tabId === tabId && changeInfo.status === "complete") {
//     chrome.tabs.sendMessage(tabId, { action: "injectIframe" });
//     chrome.runtime.pendingAction = null;
//   }

//   // When the tab reloads, reset the iframe status
//   const iframeStatus = await getIframeStatus(tab.id);
//   if (changeInfo.status === "loading" && tab.active && iframeStatus?.injected) {
//     await setIframeStatus(tabId, false);
//     // updateIcon(tabId);
//   }
// });

// // Handle active tab changes
// chrome.tabs.onActivated.addListener(async (activeInfo) => {
//   activeTabId = activeInfo.tabId;
//   updateIcon(activeTabId);
// });

// // Handle active window changes
// chrome.windows.onFocusChanged.addListener(async (windowId) => {
//   // No window is focused
//   if (windowId === chrome.windows.WINDOW_ID_NONE) {
//     return;
//   }

//   // Get the active tab in the focused window
//   const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
//   if (tabs.length > 0) {
//     activeTabId = tabs[0].id;
//     updateIcon(activeTabId);
//   }
// });

// // Handle tab removal
// chrome.tabs.onRemoved.addListener(async (tabId) => {
//   await removeIframeStatus(tabId);
// });

// async function getIframeStatus(tabId) {
//   const result = await chrome.storage.session.get(`iframeStatus_${tabId}`);
//   return result[`iframeStatus_${tabId}`] || { injected: false };
// }

// async function setIframeStatus(tabId, injected) {
//   await chrome.storage.session.set({ [`iframeStatus_${tabId}`]: { injected: injected } });
// }

// async function removeIframeStatus(tabId) {
//   await chrome.storage.session.remove(`iframeStatus_${tabId}`);
// }

// // Function to update the icon based on iframe status
// async function updateIcon(tabId) {
//   const iframeStatus = await getIframeStatus(tabId);
//   const path = iframeStatus?.injected ? {
//     "16": "../images/icon-16.png",
//     "32": "../images/icon-32.png",
//     "48": "../images/icon-48.png",
//     "128": "../images/icon-128.png"
//   } : {
//     "16": "../images/icon-opacity-16.png",
//     "32": "../images/icon-opacity-32.png",
//     "48": "../images/icon-opacity-48.png",
//     "128": "../images/icon-opacity-128.png"
//   };

//   chrome.action.setIcon({ path });
// }

// // Update iframe X position when a window has been resized
// chrome.windows.onBoundsChanged.addListener(async (window) => {
//   const tabs = await chrome.tabs.query({ active: true, windowId: window.id });

//   if (tabs.length > 0) {
//     const activeTab = tabs[0];
//     const url = activeTab.url;
//     const tabId = activeTab.id;

//     if (url && url.startsWith("http")) {
//       chrome.tabs.sendMessage(tabId, { action: "adjustIframeX" });
//     } else {
//       return;
//     }
//   }
// });