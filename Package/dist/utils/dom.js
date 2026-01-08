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
    }
};

if (typeof window !== "undefined") {
    window.DOMUtils = DOMUtils;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = DOMUtils;
}
