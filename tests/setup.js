/**
 * Jest Setup File for Chrome Extension Testing
 * This file configures the test environment for testing Chrome extension code
 */

// Mock Web Crypto API
global.crypto = {
  subtle: {
    generateKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = (i * 37 + 127) % 256;
    }
    return array;
  })
};

// Mock btoa and atob for Node.js environment
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock TextEncoder and TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    sendMessage: jest.fn()
  }
};

// Mock DOM elements that might be referenced in the code
global.mapsButton = {
  href: ''
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.chrome.runtime.lastError = null;
  global.mapsButton.href = '';
  
  // Restore crypto mocks after clearAllMocks
  // clearAllMocks removes the subtle object entirely, so we need to recreate it
  if (!global.crypto.subtle) {
    global.crypto.subtle = {};
  }
  
  global.crypto.subtle.generateKey = jest.fn();
  global.crypto.subtle.importKey = jest.fn();
  global.crypto.subtle.exportKey = jest.fn();
  global.crypto.subtle.encrypt = jest.fn();
  global.crypto.subtle.decrypt = jest.fn();
  
  global.crypto.getRandomValues = jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = (i * 37 + 127) % 256;
    }
    return array;
  });
});

// Console warnings/errors configuration
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress expected warnings in tests
  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
       args[0].includes('Warning: ReactDOM.render'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
