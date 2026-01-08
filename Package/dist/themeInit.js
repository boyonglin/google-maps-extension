/**
 * Theme Initialization Script
 * Runs before CSS to prevent theme flash on popup open
 */
(function () {
  chrome.storage.local.get("isDarkMode", function (result) {
    let isDark = result.isDarkMode;
    if (isDark === undefined) {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
    document.documentElement.style.visibility = "visible";
  });
})();
