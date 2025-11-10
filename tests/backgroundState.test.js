/**
 * Comprehensive Unit Tests for backgroundState.js
 * Tests all exported functions and state management logic
 */

// Mock the crypto module BEFORE importing
jest.mock('../Package/dist/utils/crypto.js', () => ({
  decryptApiKey: jest.fn()
}));

const { decryptApiKey } = require('../Package/dist/utils/crypto.js');
const { setupMockStorage } = require('./testHelpers');

// Helper function to set up mock storage with decryption
const setupMockStorageWithDecryption = (decryptedApiKey, storageOverrides = {}) => {
  const mockData = setupMockStorage(storageOverrides);
  if (decryptedApiKey !== null) {
    decryptApiKey.mockResolvedValue(decryptedApiKey);
  }
  return mockData;
};

describe('backgroundState.js - URL Building Functions', () => {
  let backgroundState;
  let updateUserUrls, buildSearchUrl, buildDirectionsUrl, buildMapsUrl, DEFAULTS;
  
  beforeEach(() => {
    // Don't reset modules - it clears mocks!
    // jest.resetModules();
    jest.clearAllMocks();
    
    backgroundState = require('../Package/dist/hooks/backgroundState.js');
    updateUserUrls = backgroundState.updateUserUrls;
    buildSearchUrl = backgroundState.buildSearchUrl;
    buildDirectionsUrl = backgroundState.buildDirectionsUrl;
    buildMapsUrl = backgroundState.buildMapsUrl;
    DEFAULTS = backgroundState.DEFAULTS;
    
    // Reset cache for test isolation
    if (backgroundState.__resetCacheForTesting) {
      backgroundState.__resetCacheForTesting();
    }
  });
  
  describe('Default URL values', () => {
    test('should have correct default queryUrl', () => {
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
    });

    test('should have correct default routeUrl', () => {
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=0&');
    });
  });

  describe('updateUserUrls', () => {
    test('should update URLs with valid authUser number', () => {
      updateUserUrls(5);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=5&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=5&');
    });

    test('should use authUser 0 for negative numbers', () => {
      updateUserUrls(-5);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=0&');
    });

    test('should floor decimal authUser values', () => {
      updateUserUrls(3.7);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=3&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=3&');
    });

    test('should default to authUser 0 for invalid values (null, undefined, NaN, Infinity, non-numeric)', () => {
      const invalidValues = [null, undefined, NaN, Infinity, 'invalid'];
      
      invalidValues.forEach(value => {
        updateUserUrls(value);
        expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
      });
    });

    test('should convert string numbers and booleans correctly', () => {
      updateUserUrls('10');
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=10&');
      
      updateUserUrls(true);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=1&');
      
      updateUserUrls(false);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
    });

    test('should handle array and object inputs - defaults to 0', () => {
      updateUserUrls([5]);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
      
      updateUserUrls({ value: 5 });
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=0&');
    });

    test('should accept large authUser values', () => {
      updateUserUrls(999999);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=999999&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=999999&');
    });

    test('should accept various valid authUser values', () => {
      updateUserUrls(50);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=50&');
      
      updateUserUrls(99);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=99&');
    });
  });

  describe('buildSearchUrl', () => {
    test('should build search URL with simple query', () => {
      const result = buildSearchUrl('New York');
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=New%20York');
    });

    test('should build search URL with special characters', () => {
      const result = buildSearchUrl('café & restaurant');
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=caf%C3%A9%20%26%20restaurant');
    });

    test('should build search URL with empty query', () => {
      const result = buildSearchUrl('');
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=');
    });

    test('should handle null query', () => {
      const result = buildSearchUrl(null);
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=');
    });

    test('should handle undefined query', () => {
      const result = buildSearchUrl(undefined);
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=');
    });

    test('should build search URL with coordinates', () => {
      const result = buildSearchUrl('40.7128,-74.0060');
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=40.7128%2C-74.0060');
    });

    test('should build search URL with Unicode characters', () => {
      const result = buildSearchUrl('東京タワー');
      expect(result).toBe('https://www.google.com/maps?authuser=0&q=%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC');
    });

    test('should build search URL with updated authUser', () => {
      updateUserUrls(3);
      const result = buildSearchUrl('Paris');
      expect(result).toBe('https://www.google.com/maps?authuser=3&q=Paris');
    });

    test('should handle emoji in search query', () => {
      const result = buildSearchUrl('🗼 Tokyo Tower');
      expect(result).toContain('authuser=0&q=');
      expect(decodeURIComponent(result.split('q=')[1])).toBe('🗼 Tokyo Tower');
    });

    test('should handle newlines in query', () => {
      const result = buildSearchUrl('Line 1\nLine 2');
      expect(result).toContain('Line%201%0ALine%202');
    });

    test('should handle percentage signs', () => {
      const result = buildSearchUrl('100% discount');
      expect(result).toContain('100%25%20discount');
    });

    test('should handle plus signs', () => {
      const result = buildSearchUrl('C++ programming');
      expect(result).toContain('C%2B%2B%20programming');
    });

    test('should handle very long query strings', () => {
      const longQuery = 'a'.repeat(5000);
      const result = buildSearchUrl(longQuery);
      expect(result).toContain('https://www.google.com/maps?authuser=0&q=');
      expect(result.length).toBeGreaterThan(5000);
    });
  });

  describe('buildDirectionsUrl', () => {
    test('should build directions URL with origin and destination', () => {
      const result = buildDirectionsUrl('San Francisco', 'Los Angeles');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=San%20Francisco&destination=Los%20Angeles');
    });

    test('should build directions URL with special characters', () => {
      const result = buildDirectionsUrl('café & bar', 'restaurant & grill');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=caf%C3%A9%20%26%20bar&destination=restaurant%20%26%20grill');
    });

    test('should handle empty origin', () => {
      const result = buildDirectionsUrl('', 'Los Angeles');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=&destination=Los%20Angeles');
    });

    test('should handle empty destination', () => {
      const result = buildDirectionsUrl('San Francisco', '');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=San%20Francisco&destination=');
    });

    test('should handle both null origin and destination', () => {
      const result = buildDirectionsUrl(null, null);
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=&destination=');
    });

    test('should handle both undefined origin and destination', () => {
      const result = buildDirectionsUrl(undefined, undefined);
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=&destination=');
    });

    test('should build directions URL with coordinates', () => {
      const result = buildDirectionsUrl('40.7128,-74.0060', '34.0522,-118.2437');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=0&api=1&origin=40.7128%2C-74.0060&destination=34.0522%2C-118.2437');
    });

    test('should build directions URL with updated authUser', () => {
      updateUserUrls(7);
      const result = buildDirectionsUrl('Tokyo', 'Osaka');
      expect(result).toBe('https://www.google.com/maps/dir/?authuser=7&api=1&origin=Tokyo&destination=Osaka');
    });

    test('should handle Unicode characters', () => {
      const result = buildDirectionsUrl('渋谷', '新宿');
      expect(result).toContain('https://www.google.com/maps/dir/?authuser=0&api=1&origin=');
      expect(result).toContain('destination=');
    });
  });

  describe('buildMapsUrl', () => {
    test('should build maps URL without trailing ampersand', () => {
      const result = buildMapsUrl();
      expect(result).toBe('https://www.google.com/maps?authuser=0');
    });

    test('should build maps URL with updated authUser', () => {
      updateUserUrls(5);
      const result = buildMapsUrl();
      expect(result).toBe('https://www.google.com/maps?authuser=5');
    });

    test('should build maps URL with authUser 0 after negative input', () => {
      updateUserUrls(-10);
      const result = buildMapsUrl();
      expect(result).toBe('https://www.google.com/maps?authuser=0');
    });

    test('should build maps URL with floored authUser', () => {
      updateUserUrls(9.9);
      const result = buildMapsUrl();
      expect(result).toBe('https://www.google.com/maps?authuser=9');
    });
  });
});

