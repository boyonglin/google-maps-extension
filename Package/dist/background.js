let maxListLength = 10;

const summaryPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks (prioritizing <h1>, <h2>, <h3>, or <strong>) that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. If <h1>, <h2>, <h3>, or <strong> contain no important sub-landmarks, please disregard them. Sub-landmarks should avoid using complete sentences from the original content, dish names, or emojis. Next, you should format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for one contextual clue around it if needed, it can include city or state or country, then fill in <span> for the clue. It's better to select only one key clue for each sub-landmark. But if there is address information, please use the address as a clue. If different sub-landmarks share the same name, you may add a clue in parentheses after the sub-landmark to provide identifiable differences. Only output the following exact structure, replacing the list items as needed:

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

import { decryptApiKey, encryptApiKey } from './module/gcrypto.js';
import ExtPay from './module/ExtPay.module.js';

chrome.runtime.onInstalled.addListener((details) => {
  // Create the right-click context menu items
  chrome.contextMenus.create({
    id: "googleMapsSearch",
    title: chrome.i18n.getMessage("searchContext"),
    contexts: ["selection"],
  });

  chrome.storage.local.get("startAddr", ({ startAddr }) => {
    if (startAddr) {
      chrome.contextMenus.create({
        id: "googleMapsDirections",
        title: chrome.i18n.getMessage("directionsContext"),
        contexts: ["selection"],
      });
    }
  });

  // What's new page
  const userLocale = chrome.i18n.getUILanguage();
  if (details.reason === "install") {
    if (userLocale.startsWith("zh")) {
      chrome.tabs.create({ url: "https://the-maps-express.notion.site/73af672a330f4983a19ef1e18716545d" });
    } else {
      chrome.tabs.create({ url: "https://the-maps-express.notion.site/384675c4183b4799852e5b298f999645" });
    }
  }

  if (details.reason === "update") {
    chrome.storage.local.get("geminiApiKey", async ({ geminiApiKey }) => {
      if (geminiApiKey && !geminiApiKey.includes(".")) {
        const encrypted = await encryptApiKey(geminiApiKey);
        chrome.storage.local.set({ geminiApiKey: encrypted });
      }
    });
  }
});

// Add event listener to monitor changes to "startAddr" in storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.startAddr) {
    const newStartAddr = changes.startAddr.newValue;
    if (newStartAddr) {
      chrome.contextMenus.create({
        id: "googleMapsDirections",
        title: chrome.i18n.getMessage("directionsContext"),
        contexts: ["selection"],
      });
    } else {
      chrome.contextMenus.remove("googleMapsDirections");
    }
  }

  if (areaName === "local" && changes.authUser) {
    UpdateUserUrls(changes.authUser.newValue);
  }
});

// Track the right-click event
chrome.contextMenus.onClicked.addListener((info) => {
  const selectedText = info.selectionText;
  if (info.menuItemId === "googleMapsSearch") {
    handleSelectedText(selectedText);
  } else if (info.menuItemId === "googleMapsDirections") {
    handleSelectedDir(selectedText);
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
      } else if (command === "run-directions") {
        chrome.storage.local.get("startAddr", async ({ startAddr }) => {
          if (startAddr) {
            chrome.tabs.sendMessage(tabId, { action: "getSelectedText" }, (response) => {
              if (response && response.selectedText) {
                const selectedText = response.selectedText;
                handleSelectedDir(selectedText);
              }
            });
          } else {
            meow();
            await tryAddrNotify();
            return;
          }
        });
      }
    } else {
      console.error("Cannot execute extension on non-HTTP URL.");
    }
  });
});

