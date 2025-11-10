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
    expectCalledWithPartial
};
