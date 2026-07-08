class Favorite {
  addFavoritePageListener() {
    exportButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("export_favorite", "exportButton");
      chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
        if (!favoriteList || !Array.isArray(favoriteList)) {
          return;
        }

        const escapeCSV = (str) => {
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const trimmedFavorite = favoriteList.map((item) => item.split(" @")[0]);
        const csv = "name\n" + trimmedFavorite.map((item) => `${escapeCSV(item)}`).join("\n");

        // UTF-8 BOM so Excel renders non-ASCII names (e.g. Chinese/Japanese) correctly
        const blob = new Blob(["\uFEFF" + csv], {
          type: "text/csv; charset=utf-8;",
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "TheMapsExpress_FavoriteList.csv";
        a.click();
      });
    });

    importButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("import_favorite", "importButton");
      fileInput.click();
    });

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (window.Analytics) window.Analytics.trackFeatureClick("file_imported", "fileInput");

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          let importedData = [];
          const fileContent = event.target.result;

          if (fileContent && fileContent.length > 0) {
            const rows = this.parseCSV(fileContent);
            importedData = rows
              .slice(1) // drop the "name" header row
              .map((row) => (row[0] || "").trim())
              .filter((name) => name.length > 0);
          }

          chrome.storage.local.get(["favoriteList"], ({ favoriteList }) => {
            // Merge with the existing list (don't overwrite); dedupe by name,
            // ignoring the " @clue" suffix
            const existingList = Array.isArray(favoriteList) ? favoriteList : [];
            const existingNames = new Set(existingList.map((item) => item.split(" @")[0]));
            const newNames = [];
            importedData.forEach((name) => {
              if (!existingNames.has(name) && !newNames.includes(name)) {
                newNames.push(name);
              }
            });
            const mergedList = existingList.concat(newNames);

            chrome.storage.local.set({ favoriteList: mergedList }, () => {
              state.dispatch({ type: "FAVORITE_SET", items: mergedList });
            });
          });
        } catch (error) {
          state.dispatch({ type: "FAVORITE_ERROR", errorKey: "importErrorMsg" });
        }
      };

      reader.readAsText(file);

      // Reset the file input value to allow re-selecting the same file
      event.target.value = "";
    });

    favoriteListContainer.addEventListener("mousedown", (event) => {
      const liElement = DOMUtils.findClosestListItem(event);
      if (!liElement) return;

      if (
        state.getSnapshot().deleteMode.source === "favorite" ||
        liElement.classList.contains("delete-list")
      ) {
        if (event.target.classList.contains("form-check-input")) {
          return;
        } else {
          state.dispatch({ type: "DELETE_TOGGLE", value: liElement.dataset.itemValue || "" });
        }
      } else {
        const spans = liElement.querySelectorAll("span");
        const selectedText = Array.from(spans)
          .map((span) => span.textContent)
          .join(" ")
          .trim();

        state.buildSearchUrl(selectedText).then((searchUrl) => {
          if (event.target.classList.contains("bi")) {
            return;
          } else if (event.target.classList.contains("form-check-input")) {
            return;
          } else {
            if (window.Analytics)
              window.Analytics.trackFeatureClick("click_favorite_item", "favoriteListContainer");
            if (event.button === 1) {
              // Middle click
              event.preventDefault();
              chrome.runtime.sendMessage({ action: "openTab", url: searchUrl });
            } else if (event.button === 0) {
              // Left click
              window.open(searchUrl, "_blank");
            }
          }
        });
      }
    });

    favoriteListContainer.addEventListener("contextmenu", (event) => {
      ContextMenuUtil.createContextMenu(event, favoriteListContainer);
    });
  }

  // Minimal RFC 4180-style parser matching what escapeCSV produces on export
  parseCSV(content) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const ch = content[i];

      if (inQuotes) {
        if (ch === '"') {
          if (content[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && content[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((r) => r.some((f) => f.trim().length > 0));
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

  addToFavoriteList(selectedText) {
    chrome.runtime.sendMessage({ action: "addToFavoriteList", selectedText });
  }

  updateFavorite(favoriteList) {
    state.dispatch({ type: "FAVORITE_SET", items: favoriteList });
  }

  render(snapshot) {
    const container = favoriteListContainer;
    const statusMessage = favoriteEmptyMessage;
    const exportAction = exportButton;
    if (!container || !statusMessage || !exportAction) return;
    const { items, status, errorKey } = snapshot.favorite;
    const selected = new Set(snapshot.deleteMode.selectedValues);
    const deleting = snapshot.deleteMode.source === "favorite";

    container.replaceChildren();
    statusMessage.style.whiteSpace = "pre-line";
    statusMessage.textContent = chrome.i18n.getMessage(
      status === "error" ? errorKey || "importErrorMsg" : "favoriteEmptyMsg"
    );
    statusMessage.classList.toggle("d-none", items.length > 0 && status !== "error");

    if (items.length > 0 && status !== "error") {
      const ul = document.createElement("ul");
      ul.className = "list-group d-flex flex-column-reverse";
      items.forEach((selectedText) => {
        const li = document.createElement("li");
        li.className =
          "list-group-item border rounded mb-3 px-3 d-flex justify-content-between align-items-center text-break";
        li.dataset.itemValue = selectedText;

        const [name, clue] = selectedText.split(" @");
        const span = document.createElement("span");
        span.textContent = name;
        li.appendChild(span);
        if (clue !== undefined) {
          const clueSpan = document.createElement("span");
          clueSpan.className = "d-none";
          clueSpan.textContent = clue;
          li.appendChild(clueSpan);
        }

        const icon = document.createElement("i");
        icon.className = "bi bi-patch-check-fill matched";
        icon.classList.toggle("d-none", deleting);
        li.appendChild(icon);

        const checkbox = document.createElement("input");
        checkbox.className = "form-check-input";
        checkbox.classList.toggle("d-none", !deleting);
        checkbox.type = "checkbox";
        checkbox.checked = selected.has(selectedText);
        checkbox.ariaLabel = "Delete";
        li.appendChild(checkbox);

        li.classList.toggle("favorite-list", !deleting);
        li.classList.toggle("delete-list", deleting);
        li.classList.toggle("checked-list", selected.has(selectedText));
        ul.appendChild(li);
      });
      ul.firstElementChild?.classList.remove("mb-3");
      container.appendChild(ul);
    }

    exportAction.disabled = items.length === 0;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Favorite;
}
