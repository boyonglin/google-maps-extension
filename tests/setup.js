/**
 * Jest Setup File for Chrome Extension Testing
 */

global.crypto = {
  subtle: {
    generateKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = (i * 37 + 127) % 256;
    }
    return array;
  }),
  randomUUID: jest.fn(() => "mock-uuid-1234-5678-9abc-def012345678"),
};

global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
global.atob = (str) => Buffer.from(str, "base64").toString("binary");

const { TextEncoder, TextDecoder } = require("util");
const { createMockThemeUtils } = require("./testHelpers");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.chrome = {
  runtime: {
    id: "mock-extension-id",
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    lastError: null,
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
    getManifest: jest.fn(() => ({ version: "1.0.0" })),
    getPlatformInfo: jest.fn((callback) => callback && callback({ os: "win" })),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    sendMessage: jest.fn(),
    group: jest.fn(),
    onActivated: {
      addListener: jest.fn(),
    },
  },
  scripting: {
    executeScript: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    remove: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
    getAll: jest.fn((callback) => callback && callback([])),
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
    setIcon: jest.fn(),
  },
  windows: {
    getCurrent: jest.fn(),
  },
  tabGroups: {
    update: jest.fn(),
  },
  management: {
    getSelf: jest.fn(),
  },
  i18n: {
    getUILanguage: jest.fn(() => "en-US"),
    getMessage: jest.fn((key, substitutions) => {
      const messages = {
        searchHistorySubtitle: "Search History",
        favoriteListSubtitle: "Favorite List",
        geminiSummarySubtitle: "Gemini Summary",
        searchInputPlaceholder: "Search Google Maps",
        videoLabel: "Video Summary",
        geminiLabel: "Gemini Summary",
        historyLabel: "History",
        favoriteLabel: "Favorite",
        deleteLabel: "Delete",
        enterLabel: "Enter",
        shortcutsLabel: "Shortcuts",
        saveLabel: "Save",
        clearSummaryLabel: "Clear Summary",
        plusLabel: "Add to favorites",
        clearedUpMsg: "All cleared!",
        historyEmptyMsg: "No search history yet",
        favoriteEmptyMsg: "No favorites yet",
        geminiEmptyMsg: "No summary yet",
        geminiFirstMsg: "Please set your API key first",
        geminiLoadMsg: "Loading... Estimated time: NaN seconds",
        geminiErrorMsg: "An error occurred",
        geminiOverloadMsg: "Service is overloaded",
        apiPlaceholder: "Enter your API key",
        apiInvalidMsg: "Invalid API key",
        deleteBtnText: `Delete ${substitutions}`,
        deleteBtnTextEmpty: "Select items to delete",
        clearBtnText: "Clear",
        mapsBtnText: "Open Maps",
        cancelBtnText: "Cancel",
        exportBtnText: "Export",
        importBtnText: "Import",
        apiBtnText: "API",
        sendBtnText: "Send",
        aboutBtnText: "About",
        tipsBtnText: "Tips",
        premiumBtnText: "Premium",
        optionalBtnText: "Settings",
        shortcutsTitle: "Keyboard Shortcuts",
        premiumTitle: "Premium Features",
        optionalTitle: "Optional Settings",
        apiTitle: "API Settings",
        dirPlaceholder: "Enter starting address",
        dirTooltip: "Use right-click or shortcut to get directions from this starting point",
        authUserPlaceholder: "Enter authuser value",
        authUserTooltip: "Switch Google account: 0 / 1 / 2 ...",
        incognitoToggleText: "Incognito Mode",
        darkModeToggleText: "Enable Dark Mode",
        darkModeNote: "Toggle dark mode for the extension popup",
        importErrorMsg: "Import failed",
        openAll: "Open All",
        tidyLocations: "Tidy Locations",
        getDirections: "Get Directions",
        quickSearchKeyLabel: "Quick Search",
        searchBarKeyLabel: "Open Search Bar",
        autoAttachKeyLabel: "Auto Attach",
        directionsKeyLabel: "Directions",
        shortcutsNote: "Configure shortcuts in browser settings",
        premiumNote: "Premium features note",
        incognitoNote: "Summary and search history won't be kept",
        optionalFooterNote: "Hover over each setting to view its description.",
        apiNote: "Get your API key from Google AI Studio",
        autoAttachLabel: "Auto Attach",
        tidyLabel: "Tidy",
        moreLabel: "More",
        paymentLabel: "Purchase",
        restoreLabel: "Restore",
        firstNote: "First time note",
        trialNote: `Trial ends on ${substitutions}`,
        remindNote: "Trial reminder",
      };
      return messages[key] || key;
    }),
  },
};

global.mapsButton = {
  href: "",
};

global.ThemeUtils = createMockThemeUtils();

global.DOMUtils = {
  findClosestListItem: jest.fn((event) => {
    if (event.target.tagName === "LI") {
      return event.target;
    } else if (event.target.parentElement?.tagName === "LI") {
      return event.target.parentElement;
    }
    return null;
  }),
  animateFavoriteIcon: jest.fn((iconElement) => {
    iconElement.className = "bi bi-patch-check-fill matched spring-animation";
    setTimeout(() => {
      iconElement.classList.remove("spring-animation");
    }, 500);
  }),
  fadeOutFavoriteIcon: jest.fn((iconElement) => {
    iconElement.classList.add("unfavoriting");
    const restore = () => {
      iconElement.className = "bi bi-patch-plus-fill";
      iconElement.title = chrome.i18n.getMessage("plusLabel");
    };
    iconElement.addEventListener("mouseleave", restore, { once: true });
  }),
};

global.requestAnimationFrame = jest.fn((cb) => {
  cb();
  return 1;
});

global.requestIdleCallback = jest.fn((cb) => {
  cb();
  return 1;
});

beforeEach(() => {
  jest.clearAllMocks();
  global.chrome.runtime.lastError = null;
  global.mapsButton = { href: "" };

  // Restore crypto mocks (clearAllMocks removes subtle object)
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

  global.crypto.randomUUID = jest.fn(() => "mock-uuid-1234-5678-9abc-def012345678");

  global.requestAnimationFrame = jest.fn((cb) => {
    cb();
    return 1;
  });

  global.requestIdleCallback = jest.fn((cb) => {
    cb();
    return 1;
  });
});

const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    const firstArg = args[0];
    const errorString = String(firstArg);

    if (
      (typeof firstArg === "string" &&
        (firstArg.includes("Not implemented: HTMLFormElement.prototype.submit") ||
          firstArg.includes("Warning: ReactDOM.render") ||
          firstArg.includes("Not implemented: navigation"))) ||
      (firstArg instanceof Error &&
        (firstArg.message?.includes("Not implemented: navigation") ||
          firstArg.message?.includes("Not implemented: HTMLFormElement"))) ||
      errorString.includes("Not implemented: navigation")
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = jest.fn((...args) => {
    if (typeof args[0] === "string" && args[0].includes("componentWillReceiveProps")) {
      return;
    }
    originalWarn.call(console, ...args);
  });

  console.log = jest.fn((...args) => {
    const firstArg = String(args[0] ?? "");

    if (
      firstArg.includes("_____  _     ____") ||
      firstArg.includes("| |/|  / /\\  | |_)") ||
      firstArg.includes("Activated -") ||
      firstArg.includes("Deactivated -")
    ) {
      return;
    }
    originalLog.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});
