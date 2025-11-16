class Gemini {
    addGeminiPageListener() {
        summaryListContainer.addEventListener("click", (event) => {
            let liElement;
            if (event.target.tagName === "LI") {
                liElement = event.target;
            }
            else if (event.target.parentElement.tagName === "LI") {
                liElement = event.target.parentElement;
            }
            else {
                return;
            }
            const spans = liElement.querySelectorAll("span");
            const selectedText = Array.from(spans).map(span => span.textContent).join(" ").trim();
            state.buildSearchUrl(selectedText).then(searchUrl => {
                if (event.target.classList.contains("bi")) {
                    const nameSpan = spans[0].textContent;
                    if (spans.length >= 2) {
                        const clueSpan = spans[1].textContent;
                        favorite.addToFavoriteList(nameSpan + " @" + clueSpan);
                    }
                    else {
                        favorite.addToFavoriteList(nameSpan);
                    }
                    event.target.className = "bi bi-patch-check-fill matched spring-animation";
                    setTimeout(function () {
                        event.target.classList.remove("spring-animation");
                    }, 500);
                    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
                        favorite.updateFavorite(favoriteList);
                    });
                }
                else {
                    chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
                }
            });
        });
        summaryListContainer.addEventListener("contextmenu", (event) => {
            ContextMenuUtil.createContextMenu(event, summaryListContainer);
        });
        clearButtonSummary.addEventListener("click", () => {
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
            state.localVideoToggle = !state.localVideoToggle;
            // Save new state to localStorage
            chrome.storage.local.set({ videoSummaryToggle: state.localVideoToggle });
            // Update button appearance
            if (state.localVideoToggle) {
                videoSummaryButton.classList.add("active-button");
                videoSummaryButton.classList.remove("no-hover-temp");
            }
            else {
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
            sendButton.disabled = true;
            clearButtonSummary.disabled = true;
            this.RecordSummaryTab();
            // Check if video summary button is active
            const isVideoSummaryActive = videoSummaryButton.classList.contains("active-button")
                && !videoSummaryButton.classList.contains("d-none");
            if (isVideoSummaryActive) {
                // Use video summary functionality
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    this.summarizeFromGeminiVideoUnderstanding(tabs[0].url);
                });
            }
            else {
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
                }
                else {
                    apiInput.placeholder = "............" + apiKey.slice(-4);
                }
            });
        }
        else {
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
                try {
                    const videoLength = await this.scrapeLen(videoId);
                    // Store video info for later use in summarization
                    chrome.storage.local.set({
                        currentVideoInfo: {
                            videoId: videoId,
                            length: videoLength
                        }
                    });
                }
                catch (error) {
                    console.error("Error scraping video length:", error);
                }
            }
            else {
                // Clear currentVideoInfo if not on YouTube
                chrome.storage.local.remove("currentVideoInfo");
            }
            videoSummaryButton.classList.toggle("active-button", state.localVideoToggle);
        }
        if (isGeminiActive) {
            videoSummaryButton.classList.toggle("d-none", !state.videoSummaryMode);
        }
    }
    async scrapeLen(id) {
        const html = await fetch(`https://www.youtube.com/watch?v=${id}`, {
            credentials: "omit",
        }).then((r) => r.text());
        const m = html.match(/"lengthSeconds":"(\d+)"/);
        return m ? Number(m[1]) : null;
    }
    // Clear summary data if it's older than 1 hour
    clearExpiredSummary() {
        chrome.storage.local.get(["summaryList", "timestamp", "favoriteList"], (result) => {
            if (result.timestamp && result.summaryList.length > 0) {
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
                }
                else {
                    if (result.summaryList) {
                        state.hasSummary = true;
                        geminiEmptyMessage.classList.add("d-none");
                        clearButtonSummary.classList.remove("d-none");
                        clearButtonSummary.disabled = false;
                        apiButton.classList.add("d-none");
                        // Only reconstruct if summary list structure changed or container is empty
                        if (state.summaryListChanged || summaryListContainer.innerHTML.trim() === "") {
                            summaryListContainer.innerHTML = this.constructSummaryHTML(result.summaryList, result.favoriteList);
                        }
                        else if (result.favoriteList) {
                            // Just update the favorite icons if only favorites changed
                            this.updateSummaryFavoriteIcons(result.favoriteList);
                        }
                        checkTextOverflow();
                        delayMeasurement();
                    }
                }
            }
            else {
                checkTextOverflow();
                delayMeasurement();
            }
        });
    }
    constructSummaryHTML(summaryList, favoriteList = []) {
        let html = '<ul class="list-group d-flex">';
        summaryList.forEach((item, index) => {
            const isLastItem = index === summaryList.length - 1;
            const mbClass = isLastItem ? "" : "mb-3";
            html += `
          <li class="list-group-item border rounded px-3 summary-list d-flex justify-content-between align-items-center text-break ${mbClass}">
            <span>${item.name}</span>
            <span class="d-none">${item.clue}</span>
            <i class="bi"></i>
          </li>
        `;
        });
        html += "</ul>";
        // Set the HTML first, then update the favorite icons
        summaryListContainer.innerHTML = html;
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
                const estTime = Math.ceil(currentVideoInfo.length / 10);
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
                this.createSummaryList(response);
            }
            else {
                this.ResponseErrorMsg(response);
            }
        });
    }
    performNormalContentSummary() {
        chrome.runtime.sendMessage({ action: "getApiKey" }, (res) => {
            const apiKey = res ? res.apiKey : "";
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
                }
                else {
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
                geminiEmptyMessage.innerText =
                    chrome.i18n.getMessage("geminiLoadMsg");
                geminiEmptyMessage.classList.remove("d-none");
                geminiEmptyMessage.classList.add("shineText");
                const originalText = geminiEmptyMessage.innerHTML;
                const divisor = this.isPredominantlyLatinChars(response.content)
                    ? 1500
                    : 750;
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
        chrome.runtime.sendMessage({ action: "summarizeApi", text: content, apiKey: apiKey, url: url }, (response) => {
            if (response.error) {
                responseField.value = `API Error: ${response.error}`;
                this.ResponseErrorMsg(response);
            }
            else {
                responseField.value = response;
                try {
                    this.createSummaryList(response);
                }
                catch (error) {
                    responseField.value = `HTML Error: ${error}`;
                    this.ResponseErrorMsg(response);
                }
            }
            sendButton.disabled = false;
        });
    }
    createSummaryList(response) {
        summaryListContainer.innerHTML = response;
        const lastListItem = summaryListContainer.querySelector(".list-group .list-group-item:last-child");
        if (lastListItem) {
            lastListItem.classList.remove("mb-3");
        }
        state.hasSummary = true;
        geminiEmptyMessage.classList.remove("shineText");
        geminiEmptyMessage.classList.add("d-none");
        clearButtonSummary.classList.remove("d-none");
        apiButton.classList.add("d-none");
        clearButtonSummary.disabled = false;
        checkTextOverflow();
        measureContentSize(true);
        // store the response and current time
        const listItems = document.querySelectorAll(".summary-list");
        const data = [];
        listItems.forEach((item) => {
            const nameSpan = item.querySelector("span:first-child").textContent;
            const clueElem = item.querySelector("span.d-none");
            const clueSpan = clueElem ? clueElem.textContent : "";
            data.push({ name: nameSpan, clue: clueSpan });
        });
        chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
            if (!favoriteList) {
                return;
            }
            const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);
            listItems.forEach((item) => {
                const itemName = item.querySelector("span:first-child").textContent;
                const icon = favorite.createFavoriteIcon(itemName, trimmedFavorite);
                item.appendChild(icon);
            });
        });
        // Respect incognito mode: do not persist summaries when enabled
        chrome.storage.local.get("isIncognito", ({ isIncognito = false }) => {
            if (!isIncognito) {
                const currentTime = Date.now();
                chrome.storage.local.set({
                    summaryList: data,
                    timestamp: currentTime,
                });
            }
        });
    }
    RecordSummaryTab() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            state.summarizedTabId = currentTab.id;
        });
    }
    ResponseErrorMsg(response) {
        if (response.error.includes("overloaded")) {
            geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiOverloadMsg");
        }
        else {
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
//# sourceMappingURL=gemini.js.map