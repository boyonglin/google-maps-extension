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

  // Fade out (not the "add" animation) and wait for mouseleave so the icon doesn't flip mid-hover.
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
