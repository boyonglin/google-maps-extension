// The DOM is authoritative. A failed injection must not leave a stale flag that
// makes the next toolbar click try to close an interface that never opened.
Boolean(document.getElementById("TMEiframe"));
