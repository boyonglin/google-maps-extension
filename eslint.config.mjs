import js from "@eslint/js";
import globals from "globals";

// The popup is a set of classic <script> tags (see popup.html): top-level
// class/const/function declarations in one file are referenced as bare
// identifiers from the others. This block documents that shared contract so
// no-undef can stay enabled everywhere.
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
  clearButton: "readonly",
  cancelButton: "readonly",
  deleteButton: "readonly",
  exportButton: "readonly",
  importButton: "readonly",
  fileInput: "readonly",
  apiButton: "readonly",
  sendButton: "readonly",
  enterButton: "readonly",
  clearButtonSummary: "readonly",
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

// Classic scripts loaded together by popup.html. Their top-level declarations
// intentionally form one shared lexical environment.
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

  // Baseline extension runtime. More specific blocks below describe the
  // popup's shared classic-script environment and the ES modules.
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

  // Popup classic scripts share top-level declarations across <script> tags.
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
      // Top-level declarations in these classic scripts are consumed by the
      // other <script> tags, so per-file "unused" is meaningless there.
      // Function/block scopes are still checked.
      "no-unused-vars": [
        "error",
        { vars: "local", argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  // ES modules: the service worker and everything it imports
  {
    files: extensionModuleFiles,
    languageOptions: {
      sourceType: "module",
    },
  },

  // Two ES modules expose CommonJS-only hooks when transformed under Jest.
  {
    files: ["Package/dist/hooks/backgroundState.js", "Package/dist/utils/analytics.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        exports: "readonly",
      },
    },
  },

  // inject.js publishes window.TME and then uses the corresponding global
  // binding. Other content-script boundaries use explicit window/globalThis.
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

  // ESM test files (must come after the tests block to win on sourceType)
  {
    files: ["tests/crypto.test.js", "tests/__mocks__/ExtPay.module.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
];
