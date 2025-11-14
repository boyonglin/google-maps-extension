/**
 * Comprehensive Unit Tests for background.js
 * Testing all functions, event handlers, and edge cases
 * 
 * Note: background.js registers event listeners immediately on import,
 * so we capture the callbacks for testing purposes.
 * 
 * Uses enhanced testHelpers utilities:
 * - setupMockFetch() for mocking fetch API
 * - mockStartAddr() for repeated storage mocking pattern
 */

// Import test helpers at module level
const { setupMockFetch, flushPromises } = require('./testHelpers');

// Mock ExtPay before importing background.js
jest.mock('../Package/dist/utils/ExtPay.module.js', () => {
  const mockUser = {
    paid: false,
    trialStartedAt: null,
    installedAt: null,
    email: null
  };

  const mockExtPay = {
    getUser: jest.fn(() => Promise.resolve(mockUser)),
    getPlans: jest.fn(() => Promise.resolve([])),
    openPaymentPage: jest.fn(),
    openLoginPage: jest.fn(),
    openTrialPage: jest.fn(),
    startBackground: jest.fn(),
    onPaid: {
      addListener: jest.fn()
    }
  };

  const ExtPay = jest.fn(() => mockExtPay);
  ExtPay.mockUser = mockUser;
  ExtPay.mockExtPay = mockExtPay;

  return { __esModule: true, default: ExtPay };
});

// Mock crypto module
jest.mock('../Package/dist/utils/crypto.js', () => ({
  encryptApiKey: jest.fn((key) => Promise.resolve(`encrypted_${key}`)),
  decryptApiKey: jest.fn((key) => {
    if (key.startsWith('encrypted_')) return Promise.resolve(key.replace('encrypted_', ''));
    return Promise.resolve(key);
  })
}));

// Mock prompt module
jest.mock('../Package/dist/utils/prompt.js', () => ({
  geminiPrompts: {
    attach: 'Attach prompt: ',
    summary: 'Summary prompt: ',
    organize: 'Organize prompt: '
  }
}));

// Mock backgroundState module
jest.mock('../Package/dist/hooks/backgroundState.js', () => ({
  ensureWarm: jest.fn(() => Promise.resolve({})),
  getApiKey: jest.fn(() => Promise.resolve('test-api-key')),
  getCache: jest.fn(() => ({
    searchHistoryList: [],
    favoriteList: [],
    geminiApiKey: 'test-key',
    isIncognito: false
  })),
  applyStorageChanges: jest.fn(),
  queryUrl: 'https://www.google.com/maps?authuser=0&',
  buildSearchUrl: jest.fn((q) => `https://www.google.com/maps?authuser=0&q=${encodeURIComponent(q)}`),
  buildDirectionsUrl: jest.fn((o, d) => `https://www.google.com/maps/dir/?authuser=0&api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`),
  buildMapsUrl: jest.fn(() => 'https://www.google.com/maps?authuser=0'),
  __resetCacheForTesting: jest.fn()
}));

