const emptyMessage = document.getElementById('emptyMessage');
const clearButton = document.getElementById('clearButton');
const selectedTextListContainer = document.getElementById('selectedTextList');
const searchInput = document.getElementById('search-input');

// Read selected text list from storage
chrome.storage.local.get("selectedTextList", ({ selectedTextList }) => {
    if (selectedTextList && selectedTextList.length > 0) {
        emptyMessage.style.display = 'none';

        const ul = document.createElement("ul");
        ul.className = 'list-group d-flex flex-column-reverse';

        // Create list item from new selectedText
        selectedTextList.forEach((selectedText) => {
            const li = document.createElement("li");
            li.className = 'list-group-item border rounded mb-3 px-3 list d-flex justify-content-between';

            const span = document.createElement("span");
            span.textContent = selectedText;
            li.appendChild(span);

            const icon = document.createElement('i');
            icon.className = 'bi bi-arrow-right-short';
            li.appendChild(icon);
            ul.appendChild(li);
        });
        selectedTextListContainer.appendChild(ul);
    } else {
        emptyMessage.style.display = 'block';
        clearButton.disabled = true;
    }
});

// Track the click event on li elements
selectedTextListContainer.addEventListener('click', function (event) {
    let liElement;
    if (event.target.tagName === 'LI') {
        liElement = event.target;
    } else if (event.target.parentElement.tagName === 'LI') {
        liElement = event.target.parentElement;
    } else {
        return;
    }

    const selectedText = liElement.textContent;
    const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(selectedText)}`;
    // Open in a new window
    window.open(searchUrl, '_blank');
});

// Track the click event on clear button
clearButton.addEventListener('click', () => {
    selectedTextListContainer.innerHTML = '';
    // Send a message to background.js to request clearing of selected text list data
    chrome.runtime.sendMessage({ action: 'clearSelectedTextList' });

    // Clear all selectedTextList data
    chrome.storage.local.set({ selectedTextList: [] }, () => {
        clearButton.disabled = true;
        clearButton.setAttribute('aria-disabled', 'true');
        emptyMessage.style.display = 'block';
        emptyMessage.innerHTML = 'Cleared up! &#128077;&#127997;';
    });
});

// Track keypress events on the search bar
if (searchInput) {
    searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            if (searchInput.value.trim() === '') {
                // If it contains only blanks, prevent the default behavior of the event and do not allow submission
                event.preventDefault();
            } else {
                chrome.runtime.sendMessage({ searchTerm: searchInput.value, action: 'searchInput' });
            }
        }
    });
}