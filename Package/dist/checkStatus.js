// Wrapping in a function to not leak/modify variables if the script
(function() {
    if (window.TMEhasRun){
        return true;  // Will ultimately be passed back to executeScript
    }
    window.TMEhasRun = true;
    // No return value here, so the return value is "undefined" (without quotes).
  })(); // <-- Invoke function. The return value is passed back to executeScript