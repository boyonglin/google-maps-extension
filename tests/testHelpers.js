/**
 * Shared Test Helper Functions
 * Common utilities to reduce code duplication across test files
 */

// ============================================================================
// Chrome API Mocking Utilities
// ============================================================================

/**
 * Mock chrome.runtime.sendMessage with action-based routing
 * @param {Object} actionResponses - Map of action names to response objects
 * @example
 * mockChromeRuntimeMessage({
 *   'getWarmState': { searchHistoryList: [], favoriteList: [] },
 *   'buildSearchUrl': { url: 'https://maps.google.com' }
 * });
 */
const mockChromeRuntimeMessage = (actionResponses = {}) => {
  chrome.runtime.sendMessage.mockImplementation((message, callback) => {
    const response = actionResponses[message.action] || {};
    if (callback) callback(response);
    return true;
  });
};

/**
 * Mock both chrome.storage.local.get and set in one call
 * @param {Object} getResponse - Data to return from get operations
 * @param {Function} setCallback - Optional callback when set is called with data
 * @example
 * mockChromeStorage({ favoriteList: ['Tokyo'] }, (data) => {
 *   console.log('Storage set with:', data);
 * });
 */
const mockChromeStorage = (getResponse = {}, setCallback = null) => {
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    callback(getResponse);
  });

  if (setCallback) {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      setCallback(data);
      if (callback) callback();
    });
  }
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
    historyMax: 10,
    ...overrides,
  };
  chrome.storage.local.get.mockResolvedValue(mockStorageData);
  return mockStorageData;
};

/**
 * Mock global fetch API with responses
 * @param {Array|Object} responses - Single response or array of responses for consecutive calls
 * @returns {jest.Mock} The mock fetch function
 * @example
 * // Single response for all calls
 * setupMockFetch({ json: () => Promise.resolve({ data: 'test' }) });
 *
 * // Different responses for consecutive calls
 * setupMockFetch([
 *   { json: () => Promise.resolve({ data: 'first' }) },
 *   { json: () => Promise.resolve({ data: 'second' }) }
 * ]);
 */
const setupMockFetch = (responses = []) => {
  const mockFetch = jest.fn();
  if (Array.isArray(responses)) {
    responses.forEach((r) => mockFetch.mockResolvedValueOnce(r));
  } else {
    mockFetch.mockResolvedValue(responses);
  }
  global.fetch = mockFetch;
  return mockFetch;
};

/**
 * Capture Chrome API event listeners for testing
 * Useful for testing background scripts that register event listeners on load
 * @param {string[]} eventPaths - Array of event listener paths (e.g., ['runtime.onMessage', 'tabs.onActivated'])
 * @returns {Object} Map of captured listeners
 * @example
 * const listeners = captureEventListeners([
 *   'runtime.onMessage',
 *   'tabs.onActivated',
 *   'storage.onChanged'
 * ]);
 * // Later in tests:
 * listeners.runtime_onMessage[0]({ action: 'test' }, {}, jest.fn());
 */
const captureEventListeners = (eventPaths) => {
  const captured = {};

  eventPaths.forEach((path) => {
    const parts = path.split(".");
    let target = chrome;

    // Navigate to the parent object (e.g., chrome.runtime)
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const descriptor = Object.getOwnPropertyDescriptor(target, part);
      if (descriptor && typeof descriptor.value === "object" && descriptor.value !== null) {
        target = descriptor.value;
      }
    }

    const eventName = parts[parts.length - 1];
    const key = path.replace(/\./g, "_"); // runtime.onMessage -> runtime_onMessage

    // Mock addListener to capture the callback
    const eventDescriptor = Object.getOwnPropertyDescriptor(target, eventName);
    if (eventDescriptor && eventDescriptor.value) {
      eventDescriptor.value.addListener.mockImplementation((fn) => {
        if (!captured[key]) captured[key] = [];
        captured[key].push(fn);
      });
    }
  });

  return captured;
};

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Create a promise that resolves after a delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Flush all pending promises in the microtask queue
 * This is the preferred way to wait for async operations in tests
 * as it's deterministic and doesn't rely on arbitrary timeouts.
 * Uses process.nextTick for Node.js compatibility or setTimeout(0) as fallback.
 * @returns {Promise<void>}
 * @example
 * // Instead of: await new Promise(resolve => setTimeout(resolve, 100));
 * // Use: await flushPromises();
 */
const flushPromises = () => {
  if (typeof process !== "undefined" && process.nextTick) {
    return new Promise((resolve) => process.nextTick(resolve));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Create mock list items for testing (pattern from menu.test.js)
 * @param {number} count - Number of items to create
 * @param {string} className - CSS class for items
 * @param {Function} textGenerator - Function to generate text (index) => text
 * @returns {Array} Array of mock DOM elements
 */
const createMockListItems = (
  count = 3,
  className = "summary-list",
  textGenerator = (i) => `Location ${i + 1}`
) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = document.createElement("div");
    item.className = `${className} list-group-item`;
    const span = document.createElement("span");
    span.textContent = textGenerator(i);
    item.appendChild(span);
    items.push(item);
  }
  return items;
};

