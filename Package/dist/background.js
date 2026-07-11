import { geminiPrompts } from "./utils/prompt.js";
import {
  ensureWarm,
  getApiKey,
  getCache,
  applyStorageChanges,
  queryUrl,
  buildSearchUrl,
  buildDirectionsUrl,
  buildMapsUrl,
} from "./hooks/backgroundState.js";
import ExtPay from "./utils/ExtPay.module.js";
import { Analytics } from "./utils/analytics.module.js";
import {
  beginAutoAttachRun,
  isCurrentAutoAttachRun,
  finishAutoAttachRun,
  setAutoAttachBadge,
  cancelAutoAttachRun,
} from "./utils/autoAttachBadge.js";

const DEFAULT_MAX_HISTORY = 10;

function getMaxListLength() {
  const cache = getCache();
  const historyMax = cache.historyMax;
  return Number.isFinite(historyMax) && historyMax > 0 ? historyMax : DEFAULT_MAX_HISTORY;
}

const RECEIVING_END_ERR = "Receiving end does not exist";
const DEFAULT_CAN_RETRY = (err) => String(err?.message ?? err).includes(RECEIVING_END_ERR);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRY_DELAY = 5000; // Cap exponential backoff at 5 seconds

async function withRetry(
  attempt,
  { retries = 10, delay = 100, canRetry = DEFAULT_CAN_RETRY } = {}
) {
  for (let retry_count = 0; retry_count <= retries; retry_count++) {
    try {
      return await attempt(retry_count);
    } catch (err) {
      const willRetry = retry_count < retries && canRetry(err);
      if (!willRetry) throw err;
      const backoffDelay = Math.min(delay * 2 ** retry_count, MAX_RETRY_DELAY);
      await sleep(backoffDelay);
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
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

  // Open what's new page on install/update
  const userLocale = chrome.i18n.getUILanguage();
  if (
    details.reason === "install" ||
    (details.reason === "update" && isLessThan(details.previousVersion, "1.11.3"))
  ) {
    if (userLocale.startsWith("zh")) {
      chrome.tabs.create({
        url: "https://the-maps-express.notion.site/73af672a330f4983a19ef1e18716545d",
      });
    } else {
      chrome.tabs.create({
        url: "https://the-maps-express.notion.site/384675c4183b4799852e5b298f999645",
      });
    }
  }
});

// A completed count stays visible for the life of the current document.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    cancelAutoAttachRun(tabId);
  }
});

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

const isLessThan = (v, t) => compareChromeVersions(v, t) < 0;

chrome.storage.onChanged.addListener((changes, area) => {
  // Keep module cache in sync (updates URLs when authUser changes)
  applyStorageChanges(changes, area);

  // Toggle directions context menu based on startAddr
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

  // Trim history list when historyMax is reduced
  if (area === "local" && changes.historyMax) {
    const newMax = changes.historyMax.newValue;
    if (Number.isFinite(newMax) && newMax > 0) {
      chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
        if (searchHistoryList && searchHistoryList.length > newMax) {
          const trimmedList = searchHistoryList.slice(-newMax);
          chrome.storage.local.set({ searchHistoryList: trimmedList });
        }
      });
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  // Warm cache in case service worker just woke up
  await ensureWarm();
  const selectedText = info.selectionText;
  if (info.menuItemId === "googleMapsSearch") {
    Analytics.trackContextMenu("search");
    handleSelectedText(selectedText);
  } else if (info.menuItemId === "googleMapsDirections") {
    Analytics.trackContextMenu("directions");
    handleSelectedDir(selectedText);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  Analytics.trackShortcut(command);
  await ensureWarm();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // No active tab when focus is on devtools or a detached window
    if (!tabs.length) return;
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
        const runId = beginAutoAttachRun(tabId);
        setAutoAttachBadge(tabId, "loading");
        extpay
          .getUser()
          .then(async (user) => {
            const now = new Date();

            if (user.paid) {
              if (!(await tryAndCheckApi(tabId, runId))) return;
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "premium" });
            } else if (user.trialStartedAt && now - user.trialStartedAt < trialPeriod) {
              if (!(await tryAndCheckApi(tabId, runId))) return;
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "trial" });
            } else if (user.trialStartedAt) {
              if (!(await tryAndCheckApi(tabId, runId))) return;
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "trial" });
              tryPremiumNotify().catch(() => {});
            } else {
              if (!(await tryAndCheckApi(tabId, runId))) return;
              chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "trial" });
            }
          })
          .catch((error) => {
            if (!isCurrentAutoAttachRun(tabId, runId)) return;
            console.error("Auto-attach failed:", error);
            finishAutoAttachRun(tabId, runId, "error");
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
            tryAddrNotify().catch(() => {});
            return;
          }
        });
      }
    } else {
      console.error("Cannot execute extension on non-HTTP URL.");
    }
  });
});

async function tryAndCheckApi(tabId, runId) {
  try {
    await getApiKey();
  } catch (error) {
    if (!finishAutoAttachRun(tabId, runId, "error")) return false;
    chrome.tabs.sendMessage(tabId, { action: "consoleQuote", stage: "missing" });
    meow();
    tryAPINotify().catch(() => {});
    return false;
  }
  return trySuggest(tabId, runId);
}

