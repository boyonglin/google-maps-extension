class Gemini {
  constructor() {
    this.apiToken = 0;
    this.videoToken = 0;
    this.summarySequence = 0;
  }

  getStore() {
    return this.store || state;
  }

  nextSummaryRequestId() {
    this.summarySequence += 1;
    return `summary-${Date.now()}-${this.summarySequence}`;
  }

  beginSummary(originTabId = null) {
    const requestId = this.nextSummaryRequestId();
    this.getStore().dispatch({ type: "SUMMARY_START", requestId, originTabId });
    chrome.storage.local.remove(["summaryList", "timestamp"]);
    return requestId;
  }

  addGeminiPageListener() {
    summaryListContainer.addEventListener("click", (event) => {
      const liElement = DOMUtils.findClosestListItem(event);
      if (!liElement) return;

      const spans = liElement.querySelectorAll("span");

      if (event.target.classList.contains("bi")) {
        const nameSpan = spans[0].textContent;
        const reconstructedValue =
          spans.length >= 2 ? nameSpan + " @" + spans[1].textContent : nameSpan;

        if (event.target.classList.contains("matched")) {
          // "matched" is determined by name only (ignoring clue), so the
          // stored favorite may carry a different clue than this summary
          // item's own reconstructed value — resolve the actual stored
          // entry by name instead of removing the reconstructed string.
          const favoriteItems = this.getStore().getSnapshot().favorite.items;
          const storedItem =
            favoriteItems.find((item) => item.split(" @")[0] === nameSpan) || reconstructedValue;

          if (window.Analytics)
            window.Analytics.trackFeatureClick(
              "remove_favorite_from_summary",
              "summaryListContainer"
            );
          favorite.removeFavoriteItem(storedItem, event);
          DOMUtils.fadeOutFavoriteIcon(event.target);
        } else {
          if (window.Analytics)
            window.Analytics.trackFeatureClick(
              "add_to_favorite_from_summary",
              "summaryListContainer"
            );
          favorite.addToFavoriteList(reconstructedValue);
          DOMUtils.animateFavoriteIcon(event.target);
        }
        return;
      }

      const selectedText = Array.from(spans)
        .map((span) => span.textContent)
        .join(" ")
        .trim();

      this.getStore()
        .buildSearchUrl(selectedText)
        .then((searchUrl) => {
          if (window.Analytics)
            window.Analytics.trackFeatureClick("click_summary_item", "summaryListContainer");
          chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
        });
    });

    summaryListContainer.addEventListener("contextmenu", (event) => {
      ContextMenuUtil.createContextMenu(event, summaryListContainer);
    });

    clearButtonSummary.addEventListener("click", () => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("clear_summary", "clearButtonSummary");
      const { items, timestamp } = this.getStore().getSnapshot().summary;

      chrome.storage.local.remove(["summaryList", "timestamp"]);
      this.getStore().dispatch({ type: "SUMMARY_CLEAR" });

      if (items.length > 0) this._startUndoWindow(items, timestamp);
    });

    undoButtonSummary.addEventListener("click", () => this._undoClear());

    videoSummaryButton.addEventListener("click", () => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("video_summary_toggle", "videoSummaryButton");
      const enabled = !this.getStore().getSnapshot().video.enabled;
      this.getStore().dispatch({ type: "VIDEO_TOGGLE", enabled });

      chrome.storage.local.set({ videoSummaryToggle: enabled });
      videoSummaryButton.classList.toggle("no-hover-temp", !enabled);
    });

    // Hover disable effect for videoSummaryButton
    videoSummaryButton.addEventListener("mouseleave", () => {
      if (videoSummaryButton.classList.contains("no-hover-temp")) {
        videoSummaryButton.classList.remove("no-hover-temp");
      }
    });

    sendButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("send_gemini", "sendButton");
      if (this.getStore().getSnapshot().summary.phase === "generating") return;
      const requestId = this.beginSummary(null);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) {
          this.ResponseErrorMsg(null, requestId);
          return;
        }
        this.getStore().dispatch({ type: "SUMMARY_START", requestId, originTabId: tabs[0].id });
        const video = this.getStore().getSnapshot().video;
        if (video.enabled && video.available) {
          this.summarizeFromGeminiVideoUnderstanding(
            this.normalizeYoutubeUrl(tabs[0].url),
            requestId
          );
        } else {
          this.performNormalContentSummary(requestId, tabs[0]);
        }
      });
    });
  }

  // Swaps clearButtonSummary for undoButtonSummary; reverts after 6s if unused.
  _startUndoWindow(items, timestamp) {
    clearTimeout(this._undoTimer);
    this._pendingUndo = { items, timestamp };
    this.render(this.getStore().getSnapshot());

    this._undoTimer = setTimeout(() => {
      this._pendingUndo = null;
      this.render(this.getStore().getSnapshot());
    }, 6000);
  }

  _undoClear() {
    clearTimeout(this._undoTimer);
    const pending = this._pendingUndo;
    this._pendingUndo = null;
    if (!pending) return;

    // SUMMARY_STORAGE_SET itself is a no-op while generating (see reducer), but
    // the storage write isn't guarded there — skip it too, or a failed generate
    // leaves stale pre-clear data in storage that resurrects on next popup open.
    if (this.getStore().getSnapshot().summary.phase === "generating") return;

    chrome.storage.local.set({ summaryList: pending.items, timestamp: pending.timestamp });
    this.getStore().dispatch({
      type: "SUMMARY_STORAGE_SET",
      items: pending.items,
      timestamp: pending.timestamp,
    });
  }

  fetchAPIKey(apiKey) {
    apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
    const token = ++this.apiToken;
    this.getStore().dispatch({ type: "API_VERIFY_START", token, hasKey: Boolean(apiKey) });

    if (apiKey) {
      chrome.runtime.sendMessage({ action: "verifyApiKey", apiKey }, ({ valid, error } = {}) => {
        this.getStore().dispatch({
          type: "API_VERIFY_RESULT",
          token,
          valid: !error && Boolean(valid),
        });
        if (!error && valid) {
          apiInput.placeholder = "............" + apiKey.slice(-4);
        }
      });
    }
  }

  async checkCurrentTabForYoutube() {
    const token = ++this.videoToken;
    this.getStore().dispatch({ type: "VIDEO_CONTEXT_REQUEST", token });
    const tabs = (await chrome.tabs.query({ active: true, currentWindow: true })) || [];
    const currentTabUrl = tabs[0]?.url || "";
    const youtubeMatch = currentTabUrl.match(/youtube\.com\/(?:watch\?v=|shorts\/)(.{11})/);

    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      this.getStore().dispatch({ type: "VIDEO_CONTEXT_RESULT", token, available: true });

      this.scrapeLen(videoId)
        .then((videoLength) => {
          if (token === this.videoToken) {
            chrome.storage.local.set({
              currentVideoInfo: {
                videoId,
                length: videoLength,
              },
            });
          }
        })
        .catch((error) => console.error("Error scraping video length:", error));
    } else {
      this.getStore().dispatch({ type: "VIDEO_CONTEXT_RESULT", token, available: false });
      chrome.storage.local.remove("currentVideoInfo");
    }

    // Token prevents stale tab callbacks
  }

  async scrapeLen(id) {
    try {
      const html = await fetch(`https://www.youtube.com/watch?v=${id}`, {
        credentials: "omit",
      }).then((r) => r.text());
      const m = html.match(/"lengthSeconds":"(\d+)"/);
      return m ? Number(m[1]) : null;
    } catch (error) {
      console.error("Failed to scrape video length:", error);
      return null;
    }
  }

  // Clear stale summary data
  clearExpiredSummary() {
    chrome.storage.local.get(["summaryList", "timestamp", "favoriteList"], (result) => {
      const items = Array.isArray(result.summaryList) ? result.summaryList : [];
      const timestamp = Number(result.timestamp);
      const now = Date.now();
      if (State.isSummaryFresh(items, timestamp, now)) {
        this.getStore().dispatch({ type: "SUMMARY_STORAGE_SET", items, timestamp });
      } else {
        this.getStore().dispatch({ type: "SUMMARY_STORAGE_SET", items: [] });
        if (items.length || result.timestamp != null) {
          chrome.storage.local.remove(["summaryList", "timestamp"]);
        }
      }
    });
  }

  // Parse LLM output to prevent prompt injection
  parseSummaryItems(response) {
    const doc = new DOMParser().parseFromString(response, "text/html");
    const normalize = (text) => text.replace(/\s+/g, " ").trim();
    const items = [];
    doc.querySelectorAll("li").forEach((li) => {
      const spans = Array.from(li.children).filter((el) => el.tagName === "SPAN");
      const name = normalize(spans[0] ? spans[0].textContent : li.textContent);
      const clue = spans[1] ? normalize(spans[1].textContent) : "";
      if (name) items.push({ name, clue });
    });
    return items;
  }

  buildSummaryListElement(summaryList) {
    const ul = document.createElement("ul");
    ul.className = "list-group d-flex";

    summaryList.forEach((item, index) => {
      const isLastItem = index === summaryList.length - 1;
      const li = document.createElement("li");
      li.className =
        "list-group-item border rounded px-3 summary-list d-flex justify-content-between align-items-center text-break" +
        (isLastItem ? "" : " mb-3");

      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name ?? "";
      const clueSpan = document.createElement("span");
      clueSpan.className = "d-none";
      clueSpan.textContent = item.clue ?? "";
      const icon = document.createElement("i");
      icon.className = "bi";

      li.append(nameSpan, clueSpan, icon);
      ul.appendChild(li);
    });

    return ul;
  }

  constructSummaryHTML(summaryList, favoriteList = []) {
    summaryListContainer.replaceChildren(this.buildSummaryListElement(summaryList));
    this.updateSummaryFavoriteIcons(favoriteList);

    return summaryListContainer.innerHTML;
  }

  updateSummaryFavoriteIcons(favoriteList = []) {
    const summaryItems = summaryListContainer.querySelectorAll(".summary-list");
    const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);

    summaryItems.forEach((item) => {
      const itemName = item.querySelector("span:first-child").textContent;
      const existingIcon = item.querySelector("i");

      if (existingIcon) {
        const newIcon = favorite.createFavoriteIcon(itemName, trimmedFavorite);
        existingIcon.className = newIcon.className;
        existingIcon.title = newIcon.title;
      }
    });
  }

  // Strip query params for canonical YouTube URL
  normalizeYoutubeUrl(url) {
    const match = url.match(/youtube\.com\/(watch\?v=|shorts\/)(.{11})/);
    if (!match) return url;
    return match[1] === "shorts/"
      ? `https://www.youtube.com/shorts/${match[2]}`
      : `https://www.youtube.com/watch?v=${match[2]}`;
  }

  summarizeFromGeminiVideoUnderstanding(videoUrl, requestId = null) {
    requestId = requestId || this.beginSummary(null);

    chrome.storage.local.get("currentVideoInfo", ({ currentVideoInfo }) => {
      if (currentVideoInfo && currentVideoInfo.length) {
        const estTime = Math.ceil(currentVideoInfo.length / 30);
        this.getStore().dispatch({
          type: "SUMMARY_ESTIMATE",
          requestId,
          estimateSeconds: estTime,
        });
      }
    });

    chrome.runtime.sendMessage({ action: "summarizeVideo", text: videoUrl }, (response) => {
      // Success on <ul> fragment
      if (typeof response === "string") {
        try {
          this.createSummaryList(response, requestId);
        } catch (error) {
          this.ResponseErrorMsg({ error: String(error) }, requestId);
        }
      } else {
        this.ResponseErrorMsg(response, requestId);
      }
    });
  }

  performNormalContentSummary(requestId = null, knownTab = null) {
    chrome.runtime.sendMessage({ action: "getApiKey" }, (res) => {
      const apiKey = res ? res.apiKey : "";

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (knownTab) tabs = [knownTab];
        if (!tabs.length) {
          if (requestId) this.ResponseErrorMsg(null, requestId);
          return;
        }
        requestId = requestId || this.beginSummary(tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, { message: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            this.ResponseErrorMsg(response, requestId);
            return;
          }
        });

        const isYouTube = tabs[0].url && tabs[0].url.toLowerCase().includes("youtube");

        if (isYouTube) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "expandYouTubeDescription" }, () => {
            // Wait for expansion before scraping
            setTimeout(() => {
              this.getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url, requestId);
            }, 500);
          });
        } else {
          this.getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url, requestId);
        }
      });
    });
  }

  getContentAndSummarize(tabId, apiKey, url, requestId) {
    requestId = requestId || this.beginSummary(tabId);
    chrome.tabs.sendMessage(tabId, { action: "getContent" }, (response) => {
      if (response && response.content) {
        const divisor = this.isPredominantlyLatinChars(response.content) ? 3000 : 1500;
        this.getStore().dispatch({
          type: "SUMMARY_ESTIMATE",
          requestId,
          estimateSeconds: Math.ceil(response.content.length / divisor),
        });

        this.summarizeContent(response.content, apiKey, url, requestId);
      } else {
        this.ResponseErrorMsg(response, requestId);
      }
    });
  }

  isPredominantlyLatinChars(text) {
    const latinChars = text.match(/[a-zA-Z\u00C0-\u00FF]/g)?.length || 0;
    const squareChars = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0;

    return latinChars > squareChars;
  }

  summarizeContent(content, apiKey, url, requestId) {
    responseField.value = "";

    chrome.runtime.sendMessage(
      { action: "summarizeApi", text: content, apiKey: apiKey, url: url },
      (response) => {
        // Treat early close as error
        if (!response || response.error) {
          responseField.value = `API Error: ${response?.error || "No response from background"}`;
          this.ResponseErrorMsg(response, requestId);
        } else {
          responseField.value = response;
          try {
            this.createSummaryList(response, requestId);
          } catch (error) {
            responseField.value = `HTML Error: ${error}`;
            this.ResponseErrorMsg(response, requestId);
          }
        }
      }
    );
  }

  createSummaryList(response, requestId = null) {
    const summaryItems = this.parseSummaryItems(response);
    if (summaryItems.length === 0) {
      throw new Error("No summary items found in response");
    }

    const timestamp = Date.now();
    this.getStore().dispatch({
      type: "SUMMARY_SUCCESS",
      requestId,
      items: summaryItems,
      timestamp,
    });
    // Don't persist summaries in incognito mode
    chrome.storage.local.get("isIncognito", ({ isIncognito = false }) => {
      if (!isIncognito) {
        chrome.storage.local.set({
          summaryList: summaryItems,
          timestamp,
        });
      }
    });
  }

  RecordSummaryTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      this.getStore().summarizedTabId = tabs[0]?.id;
    });
  }

  ResponseErrorMsg(response, requestId = null) {
    const errorMsg = response?.error || "";
    this.getStore().dispatch({
      type: "SUMMARY_ERROR",
      requestId,
      errorKey: errorMsg.includes("overloaded") ? "geminiOverloadMsg" : "geminiErrorMsg",
    });
  }

  render(snapshot, meta = {}) {
    const statusMessage = document.getElementById("geminiEmptyMessage");
    const listContainer = document.getElementById("summaryList");
    const clearAction = document.getElementById("clearButtonSummary");
    const apiAction = document.getElementById("apiButton");
    const sendAction = document.getElementById("sendButton");
    const videoAction = document.getElementById("videoSummaryButton");
    const undoAction = document.getElementById("undoButtonSummary");
    if (
      !statusMessage ||
      !listContainer ||
      !clearAction ||
      !apiAction ||
      !sendAction ||
      !undoAction
    )
      return;
    const { summary, api, favorite: favoriteState } = snapshot;
    const ready = summary.phase === "ready" && summary.items.length > 0;
    const generating = summary.phase === "generating";
    // Starting a new generate consumes the undo window: SUMMARY_STORAGE_SET is a
    // no-op while generating, so a still-visible Undo button would just be a dead click.
    const undoing = Boolean(this._pendingUndo) && !ready && !generating;
    let messageKey = "geminiEmptyMsg";
    let substitutions;

    if (generating) {
      if (Number.isFinite(summary.estimateSeconds)) {
        messageKey = "geminiLoadMsg";
        substitutions = String(summary.estimateSeconds);
      } else {
        messageKey = "geminiLoadMsgNoEstimate";
      }
    } else if (summary.phase === "error") {
      messageKey = summary.errorKey || "geminiErrorMsg";
    } else if (api.status === "invalid") {
      messageKey = "apiInvalidMsg";
    } else if (api.status === "missing") {
      messageKey = "geminiFirstMsg";
    }

    statusMessage.style.whiteSpace = "pre-line";
    const message = chrome.i18n.getMessage(messageKey, substitutions);
    statusMessage.textContent = message;
    statusMessage.innerText = message;
    statusMessage.classList.toggle("d-none", ready);
    statusMessage.classList.toggle("shineText", generating);

    // Patch favorite icon classNames in place
    const summaryChanged = meta.summaryChanged !== false;
    if (!ready) {
      listContainer.replaceChildren();
    } else if (summaryChanged || listContainer.children.length === 0) {
      listContainer.replaceChildren(this.buildSummaryListElement(summary.items));
    }

    if (ready) {
      const trimmedFavorite = favoriteState.items.map((item) => item.split(" @")[0]);
      const favoriteComponent = this.favoriteComponent || favorite;
      listContainer.querySelectorAll(".summary-list").forEach((item) => {
        const icon = item.querySelector("i");
        if (icon.classList.contains("spring-animation") || icon.classList.contains("unfavoriting"))
          return;
        const itemName = item.querySelector("span:first-child").textContent;
        const newIcon = favoriteComponent.createFavoriteIcon(itemName, trimmedFavorite);
        if (icon.className !== newIcon.className) icon.className = newIcon.className;
        icon.title = newIcon.title;
      });
    }

    clearAction.classList.toggle("d-none", !ready);
    clearAction.disabled = !ready || generating;
    apiAction.classList.toggle("d-none", ready || undoing);
    undoAction.classList.toggle("d-none", !undoing);
    sendAction.disabled = api.status !== "valid" || generating;
    if (videoAction) {
      videoAction.classList.toggle("d-none", !snapshot.video.available);
      videoAction.classList.toggle("active-button", snapshot.video.enabled);
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Gemini;
}
