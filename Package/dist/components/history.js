class History {
  addHistoryPageListener() {
    searchHistoryListContainer.addEventListener("mousedown", (event) => {
      const liElement = DOMUtils.findClosestListItem(event);
      if (!liElement) return;

      // Swallow clicks on fake onboarding demo item to prevent persistence
      if (liElement.classList.contains("onboarding-demo-item")) {
        event.stopPropagation();
        event.preventDefault();
        if (event.target.classList.contains("bi") && onboarding) onboarding.next();
        return;
      }

      if (
        state.getSnapshot().deleteMode.source === "history" ||
        liElement.classList.contains("delete-list")
      ) {
        if (event.target.classList.contains("form-check-input")) {
          return;
        } else {
          state.dispatch({ type: "DELETE_TOGGLE", value: liElement.dataset.itemValue || "" });
        }
      } else {
        const selectedText = liElement.querySelector("span")?.textContent;

        state
          .buildSearchUrl(selectedText)
          .then((searchUrl) => {
            if (event.target.classList.contains("bi")) {
              if (window.Analytics)
                window.Analytics.trackFeatureClick(
                  "add_to_favorite_from_history",
                  "searchHistoryListContainer"
                );
              favorite.addToFavoriteList(selectedText);
              DOMUtils.animateFavoriteIcon(event.target);
            } else if (event.target.classList.contains("form-check-input")) {
              return;
            } else {
              if (window.Analytics)
                window.Analytics.trackFeatureClick(
                  "click_history_item",
                  "searchHistoryListContainer"
                );
              if (event.button === 1) {
                event.preventDefault();
                chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
              } else if (event.button === 0) {
                window.open(searchUrl, "_blank");
              }
            }
          })
          .catch((error) => {
            console.error("Failed to build search URL:", error);
          });
      }
    });

    searchHistoryListContainer.addEventListener("contextmenu", (event) => {
      const liElement = DOMUtils.findClosestListItem(event);
      if (liElement?.classList.contains("onboarding-demo-item")) {
        event.preventDefault();
        return;
      }
      ContextMenuUtil.createContextMenu(event, searchHistoryListContainer);
    });

    clearButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("clear_history", "clearButton");
      chrome.storage.local.set({ searchHistoryList: [] });
      state.dispatch({ type: "HISTORY_SET", items: [], emptyReason: "cleared" });

      chrome.runtime.sendMessage({ action: "clearSearchHistoryList" });
    });
  }

  createListItem(itemName, favoriteList) {
    const li = document.createElement("li");
    li.className =
      "list-group-item border rounded mb-3 px-3 history-list d-flex justify-content-between align-items-center text-break";

    const span = document.createElement("span");
    span.textContent = itemName;
    li.appendChild(span);

    const icon = (this.favoriteComponent || favorite).createFavoriteIcon(itemName, favoriteList);
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

  render(snapshot, meta = {}) {
    const container = searchHistoryListContainer;
    const statusMessage = emptyMessage;
    const clearAction = clearButton;
    if (!container || !statusMessage || !clearAction) return;
    const { items, emptyReason } = snapshot.history;
    const selected = new Set(snapshot.deleteMode.selectedValues);
    const deleting = snapshot.deleteMode.source === "history";
    const showDemo = snapshot.onboarding.demoHistoryVisible;

    statusMessage.style.whiteSpace = "pre-line";
    statusMessage.textContent = chrome.i18n.getMessage(
      emptyReason === "cleared" ? "clearedUpMsg" : "historyEmptyMsg"
    );
    statusMessage.classList.toggle("d-none", items.length > 0 || showDemo);
    clearAction.disabled = items.length === 0;

    // Patch icon classNames in place to preserve animation
    const structuralChange =
      meta.historyChanged !== false ||
      meta.deleteModeChanged !== false ||
      meta.onboardingChanged !== false;
    const existingItems = structuralChange ? [] : container.querySelectorAll("li[data-item-value]");

    if (!structuralChange && existingItems.length > 0) {
      existingItems.forEach((li) => {
        const icon = li.querySelector("i");
        if (!icon || icon.classList.contains("spring-animation")) return;
        const newClassName = (this.favoriteComponent || favorite).createFavoriteIcon(
          li.dataset.itemValue,
          snapshot.favorite.items
        ).className;
        if (icon.className !== newClassName) {
          icon.className = newClassName;
          icon.classList.toggle("d-none", deleting);
        }
      });
      return;
    }

    container.replaceChildren();

    if (items.length > 0 || showDemo) {
      const ul = document.createElement("ul");
      ul.className = "list-group d-flex flex-column-reverse";
      items.forEach((item) => {
        const li = this.createListItem(item, snapshot.favorite.items);
        li.dataset.itemValue = item;
        const checkbox = li.querySelector("input");
        const icon = li.querySelector("i");
        checkbox?.classList.toggle("d-none", !deleting);
        if (checkbox) checkbox.checked = selected.has(item);
        icon?.classList.toggle("d-none", deleting);
        li.classList.toggle("history-list", !deleting);
        li.classList.toggle("delete-list", deleting);
        li.classList.toggle("checked-list", selected.has(item));
        ul.appendChild(li);
      });
      if (showDemo) {
        const demoName = chrome.i18n.getMessage("onboardingDemoPlace") || "Eiffel Tower";
        const li = this.createListItem(demoName, snapshot.favorite.items);
        li.classList.add("onboarding-demo-item");
        li.dataset.itemValue = demoName;
        ul.appendChild(li);
      }
      ul.firstElementChild?.classList.remove("mb-3");
      container.appendChild(ul);
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = History;
}