describe('background.js', () => {
  let listeners = {};
  let mockFetch;
  
  // Helper: Mock chrome.storage.local.get for startAddr
  const mockStartAddr = (value = '') => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ startAddr: value });
    });
  };
  
  beforeAll(() => {
    // Capture all listeners before importing background.js
    chrome.runtime.onInstalled.addListener.mockImplementation((fn) => {
      listeners.onInstalled = fn;
    });
    chrome.storage.onChanged.addListener.mockImplementation((fn) => {
      listeners.onStorageChanged = fn;
    });
    chrome.contextMenus.onClicked.addListener.mockImplementation((fn) => {
      listeners.onContextMenuClicked = fn;
    });
    chrome.commands.onCommand.addListener.mockImplementation((fn) => {
      listeners.onCommand = fn;
    });
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      if (!listeners.onMessage) listeners.onMessage = [];
      listeners.onMessage.push(fn);
    });
    chrome.action.onClicked.addListener.mockImplementation((fn) => {
      listeners.onActionClicked = fn;
    });
    chrome.tabs.onActivated.addListener.mockImplementation((fn) => {
      listeners.onTabActivated = fn;
    });
    
    // Setup global fetch mock using helper
    mockFetch = setupMockFetch();
    
    // Now import background.js which will register all listeners
    require('../Package/dist/background.js');
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset chrome API mocks but keep listeners registered
    chrome.contextMenus.create.mockClear();
    chrome.contextMenus.remove.mockClear();
    chrome.tabs.create.mockClear();
    chrome.tabs.query.mockClear();
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.tabs.sendMessage.mockClear();
    chrome.tabs.update.mockClear();
    chrome.scripting.executeScript.mockClear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  // Listener indices for different onMessage handlers
  // Based on registration order in background.js
  const BASIC_ACTIONS_LISTENER = 0;      // clearSearchHistoryList, searchInput, addToFavoriteList, openTab, canGroup, openInGroup, organizeLocations
  const GEMINI_API_LISTENER = 1;          // summarizeApi, summarizeVideo
  const VERIFY_API_LISTENER = 2;          // verifyApiKey
  const PAYMENT_LISTENER = 3;             // extPay, restorePay, checkPay  
  const STATE_QUERIES_LISTENER = 4;       // getWarmState, getApiKey, buildSearchUrl, buildDirectionsUrl, buildMapsUrl

  describe('Module Initialization', () => {
    test('should have registered all event listeners on load', () => {
      expect(listeners.onInstalled).toBeDefined();
      expect(listeners.onStorageChanged).toBeDefined();
      expect(listeners.onContextMenuClicked).toBeDefined();
      expect(listeners.onCommand).toBeDefined();
      expect(listeners.onMessage).toBeDefined();
      expect(listeners.onMessage.length).toBe(5); // Should have exactly 5 message listeners
      expect(listeners.onActionClicked).toBeDefined();
      expect(listeners.onTabActivated).toBeDefined();
    });
  });

  describe('chrome.runtime.onInstalled listener', () => {
    test('should create context menu items on install', () => {
      mockStartAddr('');

      listeners.onInstalled({ reason: 'install' });

      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'googleMapsSearch',
        title: expect.any(String),
        contexts: ['selection']
      });
    });

    test('should create directions context menu when startAddr exists', () => {
      mockStartAddr('123 Main St');

      listeners.onInstalled({ reason: 'install' });

      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'googleMapsDirections'
        })
      );
    });

    test('should open whats new page on install for Chinese locale', () => {
      chrome.i18n.getUILanguage = jest.fn(() => 'zh-CN');
      mockStartAddr('');

      listeners.onInstalled({ reason: 'install' });

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('notion.site')
      });
    });

    test('should open whats new page on install for English locale', () => {
      chrome.i18n.getUILanguage = jest.fn(() => 'en-US');
      mockStartAddr('');

      listeners.onInstalled({ reason: 'install' });

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('notion.site')
      });
    });

    test('should open whats new page on update from old version', () => {
      chrome.i18n.getUILanguage = jest.fn(() => 'en-US');
      mockStartAddr('');

      listeners.onInstalled({ reason: 'update', previousVersion: '1.10.0' });

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('notion.site')
      });
    });

    test('should not open whats new page on update from same or newer version', () => {
      chrome.i18n.getUILanguage = jest.fn(() => 'en-US');
      mockStartAddr('');

      listeners.onInstalled({ reason: 'update', previousVersion: '1.11.3' });

      // Should only call create for context menus, not for tab
      const tabCreateCalls = chrome.tabs.create.mock.calls.filter(
        call => call[0].url && call[0].url.includes('notion.site')
      );
      expect(tabCreateCalls.length).toBe(0);
    });

    test('should open whats new page when updating from version with higher first digit', () => {
      chrome.i18n.getUILanguage = jest.fn(() => 'en-US');
      mockStartAddr('');

      listeners.onInstalled({ reason: 'update', previousVersion: '0.9.9' });

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('notion.site')
      });
    });

    test('should encrypt unencrypted API key on update', async () => {
      const { encryptApiKey } = require('../Package/dist/utils/crypto.js');
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (keys === 'geminiApiKey') {
          callback({ geminiApiKey: 'plain-api-key' });
        } else {
          callback({ startAddr: '' });
        }
      });

      await listeners.onInstalled({ reason: 'update', previousVersion: '1.0.0' });
      
      // Wait for async operations
      await flushPromises();

      expect(encryptApiKey).toHaveBeenCalledWith('plain-api-key');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        geminiApiKey: 'encrypted_plain-api-key'
      });
    });

    test('should not encrypt already encrypted API key', async () => {
      const { encryptApiKey } = require('../Package/dist/utils/crypto.js');
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (keys === 'geminiApiKey') {
          callback({ geminiApiKey: 'key.with.dots' });
        } else {
          callback({ startAddr: '' });
        }
      });

      await listeners.onInstalled({ reason: 'update', previousVersion: '1.0.0' });
      
      await flushPromises();

      expect(encryptApiKey).not.toHaveBeenCalled();
    });
  });

  describe('chrome.storage.onChanged listener', () => {
    test('should call applyStorageChanges when storage changes', () => {
      const { applyStorageChanges } = require('../Package/dist/hooks/backgroundState.js');
      const changes = { geminiApiKey: { newValue: 'new-key' } };

      listeners.onStorageChanged(changes, 'local');

      expect(applyStorageChanges).toHaveBeenCalledWith(changes, 'local');
    });

    test('should create directions menu when startAddr is added', () => {
      const changes = {
        startAddr: { newValue: '123 Main St' }
      };

      chrome.contextMenus.remove.mockImplementation((id, callback) => {
        callback && callback();
      });

      listeners.onStorageChanged(changes, 'local');

      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'googleMapsDirections',
        title: expect.any(String),
        contexts: ['selection']
      });
    });

    test('should remove directions menu when startAddr is removed', () => {
      const changes = {
        startAddr: { newValue: null }
      };

      chrome.contextMenus.remove.mockImplementation((id, callback) => {
        callback && callback();
      });

      listeners.onStorageChanged(changes, 'local');

      expect(chrome.contextMenus.remove).toHaveBeenCalledWith(
        'googleMapsDirections',
        expect.any(Function)
      );
    });

    test('should handle chrome.runtime.lastError in context menu operations', () => {
      const changes = {
        startAddr: { newValue: '123 Main St' }
      };

      chrome.contextMenus.remove.mockImplementation((id, callback) => {
        chrome.runtime.lastError = new Error('Menu item does not exist');
        callback && callback();
        chrome.runtime.lastError = null;
      });

      expect(() => {
        listeners.onStorageChanged(changes, 'local');
      }).not.toThrow();
    });

    test('should handle chrome.runtime.lastError in sendMessage', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        chrome.runtime.lastError = { message: 'Tab was closed' };
        callback && callback(null);
        chrome.runtime.lastError = null;
      });

      mockStartAddr('123 Main St');

      await listeners.onCommand('run-directions');
      
      await flushPromises();

      // Should handle the error gracefully
      expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    });
  });

  describe('chrome.contextMenus.onClicked listener', () => {
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ 
          searchHistoryList: [],
          startAddr: '123 Main St'
        });
      });
    });

    test('should handle googleMapsSearch context menu click', () => {
      const { buildSearchUrl } = require('../Package/dist/hooks/backgroundState.js');
      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'Tokyo Tower'
      };

      listeners.onContextMenuClicked(info);

      expect(buildSearchUrl).toHaveBeenCalledWith('Tokyo Tower');
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    test('should handle googleMapsDirections context menu click', () => {
      const { buildDirectionsUrl } = require('../Package/dist/hooks/backgroundState.js');
      const info = {
        menuItemId: 'googleMapsDirections',
        selectionText: 'Tokyo Tower'
      };

      listeners.onContextMenuClicked(info);

      expect(buildDirectionsUrl).toHaveBeenCalledWith('123 Main St', 'Tokyo Tower');
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    test('should not create tab with empty selection text', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: ''
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('No valid selected text.');
      consoleSpy.mockRestore();
    });

    test('should update search history after search', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ searchHistoryList: ['Previous Search'] });
      });
      
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: false });

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'New Search'
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: expect.arrayContaining(['New Search'])
      });
    });

    test('should not update history in incognito mode', () => {
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: true });

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'Secret Search'
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should limit history list to maxListLength', () => {
      const existingHistory = Array.from({ length: 10 }, (_, i) => `Search ${i + 1}`);
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ searchHistoryList: existingHistory });
      });
      
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: false });

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'Search 11'
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: expect.arrayContaining(['Search 11'])
      });
      
      const savedList = chrome.storage.local.set.mock.calls[0][0].searchHistoryList;
      expect(savedList.length).toBeLessThanOrEqual(10);
    });

    test('should move existing search to end of history', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ searchHistoryList: ['Search A', 'Search B', 'Search C'] });
      });
      
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: false });

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'Search B'
      };

      listeners.onContextMenuClicked(info);

      const savedList = chrome.storage.local.set.mock.calls[0][0].searchHistoryList;
      expect(savedList[savedList.length - 1]).toBe('Search B');
    });

    test('should initialize empty search history when null', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ searchHistoryList: null });
      });
      
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: false });

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: 'First Search'
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: ['First Search']
      });
    });
  });

  describe('chrome.commands.onCommand listener', () => {
    beforeEach(() => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });
    });

    test('should handle run-search command', () => {
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getSelectedText') {
          callback({ selectedText: 'Search Term' });
        }
      });

      listeners.onCommand('run-search');

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'getSelectedText' },
        expect.any(Function)
      );
    });

    test('should handle auto-attach command for trial user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStartDate
      });

      // Mock sendMessage to respond to getContent with content
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getContent' && callback) {
          callback({ content: 'test content' });
        }
      });

      // Mock fetch for callApi
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'location1    clue1\nlocation2    clue2' }]
            }
          }]
        })
      });

      await listeners.onCommand('auto-attach');
      
      await flushPromises();

      // Check that consoleQuote was sent with trial stage
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'trial' }
      );
    });

    test('should handle auto-attach command for paid user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: true,
        trialStartedAt: null
      });

      // Mock sendMessage to respond to getContent with content
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getContent' && callback) {
          callback({ content: 'test content' });
        }
      });

      // Mock fetch for callApi
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'location1    clue1\nlocation2    clue2' }]
            }
          }]
        })
      });

      await listeners.onCommand('auto-attach');
      
      await flushPromises();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'premium' }
      );
    });

    test('should handle auto-attach command for free user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const oldTrialStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: oldTrialStart
      });

      chrome.tabs.sendMessage.mockImplementation(() => {});

      await listeners.onCommand('auto-attach');
      
      await flushPromises();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'free' }
      );
    });

    test('should handle run-directions command with startAddr', async () => {
      mockStartAddr('123 Main St');

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getSelectedText') {
          callback({ selectedText: 'Destination' });
        }
      });

      await listeners.onCommand('run-directions');
      
      await flushPromises();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'getSelectedText' },
        expect.any(Function)
      );
    });

    test('should show notification when run-directions without startAddr', async () => {
      mockStartAddr('');

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({});
      });

      await listeners.onCommand('run-directions');
      
      await flushPromises();

      // Should call scripting.executeScript (for meow function)
      expect(chrome.scripting.executeScript).toHaveBeenCalled();
      
      // Should also try to notify about missing address
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'addrNotify' },
        expect.any(Function)
      );
    });

    test('should not execute on non-HTTP URL', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'chrome://extensions' }]);
      });

      listeners.onCommand('run-search');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot execute extension on non-HTTP URL.'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('chrome.runtime.onMessage listener - Basic actions', () => {
    // These actions are handled by the first onMessage listener (index 0)
    const BASIC_ACTIONS_LISTENER = 0;
    
    test('should clear search history', () => {
      const request = { action: 'clearSearchHistoryList' };
      
      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, jest.fn());

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        searchHistoryList: []
      });
    });

    test('should handle searchInput action', () => {
      const { buildSearchUrl } = require('../Package/dist/hooks/backgroundState.js');
      const request = {
        action: 'searchInput',
        searchTerm: 'Tokyo'
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ searchHistoryList: [] });
      });
      
      const { getCache } = require('../Package/dist/hooks/backgroundState.js');
      getCache.mockReturnValue({ isIncognito: false });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, jest.fn());

      expect(buildSearchUrl).toHaveBeenCalledWith('Tokyo');
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    test('should add to favorite list', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favoriteList: [] });
      });

      const request = {
        action: 'addToFavoriteList',
        selectedText: 'Tokyo Tower'
      };

      listeners.onMessage[0](request, {}, jest.fn());

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        favoriteList: ['Tokyo Tower']
      });
    });

    test('should handle openTab action', () => {
      const request = {
        action: 'openTab',
        url: 'https://example.com'
      };

      listeners.onMessage[0](request, {}, jest.fn());

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: false
      });
    });

    test('should respond to canGroup action', () => {
      const sendResponse = jest.fn();
      const request = { action: 'canGroup' };

      listeners.onMessage[0](request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        canGroup: expect.any(Boolean)
      });
    });

    test('should handle openInGroup action', () => {
      const request = {
        action: 'openInGroup',
        urls: ['https://example1.com', 'https://example2.com'],
        groupTitle: 'Test Group',
        groupColor: 'blue',
        collapsed: false
      };

      chrome.windows.getCurrent.mockImplementation((opts, callback) => {
        callback({ id: 1 });
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 99 }]);
      });

      chrome.tabs.create.mockImplementation((opts, callback) => {
        callback({ id: Math.random() });
      });

      chrome.tabs.group.mockImplementation((opts, callback) => {
        callback(123);
      });

      listeners.onMessage[0](request, {}, jest.fn());

      expect(chrome.windows.getCurrent).toHaveBeenCalled();
    });
  });

  describe('chrome.runtime.onMessage listener - Gemini API', () => {
    test('should handle summarizeApi action successfully', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeApi',
        text: 'Content to summarize',
        apiKey: 'test-key',
        url: 'https://example.com'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Summary result' }]
            }
          }]
        })
      });

      const result = listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      expect(result).toBe(true); // Indicates async response

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith('Summary result');
    });

    test('should handle YouTube URL in summarizeApi', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeApi',
        text: 'Video content',
        apiKey: 'test-key',
        url: 'https://www.youtube.com/watch?v=test'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Video summary' }]
            }
          }]
        })
      });

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      // YouTube summary should use modified prompt
      expect(body.contents[0].parts[0].text).not.toContain('<h1>');
    });

    test('should handle API error in summarizeApi', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeApi',
        text: 'Content',
        apiKey: 'test-key',
        url: 'https://example.com'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          error: { message: 'API quota exceeded' }
        })
      });

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        error: 'API quota exceeded'
      });
    });

    test('should handle summarizeVideo action', async () => {
      const { getApiKey } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeVideo',
        text: 'https://youtube.com/video'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Video summary' }]
            }
          }]
        })
      });

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(getApiKey).toHaveBeenCalled();
    });

    test('should handle organizeLocations action', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'organizeLocations',
        locations: [
          { name: 'Location 1', clue: 'City A' },
          { name: 'Location 2', clue: 'City B' }
        ],
        listType: 'favorites'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: '{"categories":[{"name":"Test","locations":[{"name":"Location 1"}]}]}'
              }]
            }
          }]
        })
      });

      const result = listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      expect(result).toBe(true);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        organizedData: expect.objectContaining({
          categories: expect.any(Array)
        })
      });
    });

    test('should handle organizeLocations with missing API key', async () => {
      const { getApiKey } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      
      // Mock runtime.sendMessage for tryAPINotify retry mechanism
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ });
      });
      
      // Temporarily replace getApiKey to throw error
      getApiKey.mockRejectedValueOnce(new Error('No API key found. Please provide one.'));

      const request = {
        action: 'organizeLocations',
        locations: [{ name: 'Location 1' }],
        listType: 'favorites'
      };

      const result = listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);
      expect(result).toBe(true); // Async handler

      // Wait longer for the retry mechanism to complete
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'No API key found. Please provide one.'
      });
      
      // Restore mock for other tests
      getApiKey.mockResolvedValue('test-api-key');
    });

    test('should handle organizeLocations when API returns error', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'organizeLocations',
        locations: [{ name: 'Location 1', clue: 'City A' }],
        listType: 'favorites'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          error: { message: 'API quota exceeded' }
        })
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'API quota exceeded'
      });
    });

    test('should handle organizeLocations with other errors', async () => {
      const { getApiKey } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock runtime.sendMessage
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ });
      });
      
      // Temporarily replace getApiKey to throw a different error
      getApiKey.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = {
        action: 'organizeLocations',
        locations: [{ name: 'Location 1' }],
        listType: 'favorites'
      };

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to organize locations:', expect.any(Error));
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed'
      });
      
      consoleSpy.mockRestore();
      getApiKey.mockResolvedValue('test-api-key');
    });

    test('should handle verifyApiKey action', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'verifyApiKey',
        apiKey: 'test-key'
      };

      mockFetch.mockResolvedValue({ ok: true });

      listeners.onMessage[VERIFY_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ valid: true });
    });

    test('should handle verifyApiKey network error', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'verifyApiKey',
        apiKey: 'test-key'
      };

      mockFetch.mockRejectedValue(new Error('Network failed'));

      listeners.onMessage[VERIFY_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ error: 'Network failed' });
    });
  });

  describe('chrome.runtime.onMessage listener - Payment system', () => {
    test('should handle extPay action for first-time user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: null
      });

      const sender = { tab: { id: 1 } };
      const request = { action: 'extPay' };

      await listeners.onMessage[PAYMENT_LISTENER](request, sender, jest.fn());
      
      await flushPromises();

      expect(ExtPay.mockExtPay.openTrialPage).toHaveBeenCalledWith('7-day');
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'first' }
      );
    });

    test('should handle extPay action for trial user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      const sender = { tab: { id: 1 } };
      const request = { action: 'extPay' };

      await listeners.onMessage[PAYMENT_LISTENER](request, sender, jest.fn());
      
      await flushPromises();

      expect(ExtPay.mockExtPay.openTrialPage).toHaveBeenCalled();
    });

    test('should handle extPay action for expired trial user', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      const sender = { tab: { id: 1 } };
      const request = { action: 'extPay' };

      await listeners.onMessage[PAYMENT_LISTENER](request, sender, jest.fn());
      
      await flushPromises();

      expect(ExtPay.mockExtPay.openPaymentPage).toHaveBeenCalled();
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'payment' }
      );
    });

    test('should handle restorePay action', () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const request = { action: 'restorePay' };

      listeners.onMessage[PAYMENT_LISTENER](request, {}, jest.fn());

      expect(ExtPay.mockExtPay.openLoginPage).toHaveBeenCalled();
    });

    test('should handle checkPay action', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const sendResponse = jest.fn();
      const trialStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      const request = { action: 'checkPay' };
      const result = listeners.onMessage[PAYMENT_LISTENER](request, {}, sendResponse);

      expect(result).toBe(true);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        result: expect.objectContaining({
          isFirst: false,
          isTrial: true,
          isPremium: false,
          isFree: false,
          trialEnd: expect.any(Number)
        })
      });
    });
  });

  describe('chrome.runtime.onMessage listener - State queries', () => {
    test('should handle getWarmState action', async () => {
      const { ensureWarm, getCache } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = { action: 'getWarmState' };

      const mockCache = { test: 'data' };
      ensureWarm.mockResolvedValue({});
      getCache.mockReturnValue(mockCache);

      const result = listeners.onMessage[STATE_QUERIES_LISTENER](
        request,
        {},
        sendResponse
      );

      expect(result).toBe(true);

      await flushPromises();

      expect(ensureWarm).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(mockCache);
    });

    test('should handle getApiKey action', async () => {
      const { getApiKey } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = { action: 'getApiKey' };

      getApiKey.mockResolvedValue('my-api-key');

      const result = listeners.onMessage[STATE_QUERIES_LISTENER](
        request,
        {},
        sendResponse
      );

      expect(result).toBe(true);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ apiKey: 'my-api-key' });
    });

    test('should handle buildSearchUrl action', () => {
      const { buildSearchUrl } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = {
        action: 'buildSearchUrl',
        query: 'Tokyo'
      };

      buildSearchUrl.mockReturnValue('https://maps.google.com?q=Tokyo');

      listeners.onMessage[STATE_QUERIES_LISTENER](request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        url: 'https://maps.google.com?q=Tokyo'
      });
    });

    test('should handle buildDirectionsUrl action', () => {
      const { buildDirectionsUrl } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = {
        action: 'buildDirectionsUrl',
        origin: 'Tokyo',
        destination: 'Osaka'
      };

      buildDirectionsUrl.mockReturnValue('https://maps.google.com/dir/?api=1&origin=Tokyo&destination=Osaka');

      listeners.onMessage[STATE_QUERIES_LISTENER](request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        url: expect.stringContaining('Tokyo')
      });
    });

    test('should handle buildMapsUrl action', () => {
      const { buildMapsUrl } = require('../Package/dist/hooks/backgroundState.js');
      const sendResponse = jest.fn();
      const request = { action: 'buildMapsUrl' };

      buildMapsUrl.mockReturnValue('https://maps.google.com');

      listeners.onMessage[STATE_QUERIES_LISTENER](request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        url: 'https://maps.google.com'
      });
    });
  });

  describe('chrome.action.onClicked listener (meow function)', () => {
    test('should inject script when not already active', () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.scripting.executeScript.mockImplementation((opts, callback) => {
        if (opts.files[0] === 'dist/checkStatus.js') {
          callback([{ result: false }]);
        }
      });

      listeners.onActionClicked();

      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ['dist/inject.js']
        })
      );
    });

    test('should eject script when already active', () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.scripting.executeScript.mockImplementation((opts, callback) => {
        if (opts.files[0] === 'dist/checkStatus.js') {
          callback([{ result: true }]);
        }
      });

      listeners.onActionClicked();

      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ['dist/ejectLite.js']
        })
      );
    });

    test('should handle script execution errors gracefully', () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.scripting.executeScript.mockImplementation((opts, callback) => {
        chrome.runtime.lastError = new Error('Script error');
        callback(null);
        chrome.runtime.lastError = null;
      });

      expect(() => {
        listeners.onActionClicked();
      }).not.toThrow();
    });
  });

  describe('chrome.tabs.onActivated listener', () => {
    test('should call ensureWarm on tab activation', () => {
      const { ensureWarm } = require('../Package/dist/hooks/backgroundState.js');

      listeners.onTabActivated();

      expect(ensureWarm).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle null/undefined in handleSelectedText', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: null
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle retry logic when getContent fails transiently', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });

      // First call fails with RECEIVING_END_ERR, second succeeds
      let callCount = 0;
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getContent') {
          callCount++;
          if (callCount === 1) {
            callback(null); // Simulate receiving end error
          } else {
            callback({ content: 'test content' });
          }
        }
      });

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'location1    clue1' }]
            }
          }]
        })
      });

      await listeners.onCommand('auto-attach');
      
      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(callCount).toBeGreaterThan(1);
    });

    test('should handle retry exhaustion and throw error', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });

      // Always fail with RECEIVING_END_ERR
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getContent') {
          callback(null);
        }
      });

      await listeners.onCommand('auto-attach');
      
      // Wait for all retries to exhaust
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should eventually give up after retries
      expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    });

    test('should handle try-catch error notification flow', async () => {
      const ExtPay = require('../Package/dist/utils/ExtPay.module.js').default;
      const trialStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      ExtPay.mockExtPay.getUser.mockResolvedValue({
        paid: false,
        trialStartedAt: trialStart
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      });

      // Mock getApiKey to fail
      const { getApiKey } = require('../Package/dist/hooks/backgroundState.js');
      const originalGetApiKey = getApiKey.getMockImplementation();
      getApiKey.mockRejectedValueOnce(new Error('No API key'));

      // Mock runtime.sendMessage for notification
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({});
      });

      await listeners.onCommand('auto-attach');
      
      await flushPromises();

      // Should send missing stage notification
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'consoleQuote', stage: 'missing' }
      );

      // Restore for other tests
      getApiKey.mockImplementation(originalGetApiKey || (() => Promise.resolve('test-api-key')));
    });

    test('should handle whitespace-only selection', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = {
        menuItemId: 'googleMapsSearch',
        selectionText: '   '
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.tabs.create).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle empty selection for directions', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = {
        menuItemId: 'googleMapsDirections',
        selectionText: ''
      };

      listeners.onContextMenuClicked(info);

      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('No valid selected text.');
      consoleSpy.mockRestore();
    });

    test('should handle fetch network errors in Gemini API', async () => {
      const sendResponse = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = {
        action: 'summarizeApi',
        text: 'Content',
        apiKey: 'test-key',
        url: 'https://example.com'
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      // Should have called sendResponse with error after bug fix
      expect(mockFetch).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Network error'
      });
      
      consoleSpy.mockRestore();
    });

    test('should handle malformed JSON in organizeLocations response', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'organizeLocations',
        locations: [{ name: 'Location 1' }],
        listType: 'favorites'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Invalid JSON response' }]
            }
          }]
        })
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        organizedData: { rawText: 'Invalid JSON response' }
      });
    });

    test('should handle JSON parse error in organizeLocations', async () => {
      const sendResponse = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = {
        action: 'organizeLocations',
        locations: [{ name: 'Location 1' }],
        listType: 'favorites'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"invalid json with trailing comma",}' }]
            }
          }]
        })
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse JSON response:', expect.any(Error));
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        organizedData: { rawText: '{"invalid json with trailing comma",}' }
      });
      
      consoleSpy.mockRestore();
    });

    test('should handle empty locations list in organizeLocations', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'organizeLocations',
        locations: [],
        listType: 'favorites'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"categories":[]}' }]
            }
          }]
        })
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        organizedData: { categories: [] }
      });
    });

    test('should handle HTML response from Gemini API', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeApi',
        text: 'Content',
        apiKey: 'test-key',
        url: 'https://example.com'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: '<ul class="list-group d-flex"><li>Item 1</li></ul>'
              }]
            }
          }]
        })
      });

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith(
        expect.stringContaining('<ul class="list-group d-flex">')
      );
    });

    test('should handle YouTube URI in callApi', async () => {
      const sendResponse = jest.fn();
      const request = {
        action: 'summarizeApi',
        text: 'https://youtube.com/watch?v=abc',
        apiKey: 'test-key',
        url: 'https://example.com'
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Summary' }]
            }
          }]
        })
      });

      listeners.onMessage[GEMINI_API_LISTENER](request, {}, sendResponse);

      await flushPromises();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      // YouTube URI should use file_data format
      expect(body.contents[0].parts.some(part => part.file_data)).toBe(true);
    });
  });

  describe('Favorite list management', () => {
    test('should add item to empty favorite list', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favoriteList: null });
      });

      const request = {
        action: 'addToFavoriteList',
        selectedText: 'First Favorite'
      };

      listeners.onMessage[0](request, {}, jest.fn());

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        favoriteList: ['First Favorite']
      });
    });

    test('should move existing favorite to end', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favoriteList: ['Fav A', 'Fav B', 'Fav C'] });
      });

      const request = {
        action: 'addToFavoriteList',
        selectedText: 'Fav B'
      };

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, jest.fn());

      const savedList = chrome.storage.local.set.mock.calls[0][0].favoriteList;
      expect(savedList[savedList.length - 1]).toBe('Fav B');
      expect(savedList.filter(f => f === 'Fav B').length).toBe(1);
    });
  });

  describe('Tab grouping functionality', () => {
    test('should create tab group with multiple URLs', () => {
      const request = {
        action: 'openInGroup',
        urls: ['https://url1.com', 'https://url2.com', 'https://url3.com'],
        groupTitle: 'My Places',
        groupColor: 'red',
        collapsed: true
      };

      chrome.windows.getCurrent.mockImplementation((opts, callback) => {
        callback({ id: 1 });
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 100 }]);
      });

      let tabIdCounter = 200;
      chrome.tabs.create.mockImplementation((opts, callback) => {
        callback({ id: tabIdCounter++ });
      });

      chrome.tabs.group.mockImplementation((opts, callback) => {
        callback(999);
      });

      chrome.tabGroups.update.mockImplementation((groupId, opts, callback) => {
        callback && callback();
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, jest.fn());

      expect(chrome.tabs.create).toHaveBeenCalledTimes(3);
      expect(chrome.tabs.group).toHaveBeenCalled();
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        999,
        expect.objectContaining({
          title: 'My Places',
          color: 'red',
          collapsed: true
        }),
        expect.any(Function)
      );
    });

    test('should refocus original tab after creating group', () => {
      const request = {
        action: 'openInGroup',
        urls: ['https://url1.com'],
        groupTitle: 'Test',
        groupColor: 'blue',
        collapsed: false
      };

      chrome.windows.getCurrent.mockImplementation((opts, callback) => {
        callback({ id: 1 });
      });

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 555 }]);
      });

      chrome.tabs.create.mockImplementation((opts, callback) => {
        callback({ id: 666 });
      });

      chrome.tabs.group.mockImplementation((opts, callback) => {
        callback(777);
      });

      chrome.tabGroups.update.mockImplementation((groupId, opts, callback) => {
        callback && callback();
      });

      listeners.onMessage[BASIC_ACTIONS_LISTENER](request, {}, jest.fn());

      expect(chrome.tabs.update).toHaveBeenCalledWith(555, { active: true });
    });
  });
});