async function trySuggest(tabId, runId, retries = 10) {
  return withRetry(
    async () => {
      if (!isCurrentAutoAttachRun(tabId, runId)) return false;

      const apiKey = await getApiKey();
      const response = await getContent(tabId);

      if (!isCurrentAutoAttachRun(tabId, runId)) return false;

      // Treat as transient: trigger retry
      if (!response?.content) throw new Error(RECEIVING_END_ERR);

      callApi(geminiPrompts.attach, response.content, apiKey, (apiResponse) => {
        if (!isCurrentAutoAttachRun(tabId, runId)) return;

        if (typeof apiResponse !== "string") {
          finishAutoAttachRun(tabId, runId, "error");
          return;
        }

        chrome.tabs.sendMessage(
          tabId,
          {
            action: "attachMapLink",
            content: apiResponse,
            queryUrl: queryUrl,
          },
          (result) => {
            if (!isCurrentAutoAttachRun(tabId, runId)) return;

            if (chrome.runtime.lastError || !Number.isFinite(result?.attachedCount)) {
              finishAutoAttachRun(tabId, runId, "error");
              return;
            }
            finishAutoAttachRun(tabId, runId, "success", result.attachedCount);
          }
        );
      });

      return true;
    },
    { retries }
  );
}

async function tryAddrNotify(retries = 10) {
  return withRetry(() => sendChromeMessage({ message: { action: "addrNotify" } }), { retries });
}

async function tryPremiumNotify(retries = 10) {
  return withRetry(() => sendChromeMessage({ message: { action: "premiumNotify" } }), { retries });
}

async function tryAPINotify(retries = 10) {
  return withRetry(() => sendChromeMessage({ message: { action: "apiNotify" } }), { retries });
}

function getContent(tabId) {
  if (!Number.isSafeInteger(tabId)) {
    return Promise.reject(new Error("Invalid tabId for getContent"));
  }
  return sendChromeMessage({ tabId, message: { action: "getContent" } });
}

function sendChromeMessage({ tabId, message } = {}) {
  return new Promise((resolve, reject) => {
    const done = (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    };

    if (tabId != null) {
      chrome.tabs.sendMessage(tabId, message, done);
    } else {
      chrome.runtime.sendMessage(message, done);
    }
  });
}

function handleSelectedText(selectedText) {
  if (!selectedText || selectedText.trim() === "") {
    console.error("No valid selected text.");
    return;
  }

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
  if (request.action === "searchInput") {
    let searchTerm = request.searchTerm;
    if (searchTerm) {
      ensureWarm().then(() => {
        const searchUrl = buildSearchUrl(searchTerm);
        chrome.tabs.create({ url: searchUrl });
        updateHistoryList(searchTerm);
      });
    }
  }

  if (request.action === "openTab") {
    chrome.tabs.create({
      url: request.url,
      active: false,
    });
  } else if (request.action === "canGroup") {
    sendResponse({ canGroup });
    return;
  } else if (request.action === "openInGroup") {
    openUrlsInNewGroup(request.urls, request.groupTitle, request.groupColor, request.collapsed);
  } else if (request.action === "organizeLocations") {
    handleOrganizeLocations(request.locations, request.listType, sendResponse);
    return true;
  }
});

async function handleOrganizeLocations(locations, listType, sendResponse) {
  try {
    const apiKey = await getApiKey();

    // Format locations for the prompt with enhanced context
    const locationsText = locations
      .map((loc) => {
        if (loc.clue && loc.clue.trim()) {
          return `${loc.name} (${loc.clue})`;
        }
        return loc.name;
      })
      .join("\n");

    callApi(geminiPrompts.organize, locationsText, apiKey, (response) => {
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
      tryAPINotify().catch(() => {});
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

async function updateHistoryList(selectedText) {
  // Defense in depth: never trim or record history against cold DEFAULTS.
  await ensureWarm();
  chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
    // Do not persist history in incognito mode
    if (getCache().isIncognito) {
      return;
    }

    if (!searchHistoryList) {
      searchHistoryList = [];
    }

    const index = searchHistoryList.indexOf(selectedText);
    if (index !== -1) {
      searchHistoryList.splice(index, 1);
    }
    searchHistoryList.push(selectedText);

    const maxListLength = getMaxListLength();
    while (searchHistoryList.length > maxListLength) {
      searchHistoryList.shift();
    }

    chrome.storage.local.set({ searchHistoryList });
  });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "summarizeApi" && request.text) {
    // Special case for YouTube video descriptions
    if (request.url.startsWith("https://www.youtube")) {
      const ytSummaryPrompt = geminiPrompts.summary.replace(
        "(marked by <h1>, <h2>, <h3>, or <strong>) ",
        ""
      );
      callApi(ytSummaryPrompt, request.text, request.apiKey, sendResponse);
    } else {
      callApi(geminiPrompts.summary, request.text, request.apiKey, sendResponse);
    }
    return true; // Will respond asynchronously
  }

  if (request.action === "summarizeVideo" && request.text) {
    getApiKey()
      .then((apiKey) => {
        callApi(geminiPrompts.summary, request.text, apiKey, sendResponse);
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });
    return true; // Will respond asynchronously
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "verifyApiKey") {
    verifyApiKey(request.apiKey)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest";

const VERIFY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function hashApiKey(apiKey) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function getVerifyCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get("apiKeyVerifyCache", (result) => {
      resolve(result ? result.apiKeyVerifyCache : undefined);
    });
  });
}

