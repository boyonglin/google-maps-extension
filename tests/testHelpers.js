/**
 * Shared Test Helper Functions
 * Common utilities to reduce code duplication across test files
 */

/**
 * Mock chrome.runtime.sendMessage with a response
 * @param {Object} response - The response object to return
 */
const mockRuntimeMessage = (response) => {
    global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (callback) callback(response);
    });
};

/**
 * Mock chrome.storage.local.get with data
 * @param {Object} data - The data to return
 */
const mockStorageGet = (data = {}) => {
    global.chrome.storage.local.get.mockImplementation((key, callback) => {
        callback(data);
    });
};

/**
 * Mock chrome.storage.local.set
 * @param {Function} callback - Optional callback to execute
 */
const mockStorageSet = (callback) => {
    global.chrome.storage.local.set.mockImplementation((data, cb) => {
        if (cb) cb();
        if (callback) callback(data);
    });
};

/**
 * Setup chrome.runtime.sendMessage mock with response
 * Similar pattern used in popupState.test.js
 * @param {Object} response - Response object
 */
const setupMockResponse = (response) => {
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(response);
    });
};

/**
 * Setup mock storage data with default values
 * Pattern from backgroundState.test.js
 * @param {Object} overrides - Override default storage values
 * @returns {Object} The complete mock storage data
 */
const setupMockStorage = (overrides = {}) => {
    const mockStorageData = {
        searchHistoryList: [],
        favoriteList: [],
        geminiApiKey: "",
        aesKey: null,
        startAddr: "",
        authUser: 0,
        isIncognito: false,
        videoSummaryToggle: false,
        ...overrides
    };
    chrome.storage.local.get.mockResolvedValue(mockStorageData);
    return mockStorageData;
};

/**
 * Create a promise that resolves after a delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
const wait = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create mock list items for testing (pattern from menu.test.js)
 * @param {number} count - Number of items to create
 * @param {string} className - CSS class for items
 * @param {Function} textGenerator - Function to generate text (index) => text
 * @returns {Array} Array of mock DOM elements
 */
const createMockListItems = (count = 3, className = 'summary-list', textGenerator = (i) => `Location ${i + 1}`) => {
    const items = [];
    for (let i = 0; i < count; i++) {
        const item = document.createElement('div');
        item.className = `${className} list-group-item`;
        const span = document.createElement('span');
        span.textContent = textGenerator(i);
        item.appendChild(span);
        items.push(item);
    }
    return items;
};

/**
 * Setup mock i18n messages
 * @param {Object} messages - Key-value pairs of message keys and translations
 */
const mockI18n = (messages = {}) => {
    const defaultMessages = {
        openAll: 'Open All',
        getDirections: 'Get Directions',
        tidyLocations: 'Tidy Locations',
        deleteBtnText: 'Delete ($1)',
        deleteBtnTextEmpty: 'Delete',
        clearedUpMsg: 'All cleared up!\nNothing to see here.',
        ...messages
    };
    
    global.chrome.i18n.getMessage.mockImplementation((key, substitutions) => {
        const message = defaultMessages[key] || key;
        if (substitutions) {
            return message.replace('$1', substitutions);
        }
        return message;
    });
};

/**
 * Clean up DOM between tests
 */
const cleanupDOM = () => {
    document.body.innerHTML = '';
};

/**
 * Assert that a function was called with partial object matching
 * @param {Function} mockFn - Jest mock function
 * @param {Object} expectedPartial - Partial object to match
 */
const expectCalledWithPartial = (mockFn, expectedPartial) => {
    expect(mockFn).toHaveBeenCalledWith(
        expect.objectContaining(expectedPartial),
        expect.any(Function)
    );
};

/**
 * Create a spy on window.open and auto-restore after callback
 * @param {Function} testFn - Test function that receives the spy
 */
const withWindowOpenSpy = async (testFn) => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
    try {
        await testFn(openSpy);
    } finally {
        openSpy.mockRestore();
    }
};

/**
 * Create and dispatch a mouse event
 * @param {HTMLElement} target - Target element
 * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
 * @param {Object} props - Additional event properties
 */
