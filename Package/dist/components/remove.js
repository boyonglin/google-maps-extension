class Remove {
  addRemoveListener() {
    cancelButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("cancel_delete", "cancelButton");
      this.backToNormal();
    });

    deleteButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("delete_items", "deleteButton");
      if (state.getSnapshot().deleteMode.source === "history") {
        this.deleteFromHistoryList();
      } else {
        this.deleteFromFavoriteList();
      }
      this.backToNormal();
    });

    deleteListButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("delete_mode", "deleteListButton");
      const snapshot = state.getSnapshot();
      state.dispatch(
        snapshot.deleteMode.source
          ? { type: "DELETE_CANCEL" }
          : { type: "DELETE_ENTER", source: snapshot.activeTab }
      );
    });

    [searchHistoryListContainer, favoriteListContainer].forEach((container) => {
      container.addEventListener("change", (event) => {
        if (!event.target.classList.contains("form-check-input")) return;
        const li = event.target.closest("li");
        if (li) state.dispatch({ type: "DELETE_TOGGLE", value: li.dataset.itemValue || "" });
      });
    });
  }

  deleteFromHistoryList() {
    const snapshot = state.getSnapshot();
    const selected = new Set(snapshot.deleteMode.selectedValues);
    const items = snapshot.history.items.filter((item) => !selected.has(item));
    state.dispatch({ type: "HISTORY_SET", items, emptyReason: "cleared" });
    state.dispatch({ type: "DELETE_CANCEL" });
    // Re-read so a concurrent write from another context isn't clobbered.
    chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
      const latest = Array.isArray(searchHistoryList) ? searchHistoryList : [];
      chrome.storage.local.set({ searchHistoryList: latest.filter((item) => !selected.has(item)) });
    });
  }

  deleteFromFavoriteList() {
    const snapshot = state.getSnapshot();
    const selected = new Set(snapshot.deleteMode.selectedValues);
    const items = snapshot.favorite.items.filter((item) => !selected.has(item));
    state.dispatch({ type: "FAVORITE_SET", items });
    state.dispatch({ type: "DELETE_CANCEL" });
    // See deleteFromHistoryList.
    chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
      const latest = Array.isArray(favoriteList) ? favoriteList : [];
      chrome.storage.local.set({ favoriteList: latest.filter((item) => !selected.has(item)) });
    });
  }

  backToNormal() {
    state.dispatch({ type: "DELETE_CANCEL" });
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
