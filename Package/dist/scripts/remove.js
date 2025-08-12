class Remove {
    addRemoveListener() {
        cancelButton.addEventListener("click", this.backToNormal);

        deleteButton.addEventListener("click", () => {
            if (searchHistoryButton.classList.contains("active-button")) {
                this.deleteFromHistoryList();
            } else {
                this.deleteFromFavoriteList();
            }
            this.backToNormal();
            measureContentSize();
        });

        deleteListButton.addEventListener("click", () => {
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
    }

    deleteFromHistoryList() {
        const checkedBoxes =
            searchHistoryListContainer.querySelectorAll("input:checked");
        const selectedTexts = [];

        // Delete checked items from the lists
        checkedBoxes.forEach((checkbox) => {
            // Get the corresponding list item (parent element of the checkbox)
            const listItem = checkbox.closest("li");
            const selectedText = listItem.querySelector("span").textContent;
            selectedTexts.push(selectedText);

            listItem.remove();
        });

        chrome.storage.local.get("searchHistoryList", ({ searchHistoryList }) => {
            // Filter out the selected texts from the search history list
            const updatedList = searchHistoryList.filter(
                (item) => !selectedTexts.includes(item)
            );
            chrome.storage.local.set({ searchHistoryList: updatedList });

            if (updatedList.length === 0) {
                hasHistory = false;
                clearButton.disabled = true;
                searchHistoryUl[0].classList.add("d-none");
                emptyMessage.style.display = "block";
                emptyMessage.innerHTML = chrome.i18n
                    .getMessage("clearedUpMsg")
                    .replace(/\n/g, "<br>");
            }
        });
    }

    deleteFromFavoriteList() {
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
                const spanText = icon.parentElement.querySelector("span").textContent;
                if (selectedText === spanText) {
                    icon.className = "bi bi-patch-plus-fill";
                }
            });
        });

        chrome.storage.local.get("favoriteList", ({ favoriteList }) => {
            const updatedList = favoriteList.filter(
                (item) => !selectedTexts.includes(item)
            );
            chrome.storage.local.set({ favoriteList: updatedList });

            if (updatedList.length === 0) {
                hasFavorite = false;
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

    // Update the delete count based on checked checkboxes
    updateDeleteCount() {
        const historyCheckedCount =
            searchHistoryListContainer.querySelectorAll("input:checked").length;
        const favoriteCheckedCount =
            favoriteListContainer.querySelectorAll("input:checked").length;

        const checkedCount = searchHistoryButton.classList.contains("active-button")
            ? historyCheckedCount
            : favoriteCheckedCount;

        if (checkedCount > 0) {
            // turn const to string
            deleteButtonSpan.textContent = chrome.i18n.getMessage(
                "deleteBtnText",
                checkedCount + ""
            );
            deleteButton.classList.remove("disabled");
        } else {
            deleteButtonSpan.textContent = chrome.i18n.getMessage("deleteBtnTextEmpty");
            deleteButton.classList.add("disabled");
        }
    }

    backToNormal() {
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

    // Toggle checkbox display
    updateInput() {
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
}