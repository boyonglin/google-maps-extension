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

  // Fixed row above the (reversed) list in delete mode, toggling all items on/off
  createSelectAllBar(items, selected) {
    const bar = document.createElement("div");
    bar.className = "select-all-bar d-flex align-items-center px-3 py-2 mb-2";

    const label = document.createElement("label");
    label.className = "d-flex justify-content-between align-items-center w-100 mb-0";

    const text = document.createElement("span");
    text.textContent = chrome.i18n.getMessage("selectAllBtnText");
    label.appendChild(text);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input select-all-checkbox";
    const allSelected = items.length > 0 && items.every((item) => selected.has(item));
    const someSelected = items.some((item) => selected.has(item));
    checkbox.checked = allSelected;
    checkbox.indeterminate = !allSelected && someSelected;
    label.appendChild(checkbox);

    bar.appendChild(label);
    return bar;
  },
};

if (typeof window !== "undefined") {
  window.DOMUtils = DOMUtils;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DOMUtils;
}
