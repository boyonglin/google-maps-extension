class Gemini {
  addGeminiPageListener() {
    summaryListContainer.addEventListener("click", (event) => {
      const liElement = DOMUtils.findClosestListItem(event);
      if (!liElement) return;

      const spans = liElement.querySelectorAll("span");
      const selectedText = Array.from(spans)
        .map((span) => span.textContent)
        .join(" ")
        .trim();

      state.buildSearchUrl(selectedText).then((searchUrl) => {
        if (event.target.classList.contains("bi")) {
          if (window.Analytics)
            window.Analytics.trackFeatureClick(
              "add_to_favorite_from_summary",
              "summaryListContainer"
            );
          const nameSpan = spans[0].textContent;
          if (spans.length >= 2) {
            const clueSpan = spans[1].textContent;
            favorite.addToFavoriteList(nameSpan + " @" + clueSpan);
          } else {
            favorite.addToFavoriteList(nameSpan);
          }
          DOMUtils.animateFavoriteIcon(event.target);
          DOMUtils.refreshFavoriteList();
        } else {
          if (window.Analytics)
            window.Analytics.trackFeatureClick("click_summary_item", "summaryListContainer");
          chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
        }
      });
    });

    summaryListContainer.addEventListener("contextmenu", (event) => {
      ContextMenuUtil.createContextMenu(event, summaryListContainer);
    });

    clearButtonSummary.addEventListener("click", () => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("clear_summary", "clearButtonSummary");
      chrome.storage.local.remove(["summaryList", "timestamp"]);

      state.hasSummary = false;
      summaryListContainer.innerHTML = "";
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
      clearButtonSummary.classList.add("d-none");
      geminiEmptyMessage.classList.remove("d-none");
      apiButton.classList.remove("d-none");

      measureContentSize();
    });

    // Video Summary Button toggle functionality
    videoSummaryButton.addEventListener("click", () => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("video_summary_toggle", "videoSummaryButton");
      state.localVideoToggle = !state.localVideoToggle;

      // Save new state to localStorage
      chrome.storage.local.set({ videoSummaryToggle: state.localVideoToggle });

      // Update button appearance
      if (state.localVideoToggle) {
        videoSummaryButton.classList.add("active-button");
        videoSummaryButton.classList.remove("no-hover-temp");
      } else {
        videoSummaryButton.classList.remove("active-button");
        videoSummaryButton.classList.add("no-hover-temp");
      }
    });

    // One time hover disable effect for videoSummaryButton
    videoSummaryButton.addEventListener("mouseleave", () => {
      if (videoSummaryButton.classList.contains("no-hover-temp")) {
        videoSummaryButton.classList.remove("no-hover-temp");
      }
    });

    sendButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("send_gemini", "sendButton");
      sendButton.disabled = true;
      clearButtonSummary.disabled = true;
      this.RecordSummaryTab();

      // Check if video summary button is active
      const isVideoSummaryActive =
        videoSummaryButton.classList.contains("active-button") &&
        !videoSummaryButton.classList.contains("d-none");

      if (isVideoSummaryActive) {
        // Use video summary functionality
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs.length) {
            // No active tab (e.g. focus on devtools/detached window): restore controls
            sendButton.disabled = false;
            clearButtonSummary.disabled = false;
            return;
          }
          this.summarizeFromGeminiVideoUnderstanding(this.normalizeYoutubeUrl(tabs[0].url));
        });
      } else {
        // Use normal content summarization
        this.performNormalContentSummary();
      }
    });
  }

  // Check if the API key is defined and valid
  fetchAPIKey(apiKey) {
    apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");

    if (apiKey) {
      chrome.runtime.sendMessage({ action: "verifyApiKey", apiKey }, ({ valid, error } = {}) => {
        if (error || !valid) {
          sendButton.disabled = true;
          geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
        } else {
          apiInput.placeholder = "............" + apiKey.slice(-4);
        }
      });
    } else {
      sendButton.disabled = true;
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
    }
  }

  // Check if current tab URL contains "youtube" and show/hide videoSummaryButton
  async checkCurrentTabForYoutube() {
    const isGeminiActive = geminiSummaryButton.classList.contains("active-button");
    if (state.videoSummaryMode === undefined) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTabUrl = tabs[0]?.url || "";
      const youtubeMatch = currentTabUrl.match(/youtube\.com\/(?:watch\?v=|shorts\/)(.{11})/);

      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        state.videoSummaryMode = Boolean(videoId);

        // Scrape length in the background; not needed until summarization runs
        this.scrapeLen(videoId)
          .then((videoLength) => {
            chrome.storage.local.set({
              currentVideoInfo: {
                videoId: videoId,
                length: videoLength,
              },
            });
          })
          .catch((error) => {
            console.error("Error scraping video length:", error);
          });
      } else {
        // Clear currentVideoInfo if not on YouTube
        state.videoSummaryMode = false;
        chrome.storage.local.remove("currentVideoInfo");
      }

      videoSummaryButton.classList.toggle("active-button", state.localVideoToggle);
    }

    if (isGeminiActive) {
      videoSummaryButton.classList.toggle("d-none", !state.videoSummaryMode);
    }
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

  // Clear summary data if it's older than 1 hour
  clearExpiredSummary() {
    chrome.storage.local.get(["summaryList", "timestamp", "favoriteList"], (result) => {
      if (result.timestamp && result.summaryList && result.summaryList.length > 0) {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - result.timestamp) / 1000;
        if (elapsedTime > 86400) {
          // Data is expired, clear it and show empty state
          state.hasSummary = false;
          summaryListContainer.innerHTML = "";
          geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
          clearButtonSummary.classList.add("d-none");
          geminiEmptyMessage.classList.remove("d-none");
          apiButton.classList.remove("d-none");
          clearButtonSummary.disabled = true;
          chrome.storage.local.remove(["summaryList", "timestamp"]);
          checkTextOverflow();
          delayMeasurement();
        } else {
          if (result.summaryList) {
            state.hasSummary = true;
            geminiEmptyMessage.classList.add("d-none");
            clearButtonSummary.classList.remove("d-none");
            clearButtonSummary.disabled = false;
            apiButton.classList.add("d-none");

            // Only reconstruct if summary list structure changed or container is empty
            if (state.summaryListChanged || summaryListContainer.innerHTML.trim() === "") {
              summaryListContainer.innerHTML = this.constructSummaryHTML(
                result.summaryList,
                result.favoriteList
              );
            } else if (result.favoriteList) {
              // Just update the favorite icons if only favorites changed
              this.updateSummaryFavoriteIcons(result.favoriteList);
            }

            checkTextOverflow();
            delayMeasurement();
          }
        }
      } else {
        checkTextOverflow();
        delayMeasurement();
      }
    });
  }

  // Parse LLM output into plain-text items to prevent prompt injection.
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

  // Update only the favorite icons in the summary list without reconstructing the entire list
  updateSummaryFavoriteIcons(favoriteList = []) {
    const summaryItems = summaryListContainer.querySelectorAll(".summary-list");
    const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);

    summaryItems.forEach((item) => {
      const itemName = item.querySelector("span:first-child").textContent;
      const existingIcon = item.querySelector("i");

      if (existingIcon) {
        const newIcon = favorite.createFavoriteIcon(itemName, trimmedFavorite);
        existingIcon.className = newIcon.className;
      }
    });
  }

  // Strip decorative query params so Gemini gets a canonical YouTube URL
  normalizeYoutubeUrl(url) {
    const match = url.match(/youtube\.com\/(watch\?v=|shorts\/)(.{11})/);
    if (!match) return url;
    return match[1] === "shorts/"
      ? `https://www.youtube.com/shorts/${match[2]}`
      : `https://www.youtube.com/watch?v=${match[2]}`;
  }

  // Get Gemini response
  summarizeFromGeminiVideoUnderstanding(videoUrl) {
    // Clear any existing summary data first to prevent race condition
    chrome.storage.local.remove(["summaryList", "timestamp"]);

    // begin UI update (same as sendButton click)
    sendButton.disabled = true;
    clearButtonSummary.disabled = true;
    summaryListContainer.innerHTML = "";
    geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiLoadMsg");
    geminiEmptyMessage.classList.remove("d-none");
    geminiEmptyMessage.classList.add("shineText");

    // request background video length
    chrome.storage.local.get("currentVideoInfo", ({ currentVideoInfo }) => {
      if (currentVideoInfo && currentVideoInfo.length) {
        const estTime = Math.ceil(currentVideoInfo.length / 30);
        const originalText = geminiEmptyMessage.innerHTML;
        const newText = originalText.replace("NaN", estTime);
        geminiEmptyMessage.innerHTML = newText;
      }
    });

    measureContentSize();

    // request background summary
    chrome.runtime.sendMessage({ action: "summarizeVideo", text: videoUrl }, (response) => {
      // restore send-button state
      sendButton.disabled = false;

      // success when we get a string fragment of <ul>...</ul>
      if (typeof response === "string") {
        try {
          this.createSummaryList(response);
        } catch (error) {
          this.ResponseErrorMsg({ error: String(error) });
        }
      } else {
        this.ResponseErrorMsg(response);
      }
    });
  }

  performNormalContentSummary() {
    chrome.runtime.sendMessage({ action: "getApiKey" }, (res) => {
      const apiKey = res ? res.apiKey : "";

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) {
          // No active tab (e.g. focus on devtools/detached window): restore controls
          sendButton.disabled = false;
          clearButtonSummary.disabled = false;
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { message: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            summaryListContainer.innerHTML = "";
            this.ResponseErrorMsg(response);
            geminiEmptyMessage.classList.remove("d-none");
            sendButton.disabled = false;
            clearButtonSummary.disabled = false;
            return;
          }
        });

        // Check if we're on YouTube and expand description first
        const isYouTube = tabs[0].url && tabs[0].url.toLowerCase().includes("youtube");

        if (isYouTube) {
          // First expand the YouTube description
          chrome.tabs.sendMessage(tabs[0].id, { action: "expandYouTubeDescription" }, () => {
            // Wait a moment for the expansion to complete, then get content
            setTimeout(() => {
              this.getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url);
            }, 500);
          });
        } else {
          // For non-YouTube pages, get content directly
          this.getContentAndSummarize(tabs[0].id, apiKey, tabs[0].url);
        }
      });
    });
  }

  getContentAndSummarize(tabId, apiKey, url) {
    chrome.tabs.sendMessage(tabId, { action: "getContent" }, (response) => {
      if (response && response.content) {
        summaryListContainer.innerHTML = "";
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiLoadMsg");
        geminiEmptyMessage.classList.remove("d-none");
        geminiEmptyMessage.classList.add("shineText");

        const originalText = geminiEmptyMessage.innerHTML;
        const divisor = this.isPredominantlyLatinChars(response.content) ? 1500 : 750;

        const newText = originalText.replace("NaN", Math.ceil(response.length / divisor));
        geminiEmptyMessage.innerHTML = newText;

        this.summarizeContent(response.content, apiKey, url);
        measureContentSize();
      }
    });
  }

  // Check if the content is predominantly Latin characters
  isPredominantlyLatinChars(text) {
    const latinChars = text.match(/[a-zA-Z\u00C0-\u00FF]/g)?.length || 0;
    const squareChars = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0;

    return latinChars > squareChars;
  }

  summarizeContent(content, apiKey, url) {
    responseField.value = "";

    chrome.runtime.sendMessage(
      { action: "summarizeApi", text: content, apiKey: apiKey, url: url },
      (response) => {
        // response is undefined if the channel closed early (e.g. SW killed);
        // treat as an error so the send button gets re-enabled
        if (!response || response.error) {
          responseField.value = `API Error: ${response?.error || "No response from background"}`;
          this.ResponseErrorMsg(response);
        } else {
          responseField.value = response;
          try {
            this.createSummaryList(response);
          } catch (error) {
            responseField.value = `HTML Error: ${error}`;
            this.ResponseErrorMsg(response);
          }
        }
        sendButton.disabled = false;
      }
    );
  }

  createSummaryList(response) {
    const summaryItems = this.parseSummaryItems(response);
    if (summaryItems.length === 0) {
      throw new Error("No summary items found in response");
    }

    document.documentElement.classList.add("no-expand-scroll");
    summaryListContainer.classList.add("no-expand-scroll");

    summaryListContainer.replaceChildren(this.buildSummaryListElement(summaryItems));
    state.hasSummary = true;
    geminiEmptyMessage.classList.remove("shineText");
    geminiEmptyMessage.classList.add("d-none");
    clearButtonSummary.classList.remove("d-none");
    apiButton.classList.add("d-none");
    clearButtonSummary.disabled = false;

    checkTextOverflow();
    measureContentSize(true);

    setTimeout(() => {
      document.documentElement.classList.remove("no-expand-scroll");
      summaryListContainer.classList.remove("no-expand-scroll");
    }, 400);

    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
      if (!favoriteList) {
        return;
      }

      this.updateSummaryFavoriteIcons(favoriteList);
    });

    // Respect incognito mode: do not persist summaries when enabled
    chrome.storage.local.get("isIncognito", ({ isIncognito = false }) => {
      if (!isIncognito) {
        const currentTime = Date.now();
        chrome.storage.local.set({
          summaryList: summaryItems,
          timestamp: currentTime,
        });
      }
    });
  }

  RecordSummaryTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      state.summarizedTabId = tabs[0]?.id;
    });
  }

  ResponseErrorMsg(response) {
    const errorMsg = response?.error || "";
    if (errorMsg.includes("overloaded")) {
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiOverloadMsg");
    } else {
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiErrorMsg");
    }

    state.hasSummary = false;
    geminiEmptyMessage.classList.remove("shineText");
    clearButtonSummary.classList.add("d-none");
    apiButton.classList.remove("d-none");
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Gemini;
}
