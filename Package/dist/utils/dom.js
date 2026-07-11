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
};

if (typeof window !== "undefined") {
  window.DOMUtils = DOMUtils;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DOMUtils;
}