/**
 * Setup mock i18n messages with default translations
 * @param {Object} messages - Key-value pairs of message keys and translations (merges with defaults)
 * @example
 * mockI18n({ customKey: 'Custom Value' });
 */
const mockI18n = (messages = {}) => {
  const defaultMessages = {
    openAll: "Open All",
    getDirections: "Get Directions",
    tidyLocations: "Tidy Locations",
    deleteBtnText: "Delete ($1)",
    deleteBtnTextEmpty: "Delete",
    clearedUpMsg: "All cleared up!\nNothing to see here.",
    ...messages,
  };

  global.chrome.i18n.getMessage.mockImplementation((key, substitutions) => {
    const message = defaultMessages[key] || key;
    if (substitutions) {
      return message.replace("$1", substitutions);
    }
    return message;
  });
};

/**
 * Clean up DOM between tests
 */
const cleanupDOM = () => {
  document.body.innerHTML = "";
};

// ============================================================================
// Jest Assertion Helpers
// ============================================================================

/**
 * Assert that a function was called with partial object matching
 * @param {Function} mockFn - Jest mock function
 * @param {Object} expectedPartial - Partial object to match
 * @example
 * expectCalledWithPartial(chrome.storage.local.set, { favoriteList: ['Tokyo'] });
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
 * @example
 * await withWindowOpenSpy(async (openSpy) => {
 *   myFunction();
 *   expect(openSpy).toHaveBeenCalledWith('https://example.com');
 * });
 */
const withWindowOpenSpy = async (testFn) => {
  const openSpy = jest.spyOn(window, "open").mockImplementation(() => {});
  try {
    await testFn(openSpy);
  } finally {
    openSpy.mockRestore();
  }
};

// ============================================================================
// Event and Interaction Utilities
// ============================================================================

/**
 * Create and dispatch a mouse event
 * @param {HTMLElement} target - Target element
 * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
 * @param {Object} props - Additional event properties
 */
const createMouseEvent = (target, button = 0, props = {}) => {
  const event = new MouseEvent("mousedown", {
    bubbles: true,
    button,
    ...props,
  });
  Object.defineProperty(event, "target", {
    value: target,
    enumerable: true,
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
  Object.defineProperty(fileInput, "files", {
    value: [mockFile],
    writable: true,
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
    className = "history-list",
    clueText = null,
    includeCheckbox = true,
  } = options;

  const li = document.createElement("li");
  li.className = `list-group-item ${className}`;

  const span = document.createElement("span");
  span.textContent = text;
  li.appendChild(span);

  // Add clue text for favorites/summaries
  if (clueText) {
    const clueSpan = document.createElement("span");
    clueSpan.className = "d-none";
    clueSpan.textContent = clueText;
    li.appendChild(clueSpan);
  }

  // Add icon
  const icon = document.createElement("i");
  icon.className = favoriteList.includes(text)
    ? "bi bi-patch-check-fill matched"
    : "bi bi-patch-plus-fill";
  li.appendChild(icon);

  // Add checkbox (optional for summary lists)
  if (includeCheckbox) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isChecked;
    checkbox.classList.add("form-check-input", "d-none");
    checkbox.name = "checkDelete";
    checkbox.value = "delete";
    checkbox.ariaLabel = "Delete";
    checkbox.style.cursor = "pointer";
    li.appendChild(checkbox);
  }

  return li;
};

/**
 * Mock chrome.tabs.query with response (supports both callback and Promise API)
 * @param {Array} tabs - Array of tab objects to return
 * @example
 * mockTabsQuery([{ id: 1, url: 'https://example.com' }]);
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
 * @example
 * mockTabsSendMessage({ success: true });
 * mockTabsSendMessage(null, true); // Simulate error
 */
const mockTabsSendMessage = (response, hasError = false) => {
  chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
    if (hasError) {
      chrome.runtime.lastError = { message: "error" };
    }
    if (callback) callback(response);
    if (hasError) {
      chrome.runtime.lastError = null;
    }
  });
};

// ============================================================================
// Test Data Constants
// ============================================================================

/**
 * Test constants for common test data
 */
const TEST_CONSTANTS = {
  LOCATION: "Test Location",
  LONG_TEXT: "A".repeat(1000),
  SPECIAL_CHARS: '<script>alert("xss")</script>',
  UNICODE: "北京 東京 Москва 🗺️",
  WHITESPACE: "   ",
  URL: "http://maps.test/search",
};

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
  // Chrome API Mocking
  mockChromeRuntimeMessage,
  mockChromeStorage,
  mockTabsQuery,
  mockTabsSendMessage,

  // Fetch Mocking
  setupMockFetch,

  // Event Listener Capture
  captureEventListeners,

  // Storage Setup
  setupMockStorage,

  // Async Utilities
  wait,
  flushPromises,

  // DOM Utilities
  createMockListItems,
  createMockListItem,
  cleanupDOM,
  mockI18n,

  // Jest Assertions
  expectCalledWithPartial,

  // Spy Helpers
  withWindowOpenSpy,

  // Event Utilities
  createMouseEvent,
  mockFileUpload,

  // Constants
  TEST_CONSTANTS,
};
