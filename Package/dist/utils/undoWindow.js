const UNDO_WINDOW_MS = 6000;

// Tracks a single pending "undo" payload behind a countdown, shared by
// History/Gemini's clear-then-undo button-swap behavior.
class UndoWindow {
  constructor(onExpire) {
    this._onExpire = onExpire;
    this._timer = null;
    this._pending = null;
  }

  get pending() {
    return this._pending;
  }

  start(payload) {
    clearTimeout(this._timer);
    this._pending = payload;
    this._timer = setTimeout(() => {
      this._pending = null;
      this._onExpire();
    }, UNDO_WINDOW_MS);
  }

  // Cancels the window and returns its payload (null if none was pending or it already expired).
  consume() {
    clearTimeout(this._timer);
    const pending = this._pending;
    this._pending = null;
    return pending;
  }
}

if (typeof window !== "undefined") {
  window.UndoWindow = UndoWindow;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = UndoWindow;
}
