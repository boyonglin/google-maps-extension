interface PaymentStage {
  isTrial?: boolean;
  isPremium?: boolean;
  isFirst?: boolean;
  isFree?: boolean;
  trialEnd?: number;
}

class State {
  // Page state
  hasHistory: boolean = false;
  hasFavorite: boolean = false;
  hasSummary: boolean = false;
  hasInit: boolean = false;

  // List change flags
  historyListChanged: boolean = false;
  favoriteListChanged: boolean = false;
  summaryListChanged: boolean = false;

  // Video summary mode
  videoSummaryMode: boolean | undefined = undefined;
  localVideoToggle: boolean = false;
  summarizedTabId: number | undefined = undefined;

  // User state
  paymentStage: PaymentStage | null = null;

  // Dimension cache
  previousWidth: number = 0;
  previousHeight: number = 0;

  /**
   * Build search URL
   * @param q - Search query
   */
  buildSearchUrl(q: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "buildSearchUrl", query: q },
        (response) => {
          resolve(response?.url);
        }
      );
    });
  }

  /**
   * Build directions URL
   * @param origin - Origin location
   * @param destination - Destination location
   */
  buildDirectionsUrl(origin: string, destination: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "buildDirectionsUrl", origin, destination },
        (response) => resolve(response?.url)
      );
    });
  }

  /**
   * Update maps button URL
   */
  buildMapsButtonUrl(): void {
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
   * @param width - Width
   * @param height - Height
   */
  updateDimensions(width: number, height: number): void {
    this.previousWidth = width;
    this.previousHeight = height;
  }
}

// CommonJS export for tests
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = State;
}
