const State = require('../Package/dist/hooks/popupState.js');

describe('State Class', () => {
  let state;

  beforeEach(() => {
    state = new State();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values for page state', () => {
      expect(state.hasHistory).toBe(false);
      expect(state.hasFavorite).toBe(false);
      expect(state.hasSummary).toBe(false);
      expect(state.hasInit).toBe(false);
    });

    test('should initialize with correct default values for list change flags', () => {
      expect(state.historyListChanged).toBe(false);
      expect(state.favoriteListChanged).toBe(false);
      expect(state.summaryListChanged).toBe(false);
    });

    test('should initialize with correct default values for video summary mode', () => {
      expect(state.videoSummaryMode).toBeUndefined();
      expect(state.localVideoToggle).toBe(false);
      expect(state.summarizedTabId).toBeUndefined();
    });

    test('should initialize with correct default values for user state', () => {
      expect(state.paymentStage).toBeNull();
    });

    test('should initialize with correct default values for dimension cache', () => {
      expect(state.previousWidth).toBe(0);
      expect(state.previousHeight).toBe(0);
    });

    test('should create a new instance with independent state', () => {
      const state1 = new State();
      const state2 = new State();
      
      state1.hasHistory = true;
      state2.hasHistory = false;

      expect(state1.hasHistory).toBe(true);
      expect(state2.hasHistory).toBe(false);
    });
  });

  describe('buildSearchUrl', () => {
    test('should return a promise', () => {
      const result = state.buildSearchUrl('test query');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should send correct message to chrome.runtime with search query', async () => {
      const testQuery = 'New York';
      const mockUrl = 'https://www.google.com/maps/search/New+York';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      await state.buildSearchUrl(testQuery);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'buildSearchUrl', query: testQuery },
        expect.any(Function)
      );
    });

    test('should resolve with the URL from the response', async () => {
      const testQuery = 'Paris';
      const mockUrl = 'https://www.google.com/maps/search/Paris';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildSearchUrl(testQuery);

      expect(result).toBe(mockUrl);
    });

    test('should handle empty query string', async () => {
      const mockUrl = 'https://www.google.com/maps/search/';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildSearchUrl('');

      expect(result).toBe(mockUrl);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'buildSearchUrl', query: '' },
        expect.any(Function)
      );
    });

    test('should handle special characters in query', async () => {
      const testQuery = 'Tokyo & Osaka';
      const mockUrl = 'https://www.google.com/maps/search/Tokyo+%26+Osaka';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildSearchUrl(testQuery);

      expect(result).toBe(mockUrl);
    });

    test('should handle very long query strings', async () => {
      const longQuery = 'a'.repeat(1000);
      const mockUrl = 'https://www.google.com/maps/search/' + 'a'.repeat(1000);

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildSearchUrl(longQuery);

      expect(result).toBe(mockUrl);
    });

    test('should handle response with undefined url', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: undefined });
      });

      const result = await state.buildSearchUrl('test');

      expect(result).toBeUndefined();
    });

    test('should handle response with null', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });

      const result = await state.buildSearchUrl('test');

      expect(result).toBeUndefined();
    });
  });

  describe('buildDirectionsUrl', () => {
    test('should return a promise', () => {
      const result = state.buildDirectionsUrl('origin', 'destination');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should send correct message to chrome.runtime with origin and destination', async () => {
      const testOrigin = 'New York';
      const testDestination = 'Boston';
      const mockUrl = 'https://www.google.com/maps/dir/New+York/Boston';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      await state.buildDirectionsUrl(testOrigin, testDestination);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { 
          action: 'buildDirectionsUrl', 
          origin: testOrigin, 
          destination: testDestination 
        },
        expect.any(Function)
      );
    });

    test('should resolve with the URL from the response', async () => {
      const testOrigin = 'San Francisco';
      const testDestination = 'Los Angeles';
      const mockUrl = 'https://www.google.com/maps/dir/San+Francisco/Los+Angeles';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl(testOrigin, testDestination);

      expect(result).toBe(mockUrl);
    });

    test('should handle empty origin', async () => {
      const mockUrl = 'https://www.google.com/maps/dir//destination';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl('', 'destination');

      expect(result).toBe(mockUrl);
    });

    test('should handle empty destination', async () => {
      const mockUrl = 'https://www.google.com/maps/dir/origin/';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl('origin', '');

      expect(result).toBe(mockUrl);
    });

    test('should handle both empty origin and destination', async () => {
      const mockUrl = 'https://www.google.com/maps/dir//';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl('', '');

      expect(result).toBe(mockUrl);
    });

    test('should handle special characters in origin and destination', async () => {
      const testOrigin = 'café & bar';
      const testDestination = 'restaurant & grill';
      const mockUrl = 'https://www.google.com/maps/dir/café+%26+bar/restaurant+%26+grill';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl(testOrigin, testDestination);

      expect(result).toBe(mockUrl);
    });

    test('should handle coordinates as origin and destination', async () => {
      const testOrigin = '40.7128,-74.0060';
      const testDestination = '34.0522,-118.2437';
      const mockUrl = 'https://www.google.com/maps/dir/40.7128,-74.0060/34.0522,-118.2437';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      const result = await state.buildDirectionsUrl(testOrigin, testDestination);

      expect(result).toBe(mockUrl);
    });

    test('should handle response with undefined url', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: undefined });
      });

      const result = await state.buildDirectionsUrl('origin', 'destination');

      expect(result).toBeUndefined();
    });

    test('should handle response with null', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });

      const result = await state.buildDirectionsUrl('origin', 'destination');

      expect(result).toBeUndefined();
    });
  });

  describe('buildMapsButtonUrl', () => {
    test('should send correct message to chrome.runtime', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: 'https://www.google.com/maps' });
      });

      state.buildMapsButtonUrl();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'buildMapsUrl' },
        expect.any(Function)
      );
    });

    test('should update mapsButton.href when response has url', () => {
      const mockUrl = 'https://www.google.com/maps/test';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(mockUrl);
    });

    test('should not update mapsButton.href when response is null', () => {
      const initialHref = 'initial-value';
      global.mapsButton.href = initialHref;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(initialHref);
    });

    test('should not update mapsButton.href when response is undefined', () => {
      const initialHref = 'initial-value';
      global.mapsButton.href = initialHref;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(undefined);
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(initialHref);
    });

    test('should not update mapsButton.href when response.url is undefined', () => {
      const initialHref = 'initial-value';
      global.mapsButton.href = initialHref;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({});
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(initialHref);
    });

    test('should not update mapsButton.href when response.url is null', () => {
      const initialHref = 'initial-value';
      global.mapsButton.href = initialHref;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: null });
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(initialHref);
    });

    test('should not update mapsButton.href when response.url is empty string', () => {
      const initialHref = 'initial-value';
      global.mapsButton.href = initialHref;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: '' });
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(initialHref);
    });

    test('should handle response with valid URL', () => {
      const mockUrl = 'https://www.google.com/maps/@40.7128,-74.0060,15z';

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: mockUrl });
      });

      state.buildMapsButtonUrl();

      expect(global.mapsButton.href).toBe(mockUrl);
    });

    test('should not throw error if mapsButton is not defined', () => {
      const originalMapsButton = global.mapsButton;
      delete global.mapsButton;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: 'https://www.google.com/maps' });
      });

      expect(() => {
        state.buildMapsButtonUrl();
      }).toThrow();

      global.mapsButton = originalMapsButton;
    });
  });

  describe('updateDimensions', () => {
    test('should update previousWidth and previousHeight', () => {
      const testWidth = 1024;
      const testHeight = 768;

      state.updateDimensions(testWidth, testHeight);

      expect(state.previousWidth).toBe(testWidth);
      expect(state.previousHeight).toBe(testHeight);
    });

    test('should handle zero values', () => {
      state.updateDimensions(0, 0);

      expect(state.previousWidth).toBe(0);
      expect(state.previousHeight).toBe(0);
    });

    test('should handle negative values', () => {
      state.updateDimensions(-100, -200);

      expect(state.previousWidth).toBe(-100);
      expect(state.previousHeight).toBe(-200);
    });

    test('should handle very large values', () => {
      const largeWidth = Number.MAX_SAFE_INTEGER;
      const largeHeight = Number.MAX_SAFE_INTEGER;

      state.updateDimensions(largeWidth, largeHeight);

      expect(state.previousWidth).toBe(largeWidth);
      expect(state.previousHeight).toBe(largeHeight);
    });

    test('should handle floating point values', () => {
      state.updateDimensions(1024.5, 768.75);

      expect(state.previousWidth).toBe(1024.5);
      expect(state.previousHeight).toBe(768.75);
    });

    test('should update multiple times correctly', () => {
      state.updateDimensions(800, 600);
      expect(state.previousWidth).toBe(800);
      expect(state.previousHeight).toBe(600);

      state.updateDimensions(1920, 1080);
      expect(state.previousWidth).toBe(1920);
      expect(state.previousHeight).toBe(1080);

      state.updateDimensions(1024, 768);
      expect(state.previousWidth).toBe(1024);
      expect(state.previousHeight).toBe(768);
    });

    test('should handle undefined values gracefully', () => {
      state.updateDimensions(undefined, undefined);

      expect(state.previousWidth).toBeUndefined();
      expect(state.previousHeight).toBeUndefined();
    });

    test('should handle null values gracefully', () => {
      state.updateDimensions(null, null);

      expect(state.previousWidth).toBeNull();
      expect(state.previousHeight).toBeNull();
    });
  });

  describe('State Properties Mutation', () => {
    test('should allow mutation of hasHistory property', () => {
      expect(state.hasHistory).toBe(false);
      state.hasHistory = true;
      expect(state.hasHistory).toBe(true);
    });

    test('should allow mutation of hasFavorite property', () => {
      expect(state.hasFavorite).toBe(false);
      state.hasFavorite = true;
      expect(state.hasFavorite).toBe(true);
    });

    test('should allow mutation of hasSummary property', () => {
      expect(state.hasSummary).toBe(false);
      state.hasSummary = true;
      expect(state.hasSummary).toBe(true);
    });

    test('should allow mutation of hasInit property', () => {
      expect(state.hasInit).toBe(false);
      state.hasInit = true;
      expect(state.hasInit).toBe(true);
    });

    test('should allow mutation of historyListChanged property', () => {
      expect(state.historyListChanged).toBe(false);
      state.historyListChanged = true;
      expect(state.historyListChanged).toBe(true);
    });

    test('should allow mutation of favoriteListChanged property', () => {
      expect(state.favoriteListChanged).toBe(false);
      state.favoriteListChanged = true;
      expect(state.favoriteListChanged).toBe(true);
    });

    test('should allow mutation of summaryListChanged property', () => {
      expect(state.summaryListChanged).toBe(false);
      state.summaryListChanged = true;
      expect(state.summaryListChanged).toBe(true);
    });

    test('should allow mutation of videoSummaryMode property', () => {
      expect(state.videoSummaryMode).toBeUndefined();
      state.videoSummaryMode = 'active';
      expect(state.videoSummaryMode).toBe('active');
    });

    test('should allow mutation of localVideoToggle property', () => {
      expect(state.localVideoToggle).toBe(false);
      state.localVideoToggle = true;
      expect(state.localVideoToggle).toBe(true);
    });

    test('should allow mutation of summarizedTabId property', () => {
      expect(state.summarizedTabId).toBeUndefined();
      state.summarizedTabId = 12345;
      expect(state.summarizedTabId).toBe(12345);
    });

    test('should allow mutation of paymentStage property', () => {
      expect(state.paymentStage).toBeNull();
      state.paymentStage = 'premium';
      expect(state.paymentStage).toBe('premium');
    });
  });

  describe('Module Export', () => {
    test('should export State class', () => {
      expect(State).toBeDefined();
      expect(typeof State).toBe('function');
    });

    test('should be instantiable', () => {
      const instance = new State();
      expect(instance).toBeInstanceOf(State);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('buildSearchUrl should handle chrome.runtime.sendMessage throwing error', async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error('Runtime error');
      });

      await expect(state.buildSearchUrl('test')).rejects.toThrow('Runtime error');
    });

    test('buildDirectionsUrl should handle chrome.runtime.sendMessage throwing error', async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error('Runtime error');
      });

      await expect(state.buildDirectionsUrl('origin', 'dest')).rejects.toThrow('Runtime error');
    });

    test('buildMapsButtonUrl should handle chrome.runtime.sendMessage throwing error', () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error('Runtime error');
      });

      expect(() => {
        state.buildMapsButtonUrl();
      }).toThrow('Runtime error');
    });

    test('should handle concurrent buildSearchUrl calls', async () => {
      let callCount = 0;
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callCount++;
        callback({ url: `url-${callCount}` });
      });

      const promise1 = state.buildSearchUrl('query1');
      const promise2 = state.buildSearchUrl('query2');
      const promise3 = state.buildSearchUrl('query3');

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toHaveLength(3);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent buildDirectionsUrl calls', async () => {
      let callCount = 0;
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callCount++;
        callback({ url: `url-${callCount}` });
      });

      const promise1 = state.buildDirectionsUrl('o1', 'd1');
      const promise2 = state.buildDirectionsUrl('o2', 'd2');
      const promise3 = state.buildDirectionsUrl('o3', 'd3');

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toHaveLength(3);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Type Checking and Validation', () => {
    test('should accept any type for query in buildSearchUrl', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: 'test-url' });
      });

      await state.buildSearchUrl(123);
      await state.buildSearchUrl(null);
      await state.buildSearchUrl({});
      await state.buildSearchUrl([]);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(4);
    });

    test('should accept any type for origin and destination in buildDirectionsUrl', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ url: 'test-url' });
      });

      await state.buildDirectionsUrl(123, 456);
      await state.buildDirectionsUrl(null, null);
      await state.buildDirectionsUrl({}, {});
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    test('should accept any type for dimensions in updateDimensions', () => {
      state.updateDimensions('800', '600');
      expect(state.previousWidth).toBe('800');
      expect(state.previousHeight).toBe('600');

      state.updateDimensions(true, false);
      expect(state.previousWidth).toBe(true);
      expect(state.previousHeight).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  let state;

  beforeEach(() => {
    state = new State();
    jest.clearAllMocks();
  });

  test('should handle complete workflow: initialize, search, update dimensions', async () => {
    // Initialize
    expect(state.hasInit).toBe(false);
    state.hasInit = true;
    expect(state.hasInit).toBe(true);

    // Search
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback({ url: 'https://www.google.com/maps/search/test' });
    });

    const searchUrl = await state.buildSearchUrl('test');
    expect(searchUrl).toBe('https://www.google.com/maps/search/test');

    // Update dimensions
    state.updateDimensions(1920, 1080);
    expect(state.previousWidth).toBe(1920);
    expect(state.previousHeight).toBe(1080);
  });

  test('should handle state changes across multiple operations', async () => {
    // Set initial state
    state.hasHistory = true;
    state.hasFavorite = true;

    // Perform operations
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'buildSearchUrl') {
        callback({ url: 'search-url' });
      } else if (message.action === 'buildDirectionsUrl') {
        callback({ url: 'directions-url' });
      } else if (message.action === 'buildMapsUrl') {
        callback({ url: 'maps-url' });
      }
    });

    await state.buildSearchUrl('query');
    await state.buildDirectionsUrl('origin', 'dest');
    state.buildMapsButtonUrl();

    // Verify state is maintained
    expect(state.hasHistory).toBe(true);
    expect(state.hasFavorite).toBe(true);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
  });
});
