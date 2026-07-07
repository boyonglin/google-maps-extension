class Remove {
  usesStore() {
    return typeof state?.getSnapshot === "function" && typeof state?.dispatch === "function";
  }

  addRemoveListener() {
    cancelButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("cancel_delete", "cancelButton");
      this.backToNormal();
    });

    deleteButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("delete_items", "deleteButton");
      if (searchHistoryButton.classList.contains("active-button")) {
        this.deleteFromHistoryList();
      } else {
        this.deleteFromFavoriteList();
      }
      this.backToNormal();
      if (!this.usesStore()) measureContentSize();
    });

    deleteListButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("delete_mode", "deleteListButton");
      if (this.usesStore()) {
        const snapshot = state.getSnapshot();
        state.dispatch(
          snapshot.deleteMode.source
            ? { type: "DELETE_CANCEL" }
            : { type: "DELETE_ENTER", source: snapshot.activeTab }
        );
        return;
      }
      const historyLiElements = searchHistoryListContainer.querySelectorAll("li");
      const favoriteLiElements = favoriteListContainer.querySelectorAll("li");

      if (deleteListButton.classList.contains("active-button")) {
        this.backToNormal();
      } else {
        deleteListButton.classList.add("active-button");
        deleteListButton.style.pointerEvents = "auto";

        searchButtonGroup.classList.add("d-none");
        exportButtonGroup.classList.add("d-none");
        deleteButtonGroup.classList.remove("d-none");

        checkTextOverflow();

        historyLiElements.forEach((li) => {
          const checkbox = li.querySelector("input");
          const favoriteIcon = li.querySelector("i");

          checkbox.classList.remove("d-none");
          favoriteIcon.classList.add("d-none");

          li.classList.add("delete-list");
          li.classList.remove("history-list");
        });

        favoriteLiElements.forEach((li) => {
          const checkbox = li.querySelector("input");
          const favoriteIcon = li.querySelector("i");

          checkbox.classList.remove("d-none");
          favoriteIcon.classList.add("d-none");

          li.classList.add("delete-list");
          li.classList.remove("favorite-list");
        });

        if (searchHistoryButton.classList.contains("active-button")) {
          favoriteListButton.disabled = true;
          geminiSummaryButton.disabled = true;
          this.updateDeleteCount();
        } else {
          searchHistoryButton.disabled = true;
          geminiSummaryButton.disabled = true;
          this.updateDeleteCount();
        }
      }
    });

    if (this.usesStore()) {
      [searchHistoryListContainer, favoriteListContainer].forEach((container) => {
        container.addEventListener("change", (event) => {
          if (!event.target.classList.contains("form-check-input")) return;
          const li = event.target.closest("li");
          if (li) state.dispatch({ type: "DELETE_TOGGLE", value: li.dataset.itemValue || "" });
        });
      });
    }
  }

  deleteFromHistoryList() {
    if (this.usesStore()) {
      const snapshot = state.getSnapshot();
      const selected = new Set(snapshot.deleteMode.selectedValues);
      const items = snapshot.history.items.filter((item) => !selected.has(item));
      state.dispatch({ type: "HISTORY_SET", items, emptyReason: "cleared" });
      state.dispatch({ type: "DELETE_CANCEL" });
      chrome.storage.local.set({ searchHistoryList: items });
      return;
    }
    const checkedBoxes = searchHistoryListContainer.querySelectorAll("input:checked");
    const selectedTexts = [];

    checkedBoxes.forEach((checkbox) => {
      const listItem = checkbox.closest("li");
      const selectedText = listItem.querySelector("span").textContent;
      selectedTexts.push(selectedText);

      listItem.remove();
    });

    chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
      if (!searchHistoryList) return;

      const updatedList = searchHistoryList.filter((item) => !selectedTexts.includes(item));
      chrome.storage.local.set({ searchHistoryList: updatedList });

      if (updatedList.length === 0) {
        state.hasHistory = false;
        clearButton.disabled = true;
        searchHistoryUl[0].classList.add("d-none");
        emptyMessage.style.display = "block";
        emptyMessage.innerHTML = chrome.i18n.getMessage("clearedUpMsg").replace(/\n/g, "<br>");
      }
    });
  }

  deleteFromFavoriteList() {
    if (this.usesStore()) {
      const snapshot = state.getSnapshot();
      const selected = new Set(snapshot.deleteMode.selectedValues);
      const items = snapshot.favorite.items.filter((item) => !selected.has(item));
      state.dispatch({ type: "FAVORITE_SET", items });
      state.dispatch({ type: "DELETE_CANCEL" });
      chrome.storage.local.set({ favoriteList: items });
      return;
    }
    const checkedBoxes = favoriteListContainer.querySelectorAll("input:checked");
    const selectedTexts = [];

    checkedBoxes.forEach((checkbox) => {
      const listItem = checkbox.closest("li");
      const spanItem = listItem.querySelectorAll("span");
      const selectedText = spanItem[0].textContent;
      if (spanItem.length > 1) {
        const clueText = spanItem[1].textContent;
        selectedTexts.push(selectedText + " @" + clueText);
      } else {
        selectedTexts.push(selectedText);
      }

      listItem.remove();

      const historyIElements = searchHistoryListContainer.querySelectorAll("i");

      historyIElements.forEach((icon) => {
        const parentSpan = icon.parentElement?.querySelector("span");
        if (parentSpan && selectedText === parentSpan.textContent) {
          icon.className = "bi bi-patch-plus-fill";
        }
      });
    });

    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
      if (!favoriteList) return;

      const updatedList = favoriteList.filter((item) => !selectedTexts.includes(item));
      chrome.storage.local.set({ favoriteList: updatedList });

      if (updatedList.length === 0) {
        state.hasFavorite = false;
        exportButton.disabled = true;
        favoriteUl[0].classList.add("d-none");
        favoriteEmptyMessage.style.display = "block";
        favoriteEmptyMessage.innerHTML = chrome.i18n
          .getMessage("clearedUpMsg")
          .replace(/\n/g, "<br>");
      }
    });
  }

  attachCheckboxEventListener(container) {
    const checkboxes = container.querySelectorAll("input");
    const liElements = container.querySelectorAll("li");

    checkboxes.forEach((checkbox, index) => {
      checkbox.addEventListener("click", () => {
        const li = liElements[index];

        if (checkbox.checked) {
          li.classList.add("checked-list");
        } else {
          li.classList.remove("checked-list");
        }

        this.updateDeleteCount();
      });
    });
  }

  updateDeleteCount() {
    const historyCheckedCount = searchHistoryListContainer.querySelectorAll("input:checked").length;
    const favoriteCheckedCount = favoriteListContainer.querySelectorAll("input:checked").length;

    const checkedCount = searchHistoryButton.classList.contains("active-button")
      ? historyCheckedCount
      : favoriteCheckedCount;

    if (checkedCount > 0) {
      deleteButtonSpan.textContent = chrome.i18n.getMessage("deleteBtnText", String(checkedCount));
      deleteButton.classList.remove("disabled");
    } else {
      deleteButtonSpan.textContent = chrome.i18n.getMessage("deleteBtnTextEmpty");
      deleteButton.classList.add("disabled");
    }
  }

  backToNormal() {
    if (this.usesStore()) {
      state.dispatch({ type: "DELETE_CANCEL" });
      return;
    }
    deleteListButton.style.pointerEvents = "";
    deleteListButton.classList.remove("active-button");
    deleteButtonGroup.classList.add("d-none");

    if (searchHistoryButton.classList.contains("active-button")) {
      searchButtonGroup.classList.remove("d-none");
      favoriteListButton.disabled = false;
      geminiSummaryButton.disabled = false;
    } else {
      exportButtonGroup.classList.remove("d-none");
      searchHistoryButton.disabled = false;
      geminiSummaryButton.disabled = false;
    }

    this.updateInput();
  }

  updateInput() {
    if (this.usesStore()) return;
    const historyLiElements = searchHistoryListContainer.querySelectorAll("li");
    const favoriteLiElements = favoriteListContainer.querySelectorAll("li");

    this.updateListElements(historyLiElements, "history");
    this.updateListElements(favoriteLiElements, "favorite");
  }

  updateListElements(liElements, listType) {
    liElements.forEach((li) => {
      const checkbox = li.querySelector("input");
      const favoriteIcon = li.querySelector("i");

      checkbox.classList.add("d-none");
      favoriteIcon.classList.remove("d-none");

      li.classList.remove("checked-list");
      checkbox.checked = false;

      li.classList.remove("delete-list");
      li.classList.add(listType + "-list");
    });
  }

  render(snapshot) {
    const deleteModeButton = deleteListButton;
    const deleteActions = deleteButtonGroup;
    const historyActions = searchButtonGroup;
    const favoriteActions = exportButtonGroup;
    const historyTabButton = searchHistoryButton;
    const favoriteTabButton = favoriteListButton;
    const summaryTabButton = geminiSummaryButton;
    const deleteAction = deleteButton;
    const deleteLabel = deleteAction?.querySelector("span");
    if (!deleteModeButton || !deleteActions || !historyActions || !favoriteActions) return;

    const { source, selectedValues } = snapshot.deleteMode;
    const deleting = Boolean(source);
    deleteModeButton.classList.toggle("active-button", deleting);
    deleteActions.classList.toggle("d-none", !deleting);
    historyActions.classList.toggle("d-none", snapshot.activeTab !== "history" || deleting);
    favoriteActions.classList.toggle("d-none", snapshot.activeTab !== "favorite" || deleting);
    geminiButtonGroup?.classList.toggle("d-none", snapshot.activeTab !== "gemini");

    if (historyTabButton) historyTabButton.disabled = deleting && source !== "history";
    if (favoriteTabButton) favoriteTabButton.disabled = deleting && source !== "favorite";
    if (summaryTabButton) summaryTabButton.disabled = deleting;

    const count = selectedValues.length;
    if (deleteLabel) {
      deleteLabel.textContent = chrome.i18n.getMessage(
        count ? "deleteBtnText" : "deleteBtnTextEmpty",
        count ? String(count) : undefined
      );
    }
    deleteAction?.classList.toggle("disabled", count === 0);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Remove;
}
