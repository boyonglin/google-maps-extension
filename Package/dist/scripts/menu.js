class ContextMenuUtil {
    static createContextMenu(event, listContainer) {
        event.preventDefault();

        // Don't create context menu in delete mode
        const deleteListButton = document.getElementById("deleteListButton");
        if (deleteListButton && deleteListButton.classList.contains("active-button")) {
            return;
        }

        // Find the specific item that was right-clicked
        const clickedItem = event.target.closest(".summary-list, .history-list, .favorite-list");

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
        const openAllOption = this.createOption(contextMenu, `${chrome.i18n.getMessage("openAll")} (${listItems.length})`, () => {
            this.openAllUrls(listItems);
        });
        contextMenu.appendChild(openAllOption);

        // Create "Plan Route" option
        chrome.storage.local.get("startAddr", ({ startAddr }) => {
            if (clickedItem && startAddr) {
                const getDirectionsOption = this.createOption(contextMenu, chrome.i18n.getMessage("getDirections"), () => {
                    this.getDirections(clickedItem, startAddr);
                });
                contextMenu.appendChild(getDirectionsOption);
            }
        });

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

    static createOption(menu, label, onClick) {
        const option = document.createElement("li");
        option.className = "list-group-item list-group-item-action border-0 rounded-2 context-menu-item";
        option.textContent = label;

        option.addEventListener("click", () => {
            onClick();
            menu.remove();
        });

        return option;
    }

    static openAllUrls(listItems) {
        const urls = [];
        const { groupTitle, groupColor } = this.getGroupInfo(listItems[0]);

        listItems.forEach(item => {
            const spans = item.querySelectorAll("span");
            const selectedText = Array.from(spans).map(span => span.textContent).join(" ").trim();
            if (selectedText) {
                urls.push(`${queryUrl}q=${encodeURIComponent(selectedText)}`);
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

    static getDirections(selectedItem, startAddr) {
        const span = selectedItem.querySelector("span");
        const selectedText = span ? span.textContent.trim() : "";

        const directionsUrl = `${routeUrl}api=1&origin=${encodeURIComponent(startAddr)}&destination=${encodeURIComponent(selectedText)}`;
        chrome.tabs.create({ url: directionsUrl });
    }
}