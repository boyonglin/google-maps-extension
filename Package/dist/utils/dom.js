const DOMUtils = {
  /**
   * Find the closest LI element from an event target
   * Used by list click handlers in history, favorite, and gemini components
   */
  findClosestListItem(event) {
    if (event.target.tagName === "LI") {
      return event.target;
    } else if (event.target.parentElement?.tagName === "LI") {
      return event.target.parentElement;
    }
    return null;
  },

  /**
   * Animate a favorite icon with spring animation effect
   * Used when adding items to favorites from history or summary lists
   */
  animateFavoriteIcon(iconElement) {
    iconElement.className = "bi bi-patch-check-fill matched spring-animation";
    setTimeout(() => {
      iconElement.classList.remove("spring-animation");
    }, 500);
  },

  /**
   * Refresh favorite list after adding an item
   * Common pattern used after animating favorite icon
   */
  refreshFavoriteList() {
    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
      if (typeof favorite !== "undefined" && favorite.updateFavorite) {
        favorite.updateFavorite(favoriteList);
      }
    });
  },

  _undoToastTimer: null,

  /**
   * Show a transient toast with an Undo action after a destructive
   * operation (clear history/summary). Only one toast at a time; it
   * auto-dismisses after 6 seconds.
   */
  showUndoToast(message, onUndo) {
    document.querySelector(".undo-toast")?.remove();
    clearTimeout(this._undoToastTimer);

    const toast = document.createElement("div");
    toast.className = "undo-toast";

    const text = document.createElement("span");
    text.textContent = message;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "undo-toast-btn";
    button.textContent = chrome.i18n.getMessage("undoLabel");
    button.addEventListener("click", () => {
      clearTimeout(this._undoToastTimer);
      toast.remove();
      onUndo();
    });

    toast.append(text, button);
    document.body.appendChild(toast);

    this._undoToastTimer = setTimeout(() => toast.remove(), 6000);
  },
};

if (typeof window !== "undefined") {
  window.DOMUtils = DOMUtils;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DOMUtils;
}
