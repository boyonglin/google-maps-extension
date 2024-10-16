let searchHistoryList = [];
let favoriteList = [];
let maxListLength = 10;

const summaryPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks (prioritizing <h1>, <h2>, <h3>, or <strong>) that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. If <h1>, <h2>, <h3>, or <strong> contain no important sub-landmarks, please disregard them. Sub-landmarks should avoid using complete sentences from the original content, dish names, or emojis. Next, you should format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for one contextual clue around it if needed, it can include city or state or country, then fill in <span> for the clue. It's better to select only one key clue for each sub-landmark. But if there is address information, please use the address as a clue. If different sub-landmarks share the same name, you may add a clue in parentheses after the sub-landmark to provide identifiable differences. The final format should look like this example (do not include the example or other tags like <h1>):

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

const linkPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. If <h1>, <h2>, <h3>, or <strong> contain no important sub-landmarks, please disregard them. Sub-landmarks should avoid using complete sentence from the original content or description or dish names or containing emojis, please give a specific place name. Retain the original language of the content. Additionally, based on the sub-landmark, look for one contextual clue around it if needed, it can include city or state or country. But if there is address information, please use the address as a clue. Both the sub-landmark name and its corresponding clue must be provided as plain text, with no additional information, emoji or formatting, such as bullet points. Please format the results like this example (the sub-landmark is followed by four spaces and a clue):

sub-landmark-1    clue-1
sub-landmark-2    clue-2
...

Here is the provided page content:
`;

const askAIPrompt = `Suggest or surprise (don't have to be cliché) a {requestedDestination} itinerary, and use {userLocale} as the display language. Please give me the results in plain HTML only (for example, see the format I provided). The clue could be country or city, but not address. The time shows the estimated time and only the number and time unit information. The final format should look like this example (do not include the example or other tags like <h1>):

<ul class="list-group d-flex">
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 1 (time 1)</span>
    <span class="d-none">Clue 1</span>
  </li>
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 2 (time 2)</span>
    <span class="d-none">Clue 2</span>
  </li>
  ...
</ul>
`;

chrome.runtime.onInstalled.addListener((details) => {
  // Create the right-click context menu item
  chrome.contextMenus.create({
    id: "myContextMenuId",
    title: chrome.i18n.getMessage("contextMenus"),
    contexts: ["selection"],
  });

  // What's new page
  const userLocale = chrome.i18n.getUILanguage();
  if (details.reason === "install") { // details.reason === "update"
    if (userLocale.startsWith("zh")) {
      chrome.tabs.create({ url: "https://the-maps-express.notion.site/73af672a330f4983a19ef1e18716545d" });
    } else {
      chrome.tabs.create({ url: "https://the-maps-express.notion.site/384675c4183b4799852e5b298f999645" });
    }
  }
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
        extpay.getUser().then(async (user) => {
          const now = new Date();

          // In trial period
          if (user.trialStartedAt && (now - user.trialStartedAt) < trialPeriod) {
            await tryAndCheckApi(tabId, url);
            chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "trial" });
          } else {
            // Paid user
            if (user.paid) {
              await tryAndCheckApi(tabId, url);
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
        callApi(linkPrompt, response.content, apiKey, (apiResponse) => {
          chrome.tabs.sendMessage(tabId, { action: "attachMapLink", content: apiResponse });
        });

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

async function tryAndCheckApi(tabId, url) {
  try {
    await getApiKey();
  } catch (error) {
    chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "missing" });
    meow();
    await tryAPINotify();
    return;
  }
  await trySuggest(tabId, url);
}

async function tryAPINotify(retries = 10) {
  while (retries > 0) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "apiNotify" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(chrome.runtime.lastError.message);
        } else {
          resolve(null); // No error, message sent
        }
      });
    });

    if (response && response.includes("Receiving end does not exist")) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries--;
    } else {
      break; // No error, loop stop
    }
  }
}

function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("geminiApiKey", (data) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      if (!data.geminiApiKey) {
        return reject(new Error("No API key found. Please provide one."));
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
    let searchTerm = request.searchTerm;
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

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "verifyApiKey") {
      callApi("", "test", request.apiKey, sendResponse);
      return true;
    }
  });
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
        let result = results[0].result;
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

const trialPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
const extpay = ExtPay("the-maps-express");
extpay.startBackground();

function handleExtensionPayment(user, sender) {
  const now = new Date();

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
}

function checkPaymentStatus(user) {
  const now = new Date();
  const isPremium = user.paid;
  const isFirst = !user.trialStartedAt && !isPremium;
  const isTrial = user.trialStartedAt && (now - user.trialStartedAt) < trialPeriod && !isPremium;
  const isFree = !isFirst && !isTrial && !isPremium;
  const trialEnd = new Date(user.trialStartedAt).getTime() + trialPeriod;

  return { isFirst, isTrial, isPremium, isFree, trialEnd };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extPay") {
    extpay.getUser().then(user => handleExtensionPayment(user, sender));
  } else if (request.action === "restorePay") {
    extpay.openLoginPage();
  } else if (request.action === "checkPay") {
    extpay.getUser().then(user => {
      sendResponse({ result: checkPaymentStatus(user) });
    });
    return true;
  }
});