const createMouseEvent = (target, button = 0, props = {}) => {
    const event = new MouseEvent('mousedown', {
        bubbles: true,
        button,
        ...props
    });
    Object.defineProperty(event, 'target', {
        value: target,
        enumerable: true
    });
    return event;
};

/**
 * Setup mock file input for file upload testing
 * @param {HTMLInputElement} fileInput - File input element
 * @param {string} content - File content
 */
const mockFileUpload = (fileInput, content) => {
    const mockFile = { mockContent: content };
    Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true
    });
};

/**
 * Create a mock list item for history/favorite/summary lists
 * Consolidated helper to reduce duplication across test files
 * @param {string} text - Item text content
 * @param {Object} options - Configuration options
 * @param {string[]} options.favoriteList - List of favorites to check against
 * @param {boolean} options.isChecked - Whether checkbox should be checked
 * @param {string} options.className - CSS class (history-list, favorite-list, summary-list)
 * @param {string} options.clueText - Additional clue text for favorites/summaries
 * @param {boolean} options.includeCheckbox - Whether to add checkbox (default: true)
 * @returns {HTMLLIElement}
 */
const createMockListItem = (text, options = {}) => {
    const {
        favoriteList = [],
        isChecked = false,
        className = 'history-list',
        clueText = null,
        includeCheckbox = true
    } = options;
    
    const li = document.createElement('li');
    li.className = `list-group-item ${className}`;
    
    const span = document.createElement('span');
    span.textContent = text;
    li.appendChild(span);
    
    // Add clue text for favorites/summaries
    if (clueText) {
        const clueSpan = document.createElement('span');
        clueSpan.className = 'd-none';
        clueSpan.textContent = clueText;
        li.appendChild(clueSpan);
    }
    
    // Add icon
    const icon = document.createElement('i');
    icon.className = favoriteList.includes(text) 
        ? 'bi bi-patch-check-fill matched' 
        : 'bi bi-patch-plus-fill';
    li.appendChild(icon);
    
    // Add checkbox (optional for summary lists)
    if (includeCheckbox) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.classList.add('form-check-input', 'd-none');
        checkbox.name = 'checkDelete';
        checkbox.value = 'delete';
        checkbox.ariaLabel = 'Delete';
        checkbox.style.cursor = 'pointer';
        li.appendChild(checkbox);
    }
    
    return li;
};

/**
 * Mock chrome.tabs.query with response (supports both callback and Promise API)
 * @param {Array} tabs - Array of tab objects to return
 */
const mockTabsQuery = (tabs) => {
    chrome.tabs.query.mockImplementation((query, callback) => {
        const promise = Promise.resolve(tabs);
        if (callback) {
            promise.then(callback);
        }
        return promise;
    });
};

/**
 * Mock chrome.tabs.sendMessage with response
 * @param {*} response - Response to return
 * @param {boolean} hasError - Whether to simulate chrome.runtime.lastError
 */
const mockTabsSendMessage = (response, hasError = false) => {
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (hasError) {
            chrome.runtime.lastError = { message: 'error' };
        }
        if (callback) callback(response);
        if (hasError) {
            chrome.runtime.lastError = null;
        }
    });
};

/**
 * Test constants for common test data
 */
const TEST_CONSTANTS = {
    LOCATION: 'Test Location',
    LONG_TEXT: 'A'.repeat(1000),
    SPECIAL_CHARS: '<script>alert("xss")</script>',
    UNICODE: '北京 東京 Москва 🗺️',
    WHITESPACE: '   ',
    URL: 'http://maps.test/search'
};

module.exports = {
    mockRuntimeMessage,
    mockStorageGet,
    mockStorageSet,
    setupMockResponse,
    setupMockStorage,
    wait,
    createMockListItems,
    mockI18n,
    cleanupDOM,
    expectCalledWithPartial,
    withWindowOpenSpy,
    createMouseEvent,
    mockFileUpload,
    createMockListItem,
    mockTabsQuery,
    mockTabsSendMessage,
    TEST_CONSTANTS
};