async function tryAddrNotify(retries = 10) {
  while (retries > 0) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "addrNotify" }, (response) => {
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

// Retry mechanism for trying to suggest places from the content
async function trySuggest(tabId, url, retries = 10) {
  while (retries > 0) {
    try {
      const apiKey = await getApiKey();
      const response = await getContent(tabId, { action: "getContent" });

      if (response && response.content) {
        callApi(linkPrompt, response.content, apiKey, (apiResponse) => {
          chrome.tabs.sendMessage(tabId, {
            action: "attachMapLink",
            content: apiResponse,
            queryUrl: queryUrl
          });
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

async function getApiKey() {
  await ensureWarm();
  if (!cache.geminiApiKey) {
    throw new Error("No API key found. Please provide one.");
  }
  return cache.geminiApiKey;
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
  const searchUrl = `${queryUrl}q=${encodeURIComponent(selectedText)}`;
  chrome.tabs.create({ url: searchUrl });

  updateHistoryList(selectedText);
}

function handleSelectedDir(selectedText) {
  if (!selectedText || selectedText.trim() === "") {
    console.error("No valid selected text.");
    return;
  }

  chrome.storage.local.get("startAddr", ({ startAddr }) => {
    const directionsUrl = `${routeUrl}api=1&origin=${encodeURIComponent(startAddr)}&destination=${encodeURIComponent(selectedText)}`;
    chrome.tabs.create({ url: directionsUrl });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearSearchHistoryList") {
    chrome.storage.local.set({ searchHistoryList: [] });
  } else if (request.action === "searchInput") {
    let searchTerm = request.searchTerm;
    if (searchTerm) {
      const searchUrl = `${queryUrl}q=${encodeURIComponent(searchTerm)}`;
      chrome.tabs.create({ url: searchUrl });
      updateHistoryList(searchTerm);
    }
  } else if (request.action === "addToFavoriteList") {
    const selectedText = request.selectedText;
    addToFavoriteList(selectedText);
  }

  if (request.action === "openTab") {  // Opens the tab without focusing on it
    chrome.tabs.create({
      url: request.url,
      active: false
    });
  } else if (request.action === "canGroup") {  // Checks if the user can group tabs
    sendResponse({ canGroup });
    return;
  } else if (request.action === "openInGroup") {  // Create a new tab group (if supported)
    openUrlsInNewGroup(
      request.urls, request.groupTitle, request.groupColor, request.collapsed);
  }
});

const canGroup =
  !!chrome.tabGroups &&
  typeof chrome.tabs.group === "function" &&
  typeof chrome.tabGroups.update === "function";

function openUrlsInNewGroup(urls, title, color, collapsed) {
  chrome.windows.getCurrent({ populate: false }, (win) => {
    chrome.tabs.query({ active: true, windowId: win.id }, (activeTabs) => {
      const originalActiveTabId = activeTabs.length > 0 ? activeTabs[0].id : null;

      const tabIds = [];
      const createNext = (i) => {
        if (i >= urls.length) {
          chrome.tabs.group({ tabIds, createProperties: { windowId: win.id } }, (groupId) => {
            chrome.tabGroups.update(groupId, { title, color, collapsed: !!collapsed }, () => {
              // re-focus original tab (some builds may briefly focus a new tab)
              if (originalActiveTabId) {
                chrome.tabs.update(originalActiveTabId, { active: true });
              }
            });
          });
          return;
        }
        chrome.tabs.create({ url: urls[i], active: false, windowId: win.id }, (tab) => {
          tabIds.push(tab.id);
          createNext(i + 1);
        });
      };
      createNext(0);
    });
  });
}


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
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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

  if (request.action === "summarizeVideo" && request.text) {
    console.log("summarize video: ", request.text);
    getApiKey().then(apiKey => {
      callApi(summaryPrompt, request.text, apiKey, sendResponse);
    });
    return true; // Will respond asynchronously
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "verifyApiKey") {
      verifyApiKey(request.apiKey)
        .then(sendResponse)
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }
  });
});

const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash";

async function verifyApiKey(apiKey) {
  const res = await fetch(endpoint, {
    headers: { "x-goog-api-key": apiKey }
  });
  return { valid: res.ok };
}

function callApi(prompt, content, apiKey, sendResponse) {
  const url = `${endpoint}:generateContent`;

  const data = content.includes("youtube")
    ? {
      contents: [{
        parts: [
          { text: prompt },
          { file_data: { file_uri: content.trim() } }
        ]
      }]
    }
    : {
      contents: [{
        parts: [{ text: `${prompt}${content}` }]
      }]
    };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        sendResponse({ error: data.error.message });
        return;
      }
      const generatedText = data.candidates[0].content.parts[0].text;
      if (generatedText.includes("<ul")) {
        const regex = /<ul class="list-group d-flex">[\s\S]*?<\/ul>/;
        const match = generatedText.match(regex);
        sendResponse(match[0]);
      } else {
        sendResponse(generatedText);
      }
    })
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

// Payment system
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

// Caching mechanism
const DEFAULTS = {
  searchHistoryList: [],
  favoriteList: [],
  geminiApiKey: "",
  aesKey: null,
  startAddr: "",
  authUser: 0,
  isIncognito: false,
  videoSummaryToggle: false,
};

let cache = null;        // holds warmed state while the worker is alive
let loading = null;      // in-flight promise to dedupe concurrent warms

let queryUrl;
let routeUrl;

function UpdateUserUrls(newUser) {
  queryUrl = `https://www.google.com/maps?authuser=${newUser}&`;
  routeUrl = `https://www.google.com/maps/dir/?authuser=${newUser}&`;
}

async function ensureWarm() {
  if (cache) return cache;
  if (loading) return loading;
  loading = chrome.storage.local.get(DEFAULTS)
    .then(async v => {
      if (v.geminiApiKey) {
        try {
          v.geminiApiKey = await decryptApiKey(v.geminiApiKey);
        } catch (_e) {
          v.geminiApiKey = "";
        }
      }
      cache = v;
      UpdateUserUrls(v.authUser);
    })
    .finally(() => (loading = null));
  return loading;
}

// 1) Warm on first useful wake-ups
chrome.tabs.onActivated.addListener(() => { ensureWarm(); });

// 2) Keep cache fresh if some other part of the extension writes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!cache) return;
  for (const [k, { newValue }] of Object.entries(changes)) {
    if (k === "geminiApiKey") {
      decryptApiKey(newValue).then(v => { cache[k] = v; });
    } else {
      cache[k] = newValue;
    }
  }
});

// 3) Fast message responder for popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getWarmState") {
    ensureWarm().then(() => sendResponse(cache));
    return true;
  } else if (request.action === "getApiKey") {
    getApiKey().then(apiKey => sendResponse({ apiKey }));
    return true;
  }
});