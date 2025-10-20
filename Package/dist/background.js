import { encryptApiKey } from "./components/crypto.js";
import { GeminiPrompts } from "./components/prompt.js";
import { ensureWarm, getApiKey, getCache, applyStorageChanges, queryUrl, buildSearchUrl, buildDirectionsUrl, buildMapsUrl } from "./components/state.js";
import ExtPay from "./components/ExtPay.module.js";

let maxListLength = 10;
const RECEIVING_END_ERR = "Receiving end does not exist";

// Utilities
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(attempt, { retries = 10, delay = 1000, canRetry } = {}) {
  const shouldRetry =
    canRetry || ((err) => String(err?.message || err).includes(RECEIVING_END_ERR));
  while (retries > 0) {
    try {
      return await attempt();
    } catch (err) {
      if (shouldRetry(err)) {
        await sleep(delay);
        retries--;
        continue;
      }
      throw err;
    }
  }
}

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
  if (details.reason === "install" || (details.reason === "update" && isLessThan(details.previousVersion, "1.11.3"))) {
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

// Version comparison utility
function compareChromeVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = Number.isFinite(pa[i]) ? pa[i] : 0;
    const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

const isLessThan = (v, t) => compareChromeVersions(v, t) <  0;

// Storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  // Keep module cache in sync (also updates URLs when authUser changes)
  applyStorageChanges(changes, area);

  // Manage context menu for directions based on presence of startAddr
  if (area === "local" && changes.startAddr) {
    const newStartAddr = changes.startAddr.newValue;
    if (newStartAddr) {
      chrome.contextMenus.remove("googleMapsDirections", () => {
        // Ignore any errors if the item doesn't exist
        chrome.runtime.lastError;
        chrome.contextMenus.create({
          id: "googleMapsDirections",
          title: chrome.i18n.getMessage("directionsContext"),
          contexts: ["selection"],
        });
      });
    } else {
      chrome.contextMenus.remove("googleMapsDirections", () => {
        // Ignore error if item doesn't exist
        chrome.runtime.lastError;
      });
    }
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

async function tryAddrNotify(retries = 10) {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "addrNotify" }, () => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(null);
        });
      }),
    { retries }
  );
}

// Retry mechanism for trying to suggest places from the content
async function trySuggest(tabId, url, retries = 10) {
  return withRetry(
    async () => {
      const apiKey = await getApiKey();
      const response = await getContent(tabId, { action: "getContent" });

      if (!response || !response.content) {
        // Treat as transient: trigger retry
        throw new Error(RECEIVING_END_ERR);
      }

      callApi(GeminiPrompts.attach, response.content, apiKey, (apiResponse) => {
        chrome.tabs.sendMessage(tabId, {
          action: "attachMapLink",
          content: apiResponse,
          queryUrl: queryUrl,
        });
      });

      return true;
    },
    {
      retries,
      canRetry: (err) => String(err?.message || err).includes(RECEIVING_END_ERR),
    }
  );
}

async function tryAPINotify(retries = 10) {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "apiNotify" }, () => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(null);
        });
      }),
    { retries }
  );
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
  const searchUrl = buildSearchUrl(selectedText);
  chrome.tabs.create({ url: searchUrl });

  updateHistoryList(selectedText);
}

function handleSelectedDir(selectedText) {
  if (!selectedText || selectedText.trim() === "") {
    console.error("No valid selected text.");
    return;
  }

  chrome.storage.local.get("startAddr", ({ startAddr }) => {
    const directionsUrl = buildDirectionsUrl(startAddr, selectedText);
    chrome.tabs.create({ url: directionsUrl });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearSearchHistoryList") {
    chrome.storage.local.set({ searchHistoryList: [] });
  } else if (request.action === "searchInput") {
    let searchTerm = request.searchTerm;
    if (searchTerm) {
      const searchUrl = buildSearchUrl(searchTerm);
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
  } else if (request.action === "organizeLocations") {  // Organize locations using Gemini
    handleOrganizeLocations(request.locations, request.listType, sendResponse);
    return true;
  }
});

async function handleOrganizeLocations(locations, listType, sendResponse) {
  try {
    const apiKey = await getApiKey();

    // Format locations for the prompt with enhanced context
    const locationsText = locations.map(loc => {
      if (loc.clue && loc.clue.trim()) {
        return `${loc.name} (${loc.clue})`;
      }
      return loc.name;
    }).join("\n");

    callApi(GeminiPrompts.organize, locationsText, apiKey, (response) => {
      if (response.error) {
        console.error("Gemini API error:", response.error);
        sendResponse({ success: false, error: response.error });
        return;
      }

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const organizedData = JSON.parse(jsonMatch[0]);
          sendResponse({ success: true, organizedData: organizedData });
        } else {
          sendResponse({ success: true, organizedData: { rawText: response } });
        }
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        sendResponse({ success: true, organizedData: { rawText: response } });
      }
    });

  } catch (error) {
    if (error.message.includes("No API key found")) {
      await tryAPINotify();
    } else {
      console.error("Failed to organize locations:", error);
    }
    sendResponse({ success: false, error: error.message });
  }
}

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
    // Respect incognito mode: do not persist history when enabled
    if (getCache().isIncognito) {
      return;
    }

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
      const ytSummaryPrompt = GeminiPrompts.summary.replace("(marked by <h1>, <h2>, <h3>, or <strong>) ", "");
      callApi(ytSummaryPrompt, request.text, request.apiKey, sendResponse);
    } else {
      callApi(GeminiPrompts.summary, request.text, request.apiKey, sendResponse);
    }
    return true; // Will respond asynchronously
  }

  if (request.action === "summarizeVideo" && request.text) {
    console.log("summarize video: ", request.text);
    getApiKey().then(apiKey => {
      callApi(GeminiPrompts.summary, request.text, apiKey, sendResponse);
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
  const url = prompt.includes("Organize") ? `${endpoint.replace("2.0", "2.5")}:generateContent` : `${endpoint}:generateContent`;
  const isYouTubeUri = content.includes("youtube.com") || content.includes("youtu.be");

  const data = isYouTubeUri
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

// 1) Warm on first useful wake-ups
chrome.tabs.onActivated.addListener(() => { ensureWarm(); });

// 2) Fast message responder for popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getWarmState") {
    ensureWarm().then(() => sendResponse(getCache()));
    return true;
  } else if (request.action === "getApiKey") {
    getApiKey().then(apiKey => sendResponse({ apiKey }));
    return true;
  } else if (request.action === "buildSearchUrl") {
    sendResponse({ url: buildSearchUrl(request.query) });
    return true;
  } else if (request.action === "buildDirectionsUrl") {
    sendResponse({ url: buildDirectionsUrl(request.origin, request.destination) });
    return true;
  } else if (request.action === "buildMapsUrl") {
    sendResponse({ url: buildMapsUrl() });
    return true;
  }
});

