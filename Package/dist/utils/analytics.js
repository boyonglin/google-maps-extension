/**
 * GA4 Analytics Module for Chrome Extension
 * Centralized analytics management using Measurement Protocol API
 */

const Analytics = {
  GA_MEASUREMENT_ID: "G-NCCN15E4H0",
  GA_API_SECRET: "wTbbWhL3RiCdQfQcoIZhwA",
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  // Get or create anonymous Client ID
  getOrCreateClientId() {
    return new Promise((resolve) => {
      chrome.storage.local.get("ga_client_id", (result) => {
        if (result.ga_client_id) {
          resolve(result.ga_client_id);
        } else {
          const clientId = crypto.randomUUID();
          chrome.storage.local.set({ ga_client_id: clientId });
          resolve(clientId);
        }
      });
    });
  },

  // Get or create Session ID (expires after 30 min inactivity)
  getOrCreateSessionId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["ga_session_id", "ga_session_timestamp"], (result) => {
        const now = Date.now();

        if (result.ga_session_id && result.ga_session_timestamp) {
          const timeSinceLastActivity = now - result.ga_session_timestamp;

          if (timeSinceLastActivity < this.SESSION_TIMEOUT) {
            chrome.storage.local.set({ ga_session_timestamp: now });
            resolve(result.ga_session_id);
            return;
          }
        }

        const sessionId = Math.floor(now / 1000).toString();
        chrome.storage.local.set({
          ga_session_id: sessionId,
          ga_session_timestamp: now,
        });
        resolve(sessionId);
      });
    });
  },

  // Send event to GA4
  async trackEvent(eventName, eventParams = {}) {
    try {
      const clientId = await this.getOrCreateClientId();
      const sessionId = await this.getOrCreateSessionId();

      const payload = {
        client_id: clientId,
        events: [
          {
            name: eventName,
            params: {
              session_id: sessionId,
              engagement_time_msec: 100,
              ...eventParams,
            },
          },
        ],
      };

      const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${this.GA_MEASUREMENT_ID}&api_secret=${this.GA_API_SECRET}`;

      await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Silent fail, do not affect user experience
    }
  },

  // Track extension opened
  trackExtensionOpened() {
    this.trackEvent("extension_opened", {
      source: "popup",
    });
  },

  // Track feature button click
  trackFeatureClick(featureName, buttonId) {
    this.trackEvent("feature_click", {
      feature_name: featureName,
      button_id: buttonId,
    });
  },

  // Track search action
  trackSearch() {
    this.trackEvent("search_performed", {
      feature_name: "search",
    });
  },

  // Track page view
  trackPageView(pageName) {
    this.trackEvent("page_view", {
      page_name: pageName,
    });
  },
};

// Export for global use
window.Analytics = Analytics;

if (typeof module !== "undefined" && module.exports) {
  module.exports = Analytics;
}
