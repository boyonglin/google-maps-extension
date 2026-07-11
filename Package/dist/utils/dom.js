const DOMUtils = {
  // Find closest LI element
  findClosestListItem(event) {
    if (event.target.tagName === "LI") {
      return event.target;
    } else if (event.target.parentElement?.tagName === "LI") {
      return event.target.parentElement;
    }
    return null;
  },

  // Spring animate favorite icon
  animateFavoriteIcon(iconElement) {
    iconElement.className = "bi bi-patch-check-fill matched spring-animation";
    setTimeout(() => {
      iconElement.classList.remove("spring-animation");
    }, 500);
  },

  // Fade the icon out on unfavorite instead of reusing the "add" spring
  // animation (which would read as the opposite action). The icon is only
  // swapped to its unfavorited state once the pointer leaves the icon's own
  // hit area, so the user doesn't see it flip while still hovering it.
  fadeOutFavoriteIcon(iconElement) {
    iconElement.classList.add("unfavoriting");

    const restore = () => {
      iconElement.className = "bi bi-patch-plus-fill";
      iconElement.title = chrome.i18n.getMessage("plusLabel");
    };

    iconElement.addEventListener("mouseleave", restore, { once: true });
  },

  _undoToastTimer: null,

  // Transient toast with an Undo action after a destructive clear (history/summary).
  // Only one at a time; auto-dismisses after 6 seconds.
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
