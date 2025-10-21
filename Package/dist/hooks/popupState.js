class State {
  constructor() {
    // Page state
    this.hasHistory = false;
    this.hasFavorite = false;
    this.hasSummary = false;
    this.hasInit = false;

    // List change flags
    this.historyListChanged = false;
    this.favoriteListChanged = false;
    this.summaryListChanged = false;

    // Video summary mode
    this.videoSummaryMode = undefined;
    this.localVideoToggle = false;
    this.summarizedTabId = undefined;

    // User state
    this.paymentStage = null;

    // Dimension cache
    this.previousWidth = 0;
    this.previousHeight = 0;
  }

  /**
   * Build search URL
   * @param {string} q - Search query
   */
  buildSearchUrl(q) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "buildSearchUrl", query: q },
        (response) => resolve(response.url)
      );
    });
  }

  /**
   * Build directions URL
   * @param {string} origin - Origin location
   * @param {string} destination - Destination location
   */
  buildDirectionsUrl(origin, destination) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "buildDirectionsUrl", origin, destination },
        (response) => resolve(response.url)
      );
    });
  }

  /**
   * Update maps button URL
   */
  buildMapsButtonUrl() {
    chrome.runtime.sendMessage(
      { action: "buildMapsUrl" },
      (response) => {
        if (response && response.url) {
          mapsButton.href = response.url;
        }
      }
    );
  }

  /**
   * Update dimension cache
   * @param {number} width - Width
   * @param {number} height - Height
   */
  updateDimensions(width, height) {
    this.previousWidth = width;
    this.previousHeight = height;
  }
}