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

  // Fixed row above the (reversed) list in delete mode, toggling all items on/off
  createSelectAllBar(items, selected) {
    const bar = document.createElement("div");
    bar.className = "select-all-bar d-flex align-items-center px-3 py-2 mb-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input select-all-checkbox";
    checkbox.ariaLabel = chrome.i18n.getMessage("selectAllLabel");
    const allSelected = items.length > 0 && items.every((item) => selected.has(item));
    checkbox.checked = allSelected;
    checkbox.indeterminate = !allSelected && selected.size > 0;
    bar.appendChild(checkbox);

    const label = document.createElement("span");
    label.className = "ms-2";
    label.textContent = chrome.i18n.getMessage("selectAllBtnText");
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
