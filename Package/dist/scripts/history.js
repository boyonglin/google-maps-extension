class History {
    addHistoryPageListener() {
        // Track the click event on li elements
        searchHistoryListContainer.addEventListener("mousedown", (event) => {
            let liElement;
            if (event.target.tagName === "LI") {
                liElement = event.target;
            } else if (event.target.parentElement.tagName === "LI") {
                liElement = event.target.parentElement;
            } else {
                return;
            }

            if (liElement.classList.contains("delete-list")) {
                if (event.target.classList.contains("form-check-input")) {
                    return;
                } else {
                    liElement.classList.toggle("checked-list");
                    const checkbox = liElement.querySelector("input");
                    checkbox.checked = !checkbox.checked;
                    deleteM.updateDeleteCount();
                }
            } else {
                const selectedText = liElement.textContent;
                const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(
                    selectedText
                )}`;

                // Check if the clicked element has the "bi" class (favorite icon)
                if (event.target.classList.contains("bi")) {
                    // Add the selected text to the favorite list
                    favorite.addToFavoriteList(selectedText);
                    event.target.className =
                        "bi bi-patch-check-fill matched spring-animation";
                    setTimeout(function () {
                        event.target.classList.remove("spring-animation");
                    }, 500);

                    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
                        favorite.updateFavorite(favoriteList);
                    });
                } else if (event.target.classList.contains("form-check-input")) {
                    return;
                } else {
                    if (event.button === 1) {
                        // Middle click
                        event.preventDefault();
                        chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
                    } else if (event.button === 0) {
                        // Left click
                        window.open(searchUrl, "_blank");
                    }
                }
            }
        });

        clearButton.addEventListener("click", () => {
            chrome.storage.local.set({ searchHistoryList: [] });

            clearButton.disabled = true;
            searchHistoryListContainer.innerHTML = "";

            emptyMessage.style.display = "block";
            emptyMessage.innerHTML = chrome.i18n
                .getMessage("clearedUpMsg")
                .replace(/\n/g, "<br>");

            hasHistory = false;

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