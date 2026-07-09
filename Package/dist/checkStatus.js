// Wrap in IIFE to prevent variable leaks
(function () {
  if (window.TMEhasRun) {
    return true; // Will ultimately be passed back to executeScript
  }
  window.TMEhasRun = true;
})();
