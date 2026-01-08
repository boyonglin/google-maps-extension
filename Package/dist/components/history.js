class History {
    addHistoryPageListener() {
        // Track the click event on li elements
        searchHistoryListContainer.addEventListener("mousedown", (event) => {
            const liElement = DOMUtils.findClosestListItem(event);
            if (!liElement) return;

            if (liElement.classList.contains("delete-list")) {
                if (event.target.classList.contains("form-check-input")) {
                    return;
                } else {
                    liElement.classList.toggle("checked-list");
                    const checkbox = liElement.querySelector("input");
                    checkbox.checked = !checkbox.checked;
                    remove.updateDeleteCount();
                }
            } else {
                const selectedText = liElement.querySelector("span")?.textContent;
                
                state.buildSearchUrl(selectedText).then(searchUrl => {
                    // Check if the clicked element has the "bi" class (favorite icon)
                    if (event.target.classList.contains("bi")) {
                        if (window.Analytics) window.Analytics.trackFeatureClick("add_to_favorite_from_history", "searchHistoryListContainer");
                        favorite.addToFavoriteList(selectedText);
                        DOMUtils.animateFavoriteIcon(event.target);
                        DOMUtils.refreshFavoriteList();
                    } else if (event.target.classList.contains("form-check-input")) {
                        return;
                    } else {
                        if (window.Analytics) window.Analytics.trackFeatureClick("click_history_item", "searchHistoryListContainer");
                        if (event.button === 1) {
                            // Middle click
                            event.preventDefault();
                            chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
                        } else if (event.button === 0) {
                            // Left click
                            window.open(searchUrl, "_blank");
                        }
                    }
                }).catch(error => {
                    console.error('Failed to build search URL:', error);
                });
            }
        });

        // Add context menu listener for history items
        searchHistoryListContainer.addEventListener("contextmenu", (event) => {
            ContextMenuUtil.createContextMenu(event, searchHistoryListContainer);
        });

        clearButton.addEventListener("click", () => {
            if (window.Analytics) window.Analytics.trackFeatureClick("clear_history", "clearButton");
            chrome.storage.local.set({ searchHistoryList: [] });

            clearButton.disabled = true;
            searchHistoryListContainer.innerHTML = "";

            emptyMessage.style.display = "block";
            const message = chrome.i18n.getMessage("clearedUpMsg");
            emptyMessage.innerHTML = message ? message.replace(/\n/g, "<br>") : "";

            state.hasHistory = false;

            // Send a message to background.js to request clearing of selected text list data
            chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });

            measureContentSize();
        });
    }

    createListItem(itemName, favoriteList) {
        const li = document.createElement("li");
        li.className = "list-group-item border rounded mb-3 px-3 history-list d-flex justify-content-between align-items-center text-break";

        const span = document.createElement("span");
        span.textContent = itemName;
        li.appendChild(span);

        const icon = favorite.createFavoriteIcon(itemName, favoriteList);
        li.appendChild(icon);

        const checkbox = document.createElement("input");
        checkbox.className = "form-check-input d-none";
        checkbox.type = "checkbox";
        checkbox.value = "delete";
        checkbox.name = "checkDelete";
        checkbox.ariaLabel = "Delete";
        checkbox.style.cursor = "pointer";
        li.appendChild(checkbox);

        return li;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = History;
}