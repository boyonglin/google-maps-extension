class Favorite {
    addFavoritePageListener() {
        exportButton.addEventListener("click", () => {
            chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
                if (!favoriteList || !Array.isArray(favoriteList)) {
                    return;
                }
                const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);
                const csv = "name\n" + trimmedFavorite.map((item) => `${item},`).join("\n");
                const blob = new Blob([csv], {
                    type: "text/csv; charset=utf-8;",
                });
                // Create a temporary anchor element and trigger the download
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "TheMapsExpress_FavoriteList.csv";
                a.click();
            });
        });
        importButton.addEventListener("click", () => {
            fileInput.click();
        });
        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    let importedData = [];
                    const fileContent = event.target.result;
                    if (fileContent && fileContent.length > 0) {
                        // Parse CSV content
                        const rows = fileContent
                            .split("\n")
                            .map((row) => row.trim())
                            .filter((row) => row.length > 0);
                        importedData = rows.slice(1).map((row) => row.replace(/,$/, ""));
                        favoriteEmptyMessage.style.display = "none";
                    }
                    else {
                        favoriteEmptyMessage.style.display = "block";
                    }
                    chrome.storage.local.set({ favoriteList: importedData }, () => {
                        this.updateFavorite(importedData);
                        this.updateHistoryFavoriteIcons();
                    });
                }
                catch (error) {
                    favoriteEmptyMessage.style.display = "block";
                    favoriteEmptyMessage.innerText = chrome.i18n.getMessage("importErrorMsg");
                }
            };
            reader.readAsText(file);
            // Reset the file input value to allow re-selecting the same file
            event.target.value = "";
        });
        favoriteListContainer.addEventListener("mousedown", (event) => {
            let liElement;
            if (event.target.tagName === "LI") {
                liElement = event.target;
            }
            else if (event.target.parentElement.tagName === "LI") {
                liElement = event.target.parentElement;
            }
            else {
                return;
            }
            if (liElement.classList.contains("delete-list")) {
                if (event.target.classList.contains("form-check-input")) {
                    return;
                }
                else {
                    liElement.classList.toggle("checked-list");
                    const checkbox = liElement.querySelector("input");
                    checkbox.checked = !checkbox.checked;
                    remove.updateDeleteCount();
                }
            }
            else {
                const spans = liElement.querySelectorAll("span");
                const selectedText = Array.from(spans).map(span => span.textContent).join(" ").trim();
                state.buildSearchUrl(selectedText).then(searchUrl => {
                    if (event.target.classList.contains("bi")) {
                        return;
                    }
                    else if (event.target.classList.contains("form-check-input")) {
                        return;
                    }
                    else {
                        if (event.button === 1) {
                            // Middle click
                            event.preventDefault();
                            chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
                        }
                        else if (event.button === 0) {
                            // Left click
                            window.open(searchUrl, "_blank");
                        }
                    }
                });
            }
        });
        // Add context menu listener for favorite items
        favoriteListContainer.addEventListener("contextmenu", (event) => {
            ContextMenuUtil.createContextMenu(event, favoriteListContainer);
        });
    }
    createFavoriteIcon(itemName, favoriteList) {
        const favoriteIcon = document.createElement("i");
        favoriteIcon.className =
            favoriteList && favoriteList.includes(itemName)
                ? "bi bi-patch-check-fill matched"
                : "bi bi-patch-plus-fill";
        favoriteIcon.title = chrome.i18n.getMessage("plusLabel");
        return favoriteIcon;
    }
    updateHistoryFavoriteIcons() {
        chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
            const historyItems = document.querySelectorAll(".history-list");
            historyItems.forEach((item) => {
                const text = item.querySelector("span").textContent;
                const favoriteIcon = item.querySelector("i");
                if (favoriteList && !favoriteList.includes(text)) {
                    favoriteIcon.className = "bi bi-patch-plus-fill";
                }
                else {
                    favoriteIcon.className = "bi bi-patch-check-fill matched";
                }
            });
        });
    }
    addToFavoriteList(selectedText) {
        chrome.runtime.sendMessage({ action: "addToFavoriteList", selectedText });
        exportButton.disabled = false;
    }
    // Update the favorite list container
    updateFavorite(favoriteList) {
        if (state.favoriteListChanged || favoriteListContainer.innerHTML.trim() === "") {
            favoriteListContainer.innerHTML = "";
            if (favoriteList && favoriteList.length > 0) {
                favoriteEmptyMessage.style.display = "none";
                state.hasFavorite = true;
                const ul = document.createElement("ul");
                ul.className = "list-group d-flex flex-column-reverse";
                // Create list item from new selectedText
                const fragment = document.createDocumentFragment();
                favoriteList.forEach((selectedText) => {
                    const li = document.createElement("li");
                    li.className =
                        "list-group-item border rounded mb-3 px-3 favorite-list d-flex justify-content-between align-items-center text-break";
                    const span = document.createElement("span");
                    if (selectedText.includes(" @")) {
                        const name = selectedText.split(" @")[0];
                        const clue = selectedText.split(" @")[1];
                        span.textContent = name;
                        li.appendChild(span);
                        const clueSpan = document.createElement("span");
                        clueSpan.className = "d-none";
                        clueSpan.textContent = clue;
                        li.appendChild(clueSpan);
                    }
                    else {
                        span.textContent = selectedText;
                        li.appendChild(span);
                    }
                    const favoriteIcon = document.createElement("i");
                    favoriteIcon.className = "bi bi-patch-check-fill matched";
                    li.appendChild(favoriteIcon);
                    const checkbox = document.createElement("input");
                    checkbox.className = "form-check-input d-none";
                    checkbox.type = "checkbox";
                    checkbox.value = "delete";
                    checkbox.name = "checkDelete";
                    checkbox.ariaLabel = "Delete";
                    checkbox.style.cursor = "pointer";
                    li.appendChild(checkbox);
                    fragment.appendChild(li);
                });
                ul.appendChild(fragment);
                favoriteListContainer.appendChild(ul);
                exportButton.disabled = false;
                const lastListItem = favoriteListContainer.querySelector(".list-group .list-group-item:first-child");
                if (lastListItem) {
                    lastListItem.classList.remove("mb-3");
                }
                remove.attachCheckboxEventListener(favoriteListContainer);
            }
            else {
                favoriteEmptyMessage.style.display = "block";
                state.hasFavorite = false;
                exportButton.disabled = true;
            }
        }
        delayMeasurement();
    }
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Favorite;
}
//# sourceMappingURL=favorite.js.map