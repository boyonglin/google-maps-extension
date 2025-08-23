class ContextMenuUtil {
    static createContextMenu(event, listContainer) {
        event.preventDefault();

        // Don't create context menu in delete mode
        const deleteListButton = document.getElementById('deleteListButton');
        if (deleteListButton && deleteListButton.classList.contains('active-button')) {
            return;
        }

        // Get all list items in the current container based on tab type
        const listItems = listContainer.querySelectorAll(".summary-list, .history-list, .favorite-list");

        // Remove any existing context menu
        const existingMenu = document.querySelector(".context-menu");
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const contextMenu = document.createElement("ul");
        contextMenu.className = "list-group position-absolute rounded-3 context-menu";
        contextMenu.style.left = event.pageX + "px";
        contextMenu.style.top = event.pageY + "px";

        // Create "Open all URL" option
        const openAllItem = document.createElement("li");
        openAllItem.className = "list-group-item list-group-item-action context-menu-item";
        openAllItem.textContent = `${chrome.i18n.getMessage("openAll")} (${listItems.length})`;

        openAllItem.addEventListener("click", () => {
            this.openAllUrls(listItems);
            contextMenu.remove();
        });

        contextMenu.appendChild(openAllItem);
        document.body.appendChild(contextMenu);

        // Close context menu when clicking elsewhere
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener("click", closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener("click", closeMenu);
        }, 0);

        return contextMenu;
    }

    static openAllUrls(listItems) {
        const urls = [];
        const { groupTitle, groupColor } = this.getGroupInfo(listItems[0]);

        listItems.forEach((item) => {
            let selectedText = "";

            if (item.classList.contains("summary-list")) {
                const nameSpan = item.querySelector("span:first-child");
                if (nameSpan) selectedText = nameSpan.textContent;
            } else if (item.classList.contains("history-list")) {
                const span = item.querySelector("span");
                if (span) selectedText = span.textContent;
            } else if (item.classList.contains("favorite-list")) {
                const spanItems = item.querySelectorAll("span");
                if (spanItems.length > 1 && !spanItems[1].classList.contains("d-none")) {
                    selectedText = `${spanItems[0].textContent} ${spanItems[1].textContent}`;
                } else if (spanItems[0]) {
                    selectedText = spanItems[0].textContent;
                }
            }

            if (selectedText) {
                urls.push(`https://www.google.com/maps?q=${encodeURIComponent(selectedText)}`);
            }
        });

        chrome.runtime.sendMessage({ action: "canGroup" }, (resp) => {
            if (resp && resp.canGroup) {
                chrome.runtime.sendMessage({
                    action: "openInGroup",
                    urls: urls,
                    groupTitle,
                    groupColor
                });
            } else {
                urls.forEach(url => chrome.runtime.sendMessage({ action: "openTab", url }));
            }
        });
    }

    // Get tab group information based on the list item
    static getGroupInfo(firstItem) {
        let groupTitle = "";
        let groupColor = "";

        if (firstItem.classList.contains("summary-list")) {
            groupTitle = chrome.i18n.getMessage("summaryGroupTitle");
            groupColor = "purple";
        } else if (firstItem.classList.contains("history-list")) {
            groupTitle = chrome.i18n.getMessage("historyGroupTitle");
            groupColor = "green";
        } else if (firstItem.classList.contains("favorite-list")) {
            groupTitle = chrome.i18n.getMessage("favoriteGroupTitle");
            groupColor = "yellow";
        }

        return { groupTitle, groupColor };
    }
}