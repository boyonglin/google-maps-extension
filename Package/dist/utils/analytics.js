/**
 * GA4 Analytics popup wrapper
 */

import Analytics from "./analytics.module.js";

if (typeof window !== "undefined") {
  window.Analytics = Analytics;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Analytics;
}
