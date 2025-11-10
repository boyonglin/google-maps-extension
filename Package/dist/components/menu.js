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

        // Create "Tidy Locations" option with premium check
        const canTidy = state.paymentStage.isTrial || state.paymentStage.isPremium;
        const tidyLocationsOption = this.createOption(contextMenu, chrome.i18n.getMessage("tidyLocations"), () => {
            if (!canTidy) {
                document.querySelector('[data-bs-target="#premiumModal"]').click();
            } else {
                this.tidyLocations(listItems);
            }
        });

        if (!canTidy) {
            tidyLocationsOption.classList.add("premium-option");
        }

        // Create "Plan Route" option
        chrome.storage.local.get("startAddr", ({ startAddr }) => {
            if (clickedItem && startAddr) {
                const getDirectionsOption = this.createOption(contextMenu, chrome.i18n.getMessage("getDirections"), () => {
                    this.getDirections(clickedItem, startAddr);
                });
                contextMenu.appendChild(getDirectionsOption);
            }

            // Always append tidy after
            contextMenu.appendChild(tidyLocationsOption);
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
        if (!listItems || listItems.length === 0) {
            return;
        }
        
        const urls = [];
        const { groupTitle, groupColor } = this.getGroupInfo(listItems[0]);

        const promises = Array.from(listItems).map(item => {
            const spans = item.querySelectorAll("span");
            const selectedText = Array.from(spans).map(span => span.textContent).join(" ").trim();
            if (selectedText) {
                return state.buildSearchUrl(selectedText);
            }
            return Promise.resolve(null);
        });

        Promise.all(promises).then(resolvedUrls => {
            resolvedUrls.forEach(url => {
                if (url) urls.push(url);
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

        state.buildDirectionsUrl(startAddr, selectedText).then(directionsUrl => {
            chrome.tabs.create({ url: directionsUrl });
        });
    }

    static tidyLocations(listItems) {
        // Start breathing effect for the full list container
        this.startBreathingEffect(listItems);

        // Extract location data from list items
        const locations = Array.from(listItems)
            .map(item => {
                const spans = item.querySelectorAll("span");
                const locationName = spans[0]?.textContent.trim() || "";
                const locationClue = spans[1]?.textContent.trim() || "";

                return locationName ? {
                    name: locationName,
                    clue: locationClue,
                    element: item
                } : null;
            })
            .filter(Boolean);

        // Send to background script for Gemini AI processing
        chrome.runtime.sendMessage({
            action: "organizeLocations",
            locations,
            listType: this.getListType(listItems[0])
        }, (response) => {
            // Stop breathing effect when response is received
            this.stopBreathingEffect(listItems);

            if (response?.success) {
                this.applyOrganization(response.organizedData, listItems);
            }
        });
    }

    static getListType(firstItem) {
        if (firstItem.classList.contains("summary-list")) {
            return "summary";
        } else if (firstItem.classList.contains("history-list")) {
            return "history";
        } else if (firstItem.classList.contains("favorite-list")) {
            return "favorite";
        }
        return "unknown";
    }

    static applyOrganization(organizedData, listItems) {
        if (!organizedData?.categories) {
            if (organizedData?.rawText) {
                console.log("Raw AI response:", organizedData.rawText);
            }
            return;
        }

        const container = listItems[0]?.parentElement;
        if (!container) {
            console.error("Could not find container for list items");
            return;
        }

        // Create element mapping with multiple search strategies
        const { elementMap, elementsList } = this.createElementMapping(listItems);

        // Clear container
        elementsList.forEach(item => item.remove());
        const existingHeaders = container.querySelectorAll(".category-header");
        existingHeaders.forEach(header => header.remove());

        // Determine layout strategy
        const currentListType = this.getListType(elementsList[0]);
        const hasFlexReverse = ["history", "favorite"].includes(currentListType);

        // Render organized categories
        this.renderCategories(organizedData.categories, container, elementMap, elementsList, hasFlexReverse);

        // Update spacing for boundary items
        this.updateBoundaryItemSpacing(hasFlexReverse, container);

        measureContentSize();
    }

    static createElementMapping(listItems) {
        const elementMap = new Map();
        const elementsList = Array.from(listItems);

        elementsList.forEach((item, index) => {
            const locationName = item.querySelector("span")?.textContent.trim();
            if (!locationName) return;

            // Multiple mapping strategies for robust matching
            const mappings = [
                locationName,
                locationName.toLowerCase().replace(/\s+/g, " ").trim(),
                `index_${index}`
            ];

            mappings.forEach(key => elementMap.set(key, item));
        });

        return { elementMap, elementsList };
    }

    static renderCategories(categories, container, elementMap, elementsList, hasFlexReverse) {
        categories.forEach(category => {
            const categoryHeader = this.createCategoryHeader(category.name);

            // Add header first for normal layout, last for reversed layout
            if (!hasFlexReverse) {
                container.appendChild(categoryHeader);
            }

            // Add locations to category
            category.locations.forEach(location => {
                const element = this.findMatchingElement(location.name, elementMap, elementsList);
                if (element) {
                    element.classList.add("mb-3");
                    container.appendChild(element);
                } else {
                    this.logMissingElement(location.name, elementsList);
                }
            });

            // Add header last for reversed layout
            if (hasFlexReverse) {
                container.appendChild(categoryHeader);
            }
        });
    }

    static createCategoryHeader(categoryName) {
        const header = document.createElement("div");
        header.className = "category-header";

        const text = document.createElement("span");
        text.textContent = categoryName;

        header.appendChild(text);
        return header;
    }

    static findMatchingElement(locationName, elementMap, elementsList) {
        // Try exact match
        let element = elementMap.get(locationName);
        if (element) return element;

        // Try normalized match
        const normalized = locationName.toLowerCase().replace(/\s+/g, " ").trim();
        element = elementMap.get(normalized);
        if (element) return element;

        // Try fuzzy matching
        for (const [key, el] of elementMap.entries()) {
            if (!key.startsWith("index_") && key.includes(normalized)) {
                return el;
            }
        }

        // Try partial content matching
        return elementsList.find(item => {
            const itemText = item.querySelector("span")?.textContent.trim() || "";
            return itemText.toLowerCase().includes(normalized) ||
                   normalized.includes(itemText.toLowerCase());
        });
    }

    static logMissingElement(locationName, elementsList) {
        const availableNames = elementsList
            .map(item => item.querySelector("span")?.textContent.trim())
            .filter(Boolean);

        console.log(`Could not find element for location: "${locationName}"`);
        console.log("Available original element names:", availableNames);
    }

    static updateBoundaryItemSpacing(hasFlexReverse, container) {
        if (!container) return;

        // Get current DOM elements that are actually in the container
        const currentItems = container.querySelectorAll(".list-group-item");

        if (currentItems.length === 0) return;

        let targetItem = hasFlexReverse ? container.querySelector(".list-group-item:first-child") : container.querySelector(".list-group-item:last-child");

        if (targetItem) {
            targetItem.classList.remove("mb-3");
        }
    }

    static breathingInterval = null;

    static startBreathingEffect(listItems) {
        const listContainer = listItems[0]?.parentElement;
        if (!listContainer) return;

        let opacity = 1;
        let decreasing = true;

        this.breathingInterval = setInterval(() => {
            if (decreasing) {
                opacity -= 0.08;
                if (opacity <= 0.4) {
                    decreasing = false;
                }
            } else {
                opacity += 0.08;
                if (opacity >= 1) {
                    setTimeout(() => {
                        decreasing = true;
                    }, 200);
                }
            }
            listContainer.style.opacity = opacity;
        }, 100);
    }

    static stopBreathingEffect(listItems) {
        if (this.breathingInterval) {
            clearInterval(this.breathingInterval);
            this.breathingInterval = null;
        }

        const listContainer = listItems[0]?.parentElement;
        if (listContainer) {
            listContainer.style.opacity = "";
        }
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextMenuUtil;
}