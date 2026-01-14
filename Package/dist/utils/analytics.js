/**
 * GA4 Analytics Module for Chrome Extension (Popup Context)
 * Thin wrapper that re-exports from analytics.module.js for non-module script loading.
 */

import Analytics from "./analytics.module.js";

// Export for global use (popup context)
if (typeof window !== "undefined") {
  window.Analytics = Analytics;
}

// Export for CommonJS (testing)
if (typeof module !== "undefined" && module.exports) {
  module.exports = Analytics;
}
