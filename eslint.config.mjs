import js from "@eslint/js";
import globals from "globals";

// Shared globals for classic <script> tags in popup.html
const popupSharedGlobals = {
  // Component constructors (top-level class declarations)
  State: "readonly",
  Remove: "readonly",
  Favorite: "readonly",
  History: "readonly",
  Gemini: "readonly",
  Modal: "readonly",
  Payment: "readonly",
  Onboarding: "readonly",
  ContextMenuUtil: "readonly",
  // Utility singletons published by utils/*.js
  DOMUtils: "readonly",
  ThemeUtils: "readonly",
  I18nUtils: "readonly",
  // Component instances + helpers declared at top level of popup.js
  state: "writable",
  remove: "writable",
  favorite: "writable",
  history: "writable",
  gemini: "writable",
  modal: "writable",
  payment: "writable",
  onboarding: "writable",
  applyTheme: "readonly",
  applyI18n: "readonly",
  getWarmState: "readonly",
  fetchData: "readonly",
  showPage: "readonly",
  checkTextOverflow: "readonly",
  measureContentSize: "readonly",
  measureContentSizeLast: "readonly",
  delayMeasurement: "readonly",
  retryMeasureContentSize: "readonly",
  configureElements: "readonly",
  // DOM element consts declared at top level of popup.js
  searchInput: "readonly",
  apiInput: "readonly",
  subtitleElement: "readonly",
  emptyMessage: "readonly",
  favoriteEmptyMessage: "readonly",
  geminiEmptyMessage: "readonly",
  dirInput: "readonly",
  authUserInput: "readonly",
  historyMaxInput: "readonly",
  incognitoToggle: "readonly",
  darkModeToggle: "readonly",
  responseField: "readonly",
  searchHistoryListContainer: "readonly",
  favoriteListContainer: "readonly",
  summaryListContainer: "readonly",
  searchHistoryButton: "readonly",
  favoriteListButton: "readonly",
  deleteListButton: "readonly",
  geminiSummaryButton: "readonly",
  videoSummaryButton: "readonly",
  searchButtonGroup: "readonly",
  deleteButtonGroup: "readonly",
  exportButtonGroup: "readonly",
  geminiButtonGroup: "readonly",
  clearButton: "readonly",
  undoButtonHistory: "readonly",
  cancelButton: "readonly",
  deleteButton: "readonly",
  exportButton: "readonly",
  importButton: "readonly",
  fileInput: "readonly",
  apiButton: "readonly",
  sendButton: "readonly",
  enterButton: "readonly",
  clearButtonSummary: "readonly",
  undoButtonSummary: "readonly",
  premiumModal: "readonly",
  closeButton: "readonly",
  optionalButton: "readonly",
  mapsButton: "readonly",
  paymentButton: "readonly",
  restoreButton: "readonly",
  shortcutTip: "readonly",
  premiumNoteElement: "readonly",
  searchHistoryUl: "readonly",
  favoriteUl: "readonly",
  clearButtonSpan: "readonly",
  cancelButtonSpan: "readonly",
  deleteButtonSpan: "readonly",
  mapsButtonSpan: "readonly",
  clearButtonSummarySpan: "readonly",
  sendButtonSpan: "readonly",
  paymentSpan: "readonly",
};

// Classic popup scripts
const popupClassicScriptFiles = [
  "Package/dist/themeInit.js",
  "Package/dist/utils/i18n.js",
  "Package/dist/utils/dom.js",
  "Package/dist/hooks/popupState.js",
  "Package/dist/utils/theme.js",
  "Package/dist/components/*.js",
  "Package/dist/utils/payment.js",
  "Package/dist/popup.js",
];

const extensionModuleFiles = [
  "Package/dist/background.js",
  "Package/dist/hooks/backgroundState.js",
  "Package/dist/utils/analytics.js",
  "Package/dist/utils/analytics.module.js",
  "Package/dist/utils/crypto.js",
  "Package/dist/utils/prompt.js",
];

export default [
  {
    ignores: [
      "Assets/**",
      "node_modules/**",
      "coverage/**",
      "Package/vendor/**",
      "Package/dist/utils/browser-polyfill.js",
      "Package/dist/utils/ExtPay.module.js",
      "Package/dist/popup.bundle.js",
      "**/*.min.js",
    ],
  },

  js.configs.recommended,

  {
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Shared identifiers are declared as globals above; declaring them in
      // their home file must not count as a redeclaration.
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },

  // Baseline extension runtime
  {
    files: ["Package/dist/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },

  // Popup classic scripts
  {
    files: popupClassicScriptFiles,
    languageOptions: {
      globals: {
        ...popupSharedGlobals,
        // CommonJS guards used only when Jest loads these scripts.
        module: "readonly",
      },
    },
    rules: {
      // Only check block scopes, unused globals are expected
      "no-unused-vars": [
        "error",
        { vars: "local", argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  // ES modules
  {
    files: extensionModuleFiles,
    languageOptions: {
      sourceType: "module",
    },
  },

  // CommonJS hooks for Jest
  {
    files: ["Package/dist/hooks/backgroundState.js", "Package/dist/utils/analytics.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        exports: "readonly",
      },
    },
  },

  // inject.js globals
  {
    files: ["Package/dist/inject.js"],
    languageOptions: {
      globals: {
        TME: "writable",
      },
    },
  },

  // Tests: Jest + Node + the same shared globals (assigned onto global)
  {
    files: ["tests/**/*.js", "jest.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        ...popupSharedGlobals,
        chrome: "writable",
      },
    },
  },

  // ESM test files
  {
    files: ["tests/crypto.test.js", "tests/__mocks__/ExtPay.module.js"],
    languageOptions: {
      sourceType: "module",
    },
  },

  // Node.js build scripts
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
];