async function verifyApiKey(apiKey) {
  let keyHash = null;
  try {
    keyHash = await hashApiKey(apiKey);
    const cached = await getVerifyCache();
    if (
      cached &&
      cached.keyHash === keyHash &&
      cached.valid === true &&
      Date.now() - cached.verifiedAt < VERIFY_CACHE_TTL
    ) {
      return { valid: true };
    }
  } catch (_e) {
    // Hashing/cache problems only mean we verify over the network
  }

  const res = await fetch(endpoint, {
    headers: { "x-goog-api-key": apiKey },
  });
  // Only cache positive results; failures may be transient
  if (res.ok && keyHash) {
    chrome.storage.local.set({
      apiKeyVerifyCache: { keyHash, valid: true, verifiedAt: Date.now() },
    });
  }
  return { valid: res.ok };
}

function callApi(prompt, content, apiKey, sendResponse) {
  const url = `${endpoint}:generateContent`;

  // Handle YouTube URI vs plain text
  const isYouTubeUri = content.includes("youtube.com") || content.includes("youtu.be");
  const contents = isYouTubeUri
    ? [{ parts: [{ text: prompt }, { file_data: { file_uri: content.trim() } }] }]
    : [{ parts: [{ text: `${prompt}${content}` }] }];

  // Use thinking config only when organizing
  const needsThinking = prompt.includes("Organize");
  const generationConfig = {
    thinkingConfig: {
      thinkingBudget: needsThinking ? -1 : 0,
    },
  };

  const data = { contents, generationConfig };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Gemini API returned an error:", data.error.message);
        sendResponse({ error: data.error.message });
        return;
      }
      const generatedText = data.candidates[0].content.parts[0].text;
      if (generatedText.includes("<ul")) {
        const regex = /<ul class="list-group d-flex">[\s\S]*?<\/ul>/;
        const match = generatedText.match(regex);
        sendResponse(match ? match[0] : generatedText);
      } else {
        sendResponse(generatedText);
      }
    })
    .catch((error) => {
      console.error("API call failed:", error);
      sendResponse({ error: error.message || "Network error occurred" });
    });
}

chrome.action.onClicked.addListener(meow);

function meow() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
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

const trialPeriod = 40 * 24 * 60 * 60 * 1000; // 40 days
const extpay = ExtPay("the-maps-express");
extpay.startBackground();

function handleExtensionPayment(user, sender) {
  if (!user.trialStartedAt) {
    extpay.openTrialPage("40-day");
    chrome.tabs.sendMessage(sender.tab.id, { action: "consoleQuote", stage: "first" });
  } else {
    extpay.openTrialPage();
  }
}

function checkPaymentStatus(user) {
  const now = new Date();
  const isPremium = user.paid;
  const isFirst = !user.trialStartedAt && !isPremium;
  const isTrial = user.trialStartedAt && now - user.trialStartedAt < trialPeriod && !isPremium;
  const isExpiredTrial =
    user.trialStartedAt && now - user.trialStartedAt >= trialPeriod && !isPremium;
  const trialEnd = new Date(user.trialStartedAt).getTime() + trialPeriod;

  return { isFirst, isTrial, isExpiredTrial, isPremium, trialEnd };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extPay") {
    extpay.getUser().then((user) => handleExtensionPayment(user, sender));
  } else if (request.action === "restorePay") {
    extpay.openLoginPage();
  } else if (request.action === "checkPay") {
    extpay.getUser().then((user) => {
      sendResponse({ result: checkPaymentStatus(user) });
    });
    return true;
  }
});

chrome.tabs.onActivated.addListener(() => {
  ensureWarm();
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getWarmState") {
    ensureWarm().then(() => {
      // Never ship AES key material outside the service worker
      const { aesKey: _aesKey, ...warmState } = getCache();
      sendResponse(warmState);
    });
    return true;
  } else if (request.action === "getApiKey") {
    getApiKey()
      .then((apiKey) => sendResponse({ apiKey }))
      .catch((err) => sendResponse({ apiKey: "", error: err.message }));
    return true;
  } else if (request.action === "buildSearchUrl") {
    ensureWarm().then(() => sendResponse({ url: buildSearchUrl(request.query) }));
    return true;
  } else if (request.action === "buildDirectionsUrl") {
    ensureWarm().then(() =>
      sendResponse({ url: buildDirectionsUrl(request.origin, request.destination) })
    );
    return true;
  } else if (request.action === "buildMapsUrl") {
    ensureWarm().then(() => sendResponse({ url: buildMapsUrl() }));
    return true;
  }
});