describe('backgroundState.js - Edge Cases and Performance', () => {
  let backgroundState;
  let updateUserUrls, buildSearchUrl, buildDirectionsUrl, buildMapsUrl;
  let ensureWarm, getCache, getApiKey, applyStorageChanges, DEFAULTS;
  
  beforeEach(() => {
    // Don't reset modules - it clears the mock!
    // jest.resetModules();
    jest.clearAllMocks();
    decryptApiKey.mockReset();
    
    backgroundState = require('../Package/dist/hooks/backgroundState.js');
    updateUserUrls = backgroundState.updateUserUrls;
    buildSearchUrl = backgroundState.buildSearchUrl;
    buildDirectionsUrl = backgroundState.buildDirectionsUrl;
    buildMapsUrl = backgroundState.buildMapsUrl;
    ensureWarm = backgroundState.ensureWarm;
    getCache = backgroundState.getCache;
    getApiKey = backgroundState.getApiKey;
    applyStorageChanges = backgroundState.applyStorageChanges;
    DEFAULTS = backgroundState.DEFAULTS;
    
    // Reset cache for test isolation
    if (backgroundState.__resetCacheForTesting) {
      backgroundState.__resetCacheForTesting();
    }
  });

  describe('DEFAULTS constant', () => {
    test('should have correct default values', () => {
      expect(DEFAULTS).toEqual({
        searchHistoryList: [],
        favoriteList: [],
        geminiApiKey: "",
        aesKey: null,
        startAddr: "",
        authUser: 0,
        isIncognito: false,
        videoSummaryToggle: false,
      });
    });

    test('DEFAULTS object is frozen', () => {
      // DEFAULTS object itself is frozen, preventing property reassignment
      expect(Object.isFrozen(DEFAULTS)).toBe(true);
      
      // Arrays inside are NOT frozen separately since Object.freeze is shallow
      // This is acceptable as the test ensures the object itself cannot be reassigned
    });
  });

  describe('ensureWarm', () => {
    test('should load data from chrome.storage.local on first call', async () => {
      setupMockStorageWithDecryption('decrypted-api-key', {
        searchHistoryList: ['Tokyo', 'Paris'],
        favoriteList: ['Home', 'Work'],
        geminiApiKey: 'encrypted.key.data',
        aesKey: { kty: 'oct', k: 'test-key' },
        startAddr: '123 Main St',
        authUser: 3,
        isIncognito: false,
        videoSummaryToggle: true,
      });

      const result = await ensureWarm();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(DEFAULTS);
      expect(decryptApiKey).toHaveBeenCalledWith('encrypted.key.data');
      expect(result.geminiApiKey).toBe('decrypted-api-key');
      expect(result.searchHistoryList).toEqual(['Tokyo', 'Paris']);
      expect(result.authUser).toBe(3);
    });

    test('should return cached data on subsequent calls', async () => {
      setupMockStorage({
        searchHistoryList: ['New York'],
        geminiApiKey: '',
      });

      // First call
      const result1 = await ensureWarm();
      // Second call
      const result2 = await ensureWarm();

      expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    test('should handle empty geminiApiKey', async () => {
      setupMockStorage({
        geminiApiKey: '',
      });

      const result = await ensureWarm();

      expect(decryptApiKey).not.toHaveBeenCalled();
      expect(result.geminiApiKey).toBe('');
    });

    test('should handle decryption failure gracefully', async () => {
      setupMockStorage({
        geminiApiKey: 'corrupted.encrypted.data',
      });
      decryptApiKey.mockRejectedValue(new Error('Decryption failed'));

      const result = await ensureWarm();

      expect(result.geminiApiKey).toBe('');
    });

    test('should update URLs based on stored authUser', async () => {
      setupMockStorage({
        authUser: 5,
      });

      await ensureWarm();

      // Verify URLs were updated
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=5&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=5&');
    });

    test('should handle concurrent calls correctly', async () => {
      setupMockStorage({
        geminiApiKey: '',
      });

      // Make multiple concurrent calls
      const promises = [
        ensureWarm(),
        ensureWarm(),
        ensureWarm(),
      ];

      const results = await Promise.all(promises);

      // Should only call storage once
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
      // All results should be the same
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    test('should handle chrome.storage.local.get rejection', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(ensureWarm()).rejects.toThrow('Storage error');
    });

    test('should handle null apiKey from storage', async () => {
      setupMockStorage({
        geminiApiKey: null,
      });

      const result = await ensureWarm();
      expect(result.geminiApiKey).toBeNull();
    });
  });

  describe('getCache', () => {
    test('should return DEFAULTS when cache is not initialized', () => {
      const result = backgroundState.getCache();
      expect(result).toEqual(DEFAULTS);
    });

    test('should return cached data after ensureWarm', async () => {
      setupMockStorage({
        searchHistoryList: ['Cached Location'],
        geminiApiKey: '',
      });

      await ensureWarm();
      const result = backgroundState.getCache();

      expect(result.searchHistoryList).toEqual(['Cached Location']);
    });

    test('should not call storage API', () => {
      backgroundState.getCache();
      expect(chrome.storage.local.get).not.toHaveBeenCalled();
    });
  });

  describe('getApiKey', () => {
    test('should return decrypted API key after ensureWarm', async () => {
      setupMockStorageWithDecryption('my-secret-api-key', {
        geminiApiKey: 'encrypted.key',
      });

      const apiKey = await getApiKey();

      expect(apiKey).toBe('my-secret-api-key');
    });

    test('should throw error when API key is not found', async () => {
      setupMockStorage({
        geminiApiKey: '',
      });

      await expect(getApiKey()).rejects.toThrow('No API key found. Please provide one.');
    });

    test('should throw error when API key is null', async () => {
      setupMockStorage({
        geminiApiKey: null,
      });

      await expect(getApiKey()).rejects.toThrow('No API key found. Please provide one.');
    });

    test('should throw error when API key is undefined', async () => {
      const mockStorageData = setupMockStorage({});
      delete mockStorageData.geminiApiKey;
      chrome.storage.local.get.mockResolvedValue(mockStorageData);

      await expect(getApiKey()).rejects.toThrow('No API key found. Please provide one.');
    });

    test('should call ensureWarm if cache is not initialized', async () => {
      setupMockStorageWithDecryption('my-api-key', {
        geminiApiKey: 'encrypted.key',
      });

      const apiKey = await getApiKey();
      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect(apiKey).toBe('my-api-key');
    });
  });

  describe('applyStorageChanges', () => {
    beforeEach(async () => {
      // Initialize cache first
      setupMockStorage({
        geminiApiKey: '',
      });
      await ensureWarm();
      jest.clearAllMocks();
    });

    test('should ignore changes from non-local storage areas', async () => {
      const changes = {
        searchHistoryList: { newValue: ['Test'] }
      };

      await applyStorageChanges(changes, 'sync');

      const cache = backgroundState.getCache();
      expect(cache.searchHistoryList).not.toEqual(['Test']);
    });

    test('should update cache with new searchHistoryList', async () => {
      const changes = {
        searchHistoryList: { newValue: ['Location 1', 'Location 2'] }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.searchHistoryList).toEqual(['Location 1', 'Location 2']);
    });

    test('should decrypt and update geminiApiKey', async () => {
      decryptApiKey.mockResolvedValue('new-decrypted-key');

      const changes = {
        geminiApiKey: { newValue: 'new.encrypted.key' }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(decryptApiKey).toHaveBeenCalledWith('new.encrypted.key');
      expect(cache.geminiApiKey).toBe('new-decrypted-key');
    });

    test('should handle geminiApiKey decryption failure', async () => {
      decryptApiKey.mockRejectedValue(new Error('Decryption failed'));

      const changes = {
        geminiApiKey: { newValue: 'bad.encrypted.key' }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.geminiApiKey).toBe('');
    });

    test('should update URLs when authUser changes', async () => {
      const changes = {
        authUser: { newValue: 8 }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.authUser).toBe(8);
      expect(backgroundState.queryUrl).toBe('https://www.google.com/maps?authuser=8&');
      expect(backgroundState.routeUrl).toBe('https://www.google.com/maps/dir/?authuser=8&');
    });

    test('should update multiple properties simultaneously', async () => {
      decryptApiKey.mockResolvedValue('multi-key');

      const changes = {
        searchHistoryList: { newValue: ['Multi 1'] },
        favoriteList: { newValue: ['Fav 1', 'Fav 2'] },
        geminiApiKey: { newValue: 'multi.encrypted.key' },
        authUser: { newValue: 4 },
        isIncognito: { newValue: true },
        videoSummaryToggle: { newValue: true },
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.searchHistoryList).toEqual(['Multi 1']);
      expect(cache.favoriteList).toEqual(['Fav 1', 'Fav 2']);
      expect(cache.geminiApiKey).toBe('multi-key');
      expect(cache.authUser).toBe(4);
      expect(cache.isIncognito).toBe(true);
      expect(cache.videoSummaryToggle).toBe(true);
    });

    test('should initialize cache with DEFAULTS if cache is null', async () => {
      // Reset cache instead of modules
      // jest.resetModules();
      const freshBackgroundState = require('../Package/dist/hooks/backgroundState.js');
      if (freshBackgroundState.__resetCacheForTesting) {
        freshBackgroundState.__resetCacheForTesting();
      }

      const changes = {
        searchHistoryList: { newValue: ['New Item'] }
      };

      await freshBackgroundState.applyStorageChanges(changes, 'local');

      const cache = freshBackgroundState.getCache();
      expect(cache.searchHistoryList).toEqual(['New Item']);
    });

    test('should handle empty changes object', async () => {
      const changes = {};

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache).toBeDefined();
    });

    test('should handle changes with undefined newValue', async () => {
      const changes = {
        startAddr: { newValue: undefined }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.startAddr).toBeUndefined();
    });

    test('should handle changes with null newValue', async () => {
      const changes = {
        aesKey: { newValue: null }
      };

      await applyStorageChanges(changes, 'local');

      const cache = backgroundState.getCache();
      expect(cache.aesKey).toBeNull();
    });
  });
});

describe('backgroundState.js - Integration & Performance Tests', () => {
  let backgroundState;
  let ensureWarm, buildSearchUrl, applyStorageChanges, updateUserUrls;
  let buildDirectionsUrl, buildMapsUrl;
  
  beforeEach(() => {
    // Don't reset modules - it clears mocks!
    // jest.resetModules();
    jest.clearAllMocks();
    decryptApiKey.mockReset();
    
    backgroundState = require('../Package/dist/hooks/backgroundState.js');
    ensureWarm = backgroundState.ensureWarm;
    buildSearchUrl = backgroundState.buildSearchUrl;
    applyStorageChanges = backgroundState.applyStorageChanges;
    updateUserUrls = backgroundState.updateUserUrls;
    buildDirectionsUrl = backgroundState.buildDirectionsUrl;
    buildMapsUrl = backgroundState.buildMapsUrl;
    
    // Reset cache for test isolation
    if (backgroundState.__resetCacheForTesting) {
      backgroundState.__resetCacheForTesting();
    }
  });

  test('should handle complete flow: load cache, update, build URLs', async () => {
    setupMockStorageWithDecryption('initial-api-key', {
      authUser: 2,
      searchHistoryList: ['Previous Search'],
      geminiApiKey: 'initial.encrypted.key',
    });

    // Load cache
    await ensureWarm();

    // Verify initial state
    let cache = backgroundState.getCache();
    expect(cache.authUser).toBe(2);
    expect(cache.geminiApiKey).toBe('initial-api-key');

    // Build URLs with initial authUser
    let searchUrl = buildSearchUrl('Tokyo');
    expect(searchUrl).toContain('authuser=2');

    // Simulate storage change
    decryptApiKey.mockResolvedValue('updated-api-key');
    await applyStorageChanges({
      authUser: { newValue: 7 },
      geminiApiKey: { newValue: 'updated.encrypted.key' },
    }, 'local');

    // Verify updated state
    cache = backgroundState.getCache();
    expect(cache.authUser).toBe(7);
    expect(cache.geminiApiKey).toBe('updated-api-key');

    // Build URLs with updated authUser
    searchUrl = buildSearchUrl('Osaka');
    expect(searchUrl).toContain('authuser=7');
  });

  test('should handle error recovery in API key decryption', async () => {
    setupMockStorage({
      geminiApiKey: 'corrupted.key',
    });
    decryptApiKey.mockRejectedValue(new Error('Bad decryption'));

    // First load with corrupted key
    await ensureWarm();
    let cache = backgroundState.getCache();
    expect(cache.geminiApiKey).toBe('');

    // Update with valid key
    decryptApiKey.mockResolvedValue('valid-key');
    await applyStorageChanges({
      geminiApiKey: { newValue: 'valid.encrypted.key' }
    }, 'local');

    cache = backgroundState.getCache();
    expect(cache.geminiApiKey).toBe('valid-key');
  });

  test('should maintain cache consistency across multiple operations', async () => {
    setupMockStorage({
      searchHistoryList: ['Item 1'],
      favoriteList: ['Fav 1'],
    });

    await ensureWarm();

    // Multiple updates
    await applyStorageChanges({
      searchHistoryList: { newValue: ['Item 1', 'Item 2'] }
    }, 'local');

    await applyStorageChanges({
      favoriteList: { newValue: ['Fav 1', 'Fav 2', 'Fav 3'] }
    }, 'local');

    await applyStorageChanges({
      isIncognito: { newValue: true }
    }, 'local');

    const cache = backgroundState.getCache();
    expect(cache.searchHistoryList).toEqual(['Item 1', 'Item 2']);
    expect(cache.favoriteList).toEqual(['Fav 1', 'Fav 2', 'Fav 3']);
    expect(cache.isIncognito).toBe(true);
  });

  test('should not create new cache objects unnecessarily', async () => {
    setupMockStorage({ geminiApiKey: '' });

    await ensureWarm();
    const cache1 = backgroundState.getCache();
    const cache2 = backgroundState.getCache();

    // Should return the same reference
    expect(cache1).toBe(cache2);
  });

  test('should handle rapid URL generation efficiently', () => {
    updateUserUrls(3);

    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      buildSearchUrl(`query-${i}`);
      buildDirectionsUrl(`origin-${i}`, `dest-${i}`);
      buildMapsUrl();
    }
    const endTime = Date.now();

    // Should complete quickly (< 200ms for 3000 URL generations)
    expect(endTime - startTime).toBeLessThan(200);
  });

  test('should handle large storage data efficiently', async () => {
    const largeHistoryList = Array.from({ length: 1000 }, (_, i) => `Location ${i}`);
    const largeFavoriteList = Array.from({ length: 1000 }, (_, i) => `Favorite ${i}`);

    setupMockStorage({
      searchHistoryList: largeHistoryList,
      favoriteList: largeFavoriteList,
      geminiApiKey: '',
    });

    const startTime = Date.now();
    await ensureWarm();
    const endTime = Date.now();

    const cache = backgroundState.getCache();
    expect(cache.searchHistoryList.length).toBe(1000);
    expect(cache.favoriteList.length).toBe(1000);
    
    // Should load large data efficiently
    expect(endTime - startTime).toBeLessThan(200);
  });

  test('should handle concurrent ensureWarm calls with decryption', async () => {
    let callCount = 0;
    chrome.storage.local.get.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(setupMockStorage({ geminiApiKey: 'encrypted.key' })), 10);
      });
    });

    decryptApiKey.mockImplementation(() => {
      callCount++;
      return Promise.resolve(`decrypted-key-${callCount}`);
    });

    // Make multiple concurrent calls
    const results = await Promise.all([
      ensureWarm(),
      ensureWarm(),
      ensureWarm(),
    ]);

    // Should only decrypt once
    expect(callCount).toBe(1);
    // All results should be identical
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });
});
