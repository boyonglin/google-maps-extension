class ContextMenuUtil {
    static createContextMenu(event, listContainer) {
        event.preventDefault();

        // Don't create context menu in delete mode
        const deleteListButton = document.getElementById("deleteListButton");
        if (deleteListButton && deleteListButton.classList.contains("active-button")) {
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
        openAllItem.className = "list-group-item list-group-item-action border-0 rounded-2 context-menu-item";
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

        listItems.forEach(item => {
            const spans = item.querySelectorAll("span");
            const selectedText = Array.from(spans).map(span => span.textContent).join(" ").trim();
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
                    groupColor,
                    collapsed: listItems.length > 10 ? true : false
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
            groupTitle = "✨";
            groupColor = "purple";
        } else if (firstItem.classList.contains("history-list")) {
            groupTitle = "🕓";
            groupColor = "green";
        } else if (firstItem.classList.contains("favorite-list")) {
            groupTitle = "🏵️";
            groupColor = "yellow";
        }

        return { groupTitle, groupColor };
    }
}