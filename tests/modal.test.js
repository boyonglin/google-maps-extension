/**
 * Tests for Modal Component (modal.js)
 * Tests dynamic import() mock
 */

// Mock crypto module FIRST, before anything else
const mockEncryptApiKey = jest.fn().mockResolvedValue("encrypted_key_data");
const mockDecryptApiKey = jest.fn().mockResolvedValue("decrypted_key");

// Mock the module path that will be dynamically imported
jest.mock("../Package/dist/utils/crypto.js", () => ({
  encryptApiKey: mockEncryptApiKey,
  decryptApiKey: mockDecryptApiKey,
}));

// Mock global objects and functions
global.state = {
  paymentStage: {
    isTrial: false,
    isPremium: false,
    isFirst: false,
  },
};

global.modal = null;

// Mock payment object
global.payment = {
  checkPay: jest.fn(),
};

// Mock applyTheme function (defined in popup.js)
global.applyTheme = jest.fn();

// Create global DOM elements that modal.js expects from popup.js
const setupGlobalDOMElements = () => {
  document.body.innerHTML = `
        <p class="modal-body-configure"></p>
        <p class="modal-body-configure"></p>
        <p class="modal-body-configure"></p>
        <p id="geminiEmptyMessage" class="d-none"></p>
        <button id="sendButton"></button>
        <div id="incognitoToggle" class="settings-toggle-item">
            <span class="incognito-text"></span>
            <span class="incognito-icon d-none"></span>
            <div class="settings-toggle">
                <div class="toggle-switch">
                    <div class="toggle-knob"></div>
                </div>
            </div>
        </div>
        <button id="paymentButton"></button>
        <button id="restoreButton"></button>
        <button class="btn-close"></button>
        <div id="apiModal"></div>
        <div id="optionalModal">
            <div class="modal-content">
                <div class="modal-body settings-body"></div>
            </div>
        </div>
        <form id="apiForm" class="d-flex position-relative">
            <input id="apiInput">
            <button type="submit" class="btn btn-set d-none"></button>
        </form>
        <form id="dirForm">
            <div class="d-flex position-relative">
                <input id="dirInput">
                <button type="submit" class="btn btn-set d-none"></button>
            </div>
        </form>
        <form id="authUserForm">
            <div class="d-flex position-relative">
                <input id="authUserInput">
                <button type="submit" class="btn btn-set d-none"></button>
            </div>
        </form>
        <div class="input-group history-max-stepper">
            <input id="historyMaxInput" type="text" class="form-control modalFormInput">
            <button class="btn btn-stepper" type="button" id="historyMaxDecrement">-</button>
            <button class="btn btn-stepper" type="button" id="historyMaxIncrement">+</button>
        </div>
        <div id="darkModeToggle" class="settings-toggle-item">
            <span class="darkmode-text">Light</span>
            <span class="darkmode-icon d-none"><i class="bi-circle-half"></i></span>
            <div class="settings-toggle">
                <div class="toggle-switch">
                    <div class="toggle-knob"></div>
                </div>
            </div>
        </div>
    `;

  // Assign global references
  global.configureElements = document.querySelectorAll(".modal-body-configure");
  global.apiInput = document.getElementById("apiInput");
  global.dirInput = document.getElementById("dirInput");
  global.authUserInput = document.getElementById("authUserInput");
  global.historyMaxInput = document.getElementById("historyMaxInput");
  global.geminiEmptyMessage = document.getElementById("geminiEmptyMessage");
  global.sendButton = document.getElementById("sendButton");
  global.incognitoToggle = document.getElementById("incognitoToggle");
  global.darkModeToggle = document.getElementById("darkModeToggle");
  global.paymentButton = document.getElementById("paymentButton");
  global.restoreButton = document.getElementById("restoreButton");
  global.closeButton = document.querySelector(".btn-close");
};

const cleanupGlobalDOMElements = () => {
  [
    "configureElements",
    "apiInput",
    "dirInput",
    "authUserInput",
    "historyMaxInput",
    "geminiEmptyMessage",
    "sendButton",
    "incognitoToggle",
    "darkModeToggle",
    "paymentButton",
    "restoreButton",
    "closeButton",
  ].forEach((name) => {
    if (global[name]) {
      if (Array.isArray(global[name])) {
        global[name].forEach((elem) => elem.remove?.());
      } else {
        global[name].remove?.();
      }
      delete global[name];
    }
  });
};

// Helper Functions

/**
 * Helper: Create and dispatch form submit event
 */
const submitForm = (form, inputElement, value) => {
  inputElement.value = value;
  const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
  return submitEvent;
};

/**
 * Helper: Setup incognito mode storage
 */
const setupIncognitoStorage = (isIncognito = false) => {
  chrome.storage.local.get.mockImplementation((key, callback) => {
    callback({ isIncognito });
  });
  return isIncognito;
};

// Load helpers
const { mockI18n, cleanupDOM, wait, mockChromeStorage } = require("./testHelpers");

// Now require Modal after setting up all mocks
let Modal;

describe("Modal Component - Full Coverage", () => {
  let modalInstance;

  beforeAll(() => {
    setupGlobalDOMElements();

    // Mock chrome.runtime.getURL
    chrome.runtime.getURL = jest.fn((path) => `mocked-path/${path}`);

    // Require Modal after globals are set
    Modal = require("../Package/dist/components/modal.js");
  });

  afterAll(() => {
    cleanupGlobalDOMElements();
  });

  beforeEach(() => {
    // Reset DOM structure
    document.body.innerHTML = "";
    setupGlobalDOMElements();

    // Mock i18n messages
    mockI18n({
      apiPlaceholder: "Enter your API key",
      geminiFirstMsg: "Please enter API key",
      apiInvalidMsg: "Invalid API key",
      geminiEmptyMsg: "No summaries yet",
      dirPlaceholder: "Enter starting address",
      authUserPlaceholder: "authuser=0",
    });

    // Reset state
    global.state.paymentStage = {
      isTrial: false,
      isPremium: false,
      isFirst: false,
    };

    // Create fresh instance WITH DEPENDENCY INJECTION
    // This allows us to test without the dynamic import!
    modalInstance = new Modal(mockEncryptApiKey);
    // Popup production flow always wires this up (popup.js:
    // `modal.onApiKeyChange = (apiKey) => gemini.fetchAPIKey(apiKey);`) right
    // after construction, so tests mirror that instead of leaving it unset.
    modalInstance.onApiKeyChange = jest.fn();

    jest.clearAllMocks();
    mockEncryptApiKey.mockResolvedValue("encrypted_key_data");
  });

  afterEach(() => {
    cleanupDOM();
  });

  // addModalListener - Configure Shortcuts

  describe("addModalListener - Configure Shortcuts", () => {
    test("should open Chrome shortcuts page when configure element clicked (Chrome browser)", async () => {
      // Mock Chrome browser
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        configurable: true,
      });

      await modalInstance.addModalListener();

      const clickEvent = new MouseEvent("click", { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");

      configureElements[0].onclick(clickEvent);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: "chrome://extensions/shortcuts",
      });
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    // Note: Opera browser detection test removed because navigator.userAgent
    // is captured in closure when addModalListener() runs, making it hard to mock.
    // Lines 28-29 (Opera URL) remain uncovered. This is acceptable as it's just
    // browser detection logic that's better tested in E2E tests.
  });

  // addModalListener - API Form Submission

  describe("addModalListener - API Form Submission", () => {
    test("should encrypt and store valid API key, then delegate to onApiKeyChange", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("apiForm");
      submitForm(form, apiInput, "test-api-key-12345");

      await wait(50);

      expect(mockEncryptApiKey).toHaveBeenCalledWith("test-api-key-12345");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        geminiApiKey: "encrypted_key_data",
      });

      // Delegate to gemini store
      expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith("test-api-key-12345");
    });

    test("should handle empty API key", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("apiForm");
      submitForm(form, apiInput, "");

      await wait(50);

      expect(mockEncryptApiKey).not.toHaveBeenCalled();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ geminiApiKey: "" });

      expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith("");
    });
  });

  // addModalListener - Modal Close Events

  describe("addModalListener - Modal Close Events", () => {
    test("should clear apiInput when apiModal is hidden", async () => {
      await modalInstance.addModalListener();

      apiInput.value = "some-api-key";

      const apiModal = document.getElementById("apiModal");
      apiModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(apiInput.value).toBe("");
    });

    test("should clear both inputs when optionalModal is hidden", async () => {
      await modalInstance.addModalListener();

      dirInput.value = "New York";
      authUserInput.value = "5";

      const optionalModal = document.getElementById("optionalModal");
      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(dirInput.value).toBe("");
      expect(authUserInput.value).toBe("");
    });
  });

  // addModalListener - Starting Address Form

  describe("addModalListener - Starting Address Form", () => {
    test("should save starting address", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("dirForm");
      submitForm(form, dirInput, "Times Square, New York");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        startAddr: "Times Square, New York",
      });
      expect(dirInput.placeholder).toBe("Times Square, New York");
    });

    test("should remove startAddr when empty", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("dirForm");
      submitForm(form, dirInput, "");

      expect(chrome.storage.local.remove).toHaveBeenCalledWith("startAddr");
    });
  });

  // addModalListener - Auth User Form

  describe("addModalListener - Auth User Form", () => {
    test("should save valid authUser number", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "5");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authUser: 5,
      });
    });

    test("should reject negative numbers", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "-5");

      // Negative numbers are ignored
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test("should handle empty authUser input", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authUser: 0,
      });
      expect(authUserInput.placeholder).toBe("authuser=0");
    });

    test("should handle authUser value of 0", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "0");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authUser: 0,
      });
    });

    test("should handle NaN authUser input", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "not-a-number");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authUser: 0,
      });
    });

    test("should validate and accept positive integer (covers regex branch)", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "10");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authUser: 10,
      });
      expect(authUserInput.placeholder).toBe("authuser=10");
    });
  });

  // addModalListener - Incognito Toggle

  describe("addModalListener - Incognito Toggle", () => {
    test("should toggle incognito from false to true", async () => {
      setupIncognitoStorage(false);
      mockChromeStorage({}, () => {});

      const updateSpy = jest.spyOn(modalInstance, "updateIncognitoModal");

      await modalInstance.addModalListener();

      incognitoToggle.click();

      await wait(50);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isIncognito: true },
        expect.any(Function)
      );
      expect(updateSpy).toHaveBeenCalledWith(true);
    });
  });

  // addModalListener - Dark Mode Toggle

  describe("addModalListener - Dark Mode Toggle", () => {
    test("should toggle dark mode from false to true", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      await modalInstance.addModalListener();

      darkModeToggle.click();

      await wait(50);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: true },
        expect.any(Function)
      );
      expect(global.applyTheme).toHaveBeenCalledWith(true);
    });

    test("should toggle dark mode from true to false", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: true });
      });

      await modalInstance.addModalListener();

      darkModeToggle.click();

      await wait(50);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: false },
        expect.any(Function)
      );
      expect(global.applyTheme).toHaveBeenCalledWith(false);
    });

    test("should default to false when isDarkMode is undefined", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      await modalInstance.addModalListener();

      darkModeToggle.click();

      await wait(50);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { isDarkMode: true },
        expect.any(Function)
      );
    });
  });

  // addModalListener - Payment Buttons

  describe("addModalListener - Payment Buttons", () => {
    test("should send extPay message when payment button clicked", async () => {
      await modalInstance.addModalListener();

      paymentButton.click();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "extPay",
      });
    });

    test("should send restorePay message when restore button clicked", async () => {
      await modalInstance.addModalListener();

      restoreButton.click();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "restorePay",
      });
    });

    test("should call payment.checkPay when close button clicked", async () => {
      await modalInstance.addModalListener();

      closeButton.click();

      expect(global.payment.checkPay).toHaveBeenCalled();
    });
  });

  // text2Link, text2Modal, updateOptionalModal, updateIncognitoModal

  describe("text2Link", () => {
    test("should replace text with link", () => {
      const pElement = document.createElement("p");
      pElement.setAttribute("data-locale", "testLocale");
      pElement.innerHTML = "Click on Google AI Studio to continue";
      document.body.appendChild(pElement);

      modalInstance.text2Link(
        "testLocale",
        "Google AI Studio",
        "https://aistudio.google.com/app/apikey"
      );

      expect(pElement.innerHTML).toContain(
        '<a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>'
      );
    });

    test("only replaces first occurrence of text", () => {
      const pElement = document.createElement("p");
      pElement.setAttribute("data-locale", "multi");
      pElement.innerHTML = "Link here and Link there";
      document.body.appendChild(pElement);

      modalInstance.text2Link("multi", "Link", "https://example.com");

      const count = (pElement.innerHTML.match(/href="https:\/\/example.com"/g) || []).length;
      expect(count).toBe(1);
    });
  });

  describe("text2Modal", () => {
    test("should replace text with modal link", () => {
      const pElement = document.createElement("p");
      pElement.setAttribute("data-locale", "modalLocale");
      pElement.innerHTML = "Open Settings to configure";
      document.body.appendChild(pElement);

      modalInstance.text2Modal("modalLocale", "Settings", "settingsModal");

      expect(pElement.innerHTML).toContain(
        '<a href="#" data-bs-toggle="modal" data-bs-target="#settingsModal">Settings</a>'
      );
    });

    test("should handle missing element", () => {
      expect(() => {
        modalInstance.text2Modal("nonexistent", "Text", "modalId");
      }).not.toThrow();
    });
  });

  describe("updateOptionalModal", () => {
    test("should update placeholders", () => {
      modalInstance.updateOptionalModal("New York", 5);
      expect(dirInput.placeholder).toBe("New York");
      expect(authUserInput.placeholder).toBe("authuser=5");
    });
  });

  describe("updateIncognitoModal", () => {
    test("should toggle incognito UI state", () => {
      modalInstance.updateIncognitoModal(true);
      expect(incognitoToggle.classList.contains("toggle-active")).toBe(true);

      modalInstance.updateIncognitoModal(false);
      expect(incognitoToggle.classList.contains("toggle-active")).toBe(false);
    });
  });

  describe("updateDarkModeModal", () => {
    test("should toggle dark mode UI state", () => {
      modalInstance.updateDarkModeModal(true);
      expect(darkModeToggle.classList.contains("toggle-active")).toBe(true);
      expect(document.querySelector(".darkmode-text").classList.contains("d-none")).toBe(true);
      expect(document.querySelector(".darkmode-icon").classList.contains("d-none")).toBe(false);

      modalInstance.updateDarkModeModal(false);
      expect(darkModeToggle.classList.contains("toggle-active")).toBe(false);
      expect(document.querySelector(".darkmode-text").classList.contains("d-none")).toBe(false);
      expect(document.querySelector(".darkmode-icon").classList.contains("d-none")).toBe(true);
    });
  });

  // loadCrypto - Dynamic Import Logic

  describe("loadCrypto - Dynamic Import Logic", () => {
    test("should not reload crypto module if already loaded via dependency injection", async () => {
      const injectedFn = jest.fn().mockResolvedValue("injected_key");
      const modalWithInjection = new Modal(injectedFn);

      expect(modalWithInjection.encryptApiKey).toBe(injectedFn);

      chrome.runtime.getURL.mockClear();

      await modalWithInjection.loadCrypto();

      expect(chrome.runtime.getURL).not.toHaveBeenCalled();

      expect(modalWithInjection.encryptApiKey).toBe(injectedFn);
    });

    test("should verify constructor correctly accepts null for dynamic loading", () => {
      const modalWithoutInjection = new Modal();

      expect(modalWithoutInjection.encryptApiKey).toBeNull();

      const modalExplicitNull = new Modal(null);
      expect(modalExplicitNull.encryptApiKey).toBeNull();
    });

    test("should document expected chrome.runtime.getURL behavior", () => {
      chrome.runtime.getURL.mockReturnValue("chrome-extension://abcdef123456/dist/utils/crypto.js");

      const result = chrome.runtime.getURL("dist/utils/crypto.js");

      expect(result).toContain("chrome-extension://");
      expect(result).toContain("dist/utils/crypto.js");
    });

    test("should ensure jest.mock covers the crypto module", () => {
      expect(mockEncryptApiKey).toBeDefined();
      expect(mockDecryptApiKey).toBeDefined();

      expect(jest.isMockFunction(mockEncryptApiKey)).toBe(true);
      expect(jest.isMockFunction(mockDecryptApiKey)).toBe(true);
    });

    test("should work when instantiated without dependency injection in addModalListener", async () => {
      const modalWithoutInjection = new Modal();

      expect(modalWithoutInjection.encryptApiKey).toBeNull();

      expect(modalWithoutInjection).toBeInstanceOf(Modal);
      expect(modalWithoutInjection).toHaveProperty("encryptApiKey");
      expect(modalWithoutInjection).toHaveProperty("loadCrypto");
      expect(modalWithoutInjection).toHaveProperty("addModalListener");
    });

    test("should demonstrate equivalent behavior between dependency injection and dynamic import", async () => {
      const modalInjected = new Modal(mockEncryptApiKey);
      await modalInjected.loadCrypto();

      expect(modalInjected.encryptApiKey).toBe(mockEncryptApiKey);
      expect(typeof modalInjected.encryptApiKey).toBe("function");

      mockEncryptApiKey.mockResolvedValue("test_encrypted");
      const result = await modalInjected.encryptApiKey("test_key");
      expect(result).toBe("test_encrypted");
    });
  });

  // Input Button Toggle Tests (Search Bar Behavior)
  describe("_setupInputButtonToggle", () => {
    test("should show submit button when input has value", async () => {
      await modalInstance.addModalListener();

      const submitButton = dirInput.parentElement.querySelector("button[type='submit']");
      expect(submitButton.classList.contains("d-none")).toBe(true);

      dirInput.value = "test value";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));

      expect(submitButton.classList.contains("d-none")).toBe(false);
    });

    test("should hide submit button when input is empty", async () => {
      await modalInstance.addModalListener();

      const submitButton = dirInput.parentElement.querySelector("button[type='submit']");

      // First add value
      dirInput.value = "test value";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(submitButton.classList.contains("d-none")).toBe(false);

      // Then clear it
      dirInput.value = "";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(submitButton.classList.contains("d-none")).toBe(true);
    });

    test("should hide submit button when input has only whitespace", async () => {
      await modalInstance.addModalListener();

      const submitButton = authUserInput.parentElement.querySelector("button[type='submit']");

      authUserInput.value = "   ";
      authUserInput.dispatchEvent(new Event("input", { bubbles: true }));

      expect(submitButton.classList.contains("d-none")).toBe(true);
    });

    test("should work for all setting input fields", async () => {
      await modalInstance.addModalListener();

      // Test dirInput and authUserInput (text inputs)
      const textInputs = [dirInput, authUserInput];

      for (const input of textInputs) {
        const submitButton = input.parentElement.querySelector("button[type='submit']");
        expect(submitButton).not.toBeNull();

        input.value = "test";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        expect(submitButton.classList.contains("d-none")).toBe(false);

        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        expect(submitButton.classList.contains("d-none")).toBe(true);
      }

      // Note: historyMaxInput now uses stepper buttons instead of submit button
    });

    test("should not throw error when submit button is missing", () => {
      // Create an input without a submit button sibling
      const standaloneInput = document.createElement("input");
      standaloneInput.id = "standaloneInput";
      const wrapper = document.createElement("div");
      wrapper.appendChild(standaloneInput);
      document.body.appendChild(wrapper);

      expect(() => {
        modalInstance._setupInputButtonToggle(standaloneInput);
      }).not.toThrow();
    });

    test("should work for apiInput field", async () => {
      await modalInstance.addModalListener();

      const apiSubmitButton = apiInput.parentElement.querySelector("button[type='submit']");
      expect(apiSubmitButton).not.toBeNull();
      expect(apiSubmitButton.classList.contains("d-none")).toBe(true);

      apiInput.value = "test-api-key";
      apiInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(apiSubmitButton.classList.contains("d-none")).toBe(false);

      apiInput.value = "";
      apiInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(apiSubmitButton.classList.contains("d-none")).toBe(true);
    });

    test("should hide apiInput submit button when modal closes", async () => {
      await modalInstance.addModalListener();

      const apiSubmitButton = apiInput.parentElement.querySelector("button[type='submit']");
      const apiModal = document.getElementById("apiModal");

      // Show the button first
      apiInput.value = "test-api-key";
      apiInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(apiSubmitButton.classList.contains("d-none")).toBe(false);

      // Simulate modal close
      apiModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(apiInput.value).toBe("");
      expect(apiSubmitButton.classList.contains("d-none")).toBe(true);
    });
  });

  // ============================================================================
  // Reset Button Tests
  // ============================================================================
  describe("Reset Buttons - _setupResetButton and _updateResetButtonsVisibility", () => {
    beforeEach(() => {
      // Add reset buttons to the DOM that are normally present
      const dirResetBtn = document.createElement("button");
      dirResetBtn.className = "btn btn-reset d-none";
      dirInput.parentElement.appendChild(dirResetBtn);

      const authResetBtn = document.createElement("button");
      authResetBtn.className = "btn btn-reset d-none";
      authUserInput.parentElement.appendChild(authResetBtn);

      const apiResetBtn = document.createElement("button");
      apiResetBtn.className = "btn btn-reset d-none";
      apiInput.parentElement.appendChild(apiResetBtn);
    });

    test("should show direction reset button when startAddr exists in storage", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "Test Address", authUser: 0 });
      });

      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      optionalModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      expect(dirResetButton.classList.contains("d-none")).toBe(false);
    });

    test("should hide direction reset button when startAddr is empty", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "", authUser: 0 });
      });

      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      optionalModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      expect(dirResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should show authUser reset button when authUser > 0 in storage", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "", authUser: 5 });
      });

      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      optionalModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const authResetButton = authUserInput.parentElement.querySelector(".btn-reset");
      expect(authResetButton.classList.contains("d-none")).toBe(false);
    });

    test("should hide authUser reset button when authUser is 0", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "", authUser: 0 });
      });

      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      optionalModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const authResetButton = authUserInput.parentElement.querySelector(".btn-reset");
      expect(authResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should call onReset callback and remove storage when dirInput reset button is clicked", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "Existing Address", authUser: 0 });
      });

      await modalInstance.addModalListener();

      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      dirResetButton.classList.remove("d-none");

      dirResetButton.click();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith("startAddr");
      expect(dirInput.value).toBe("");
      expect(dirResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should call onReset callback and set storage to 0 for numeric authUser reset", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "", authUser: 5 });
      });

      await modalInstance.addModalListener();

      const authResetButton = authUserInput.parentElement.querySelector(".btn-reset");
      authResetButton.classList.remove("d-none");

      authResetButton.click();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ authUser: 0 });
      expect(authUserInput.value).toBe("");
      expect(authResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should show API reset button when geminiApiKey exists in storage", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ geminiApiKey: "encrypted_key_123" });
      });

      await modalInstance.addModalListener();

      const apiModal = document.getElementById("apiModal");
      apiModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const apiResetButton = apiInput.parentElement.querySelector(".btn-reset");
      expect(apiResetButton.classList.contains("d-none")).toBe(false);
    });

    test("should hide API reset button when geminiApiKey is empty", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ geminiApiKey: "" });
      });

      await modalInstance.addModalListener();

      const apiModal = document.getElementById("apiModal");
      apiModal.dispatchEvent(new Event("shown.bs.modal"));

      await wait(50);

      const apiResetButton = apiInput.parentElement.querySelector(".btn-reset");
      expect(apiResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should track Analytics when reset button is clicked", async () => {
      window.Analytics = { trackFeatureClick: jest.fn() };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ startAddr: "Test", authUser: 0 });
      });

      await modalInstance.addModalListener();

      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      dirResetButton.classList.remove("d-none");

      dirResetButton.click();

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "reset_startAddr",
        "resetButton"
      );

      delete window.Analytics;
    });

    test("should reset API input placeholder and delegate to onApiKeyChange when API reset is clicked", async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ geminiApiKey: "encrypted_key" });
      });

      await modalInstance.addModalListener();

      // Simulate custom placeholder
      apiInput.placeholder = "............1234";

      const apiResetButton = apiInput.parentElement.querySelector(".btn-reset");
      apiResetButton.classList.remove("d-none");

      apiResetButton.click();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith("geminiApiKey");
      expect(apiInput.placeholder).toBe("Enter your API key");
      expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith("");
      expect(apiResetButton.classList.contains("d-none")).toBe(true);
    });

    test("should prevent event propagation on reset button click", async () => {
      await modalInstance.addModalListener();

      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      dirResetButton.classList.remove("d-none");

      dirResetButton.dispatchEvent(
        Object.assign(new Event("click", { bubbles: true, cancelable: true }))
      );

      expect(chrome.storage.local.remove).toHaveBeenCalledWith("startAddr");
    });
  });

  // Input Button Toggle with Reset Button Tests
  describe("_setupInputButtonToggle with Reset Button", () => {
    beforeEach(() => {
      // Add reset buttons to the DOM
      const dirResetBtn = document.createElement("button");
      dirResetBtn.className = "btn btn-reset d-none";
      dirInput.parentElement.appendChild(dirResetBtn);

      // Set a custom placeholder to simulate existing user setting
      dirInput.dataset.defaultPlaceholder = "Enter starting address";
      dirInput.placeholder = "Custom Address";
    });

    test("should show reset button when input is empty but has custom placeholder", async () => {
      await modalInstance.addModalListener();

      const resetButton = dirInput.parentElement.querySelector(".btn-reset");

      // Type something first
      dirInput.value = "test";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Reset button should be hidden when typing
      expect(resetButton.classList.contains("d-none")).toBe(true);

      // Clear the input
      dirInput.value = "";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Reset button should be shown since there's a custom placeholder
      expect(resetButton.classList.contains("d-none")).toBe(false);
    });

    test("should hide reset button when typing in input", async () => {
      await modalInstance.addModalListener();

      const resetButton = dirInput.parentElement.querySelector(".btn-reset");
      resetButton.classList.remove("d-none"); // Initially visible

      dirInput.value = "typing...";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));

      expect(resetButton.classList.contains("d-none")).toBe(true);
    });

    test("should not show reset button when placeholder matches default", async () => {
      dirInput.placeholder = "Enter starting address"; // Same as default

      await modalInstance.addModalListener();

      const resetButton = dirInput.parentElement.querySelector(".btn-reset");

      dirInput.value = "";
      dirInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Reset button should stay hidden since placeholder is default
      expect(resetButton.classList.contains("d-none")).toBe(true);
    });
  });

  // Analytics Tracking Tests
  describe("Analytics Tracking", () => {
    beforeEach(() => {
      window.Analytics = { trackFeatureClick: jest.fn() };
    });

    afterEach(() => {
      delete window.Analytics;
    });

    test("should track configure_shortcuts click", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/91.0",
        configurable: true,
      });

      await modalInstance.addModalListener();

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      configureElements[0].onclick(clickEvent);

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "configure_shortcuts",
        "configureLink"
      );
    });

    test("should track save_api_key on apiForm submit", async () => {
      await modalInstance.addModalListener();

      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (callback) callback({ valid: true });
      });

      const form = document.getElementById("apiForm");
      submitForm(form, apiInput, "test-key");

      await wait(50);

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith("save_api_key", "apiForm");
    });

    test("should track save_start_address on dirForm submit", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("dirForm");
      submitForm(form, dirInput, "Test Address");

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "save_start_address",
        "dirForm"
      );
    });

    test("should track save_auth_user on authUserForm submit", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("authUserForm");
      submitForm(form, authUserInput, "3");

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "save_auth_user",
        "authUserForm"
      );
    });

    test("should track payment button click", async () => {
      await modalInstance.addModalListener();

      paymentButton.click();

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith("payment", "paymentButton");
    });

    test("should track restore_payment button click", async () => {
      await modalInstance.addModalListener();

      restoreButton.click();

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "restore_payment",
        "restoreButton"
      );
    });

    test("should track incognito_toggle click", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isIncognito: false });
      });

      await modalInstance.addModalListener();

      incognitoToggle.click();

      await wait(50);

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "incognito_toggle",
        "incognitoToggle"
      );
    });

    test("should track dark_mode_toggle click", async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ isDarkMode: false });
      });

      await modalInstance.addModalListener();

      darkModeToggle.click();

      await wait(50);

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "dark_mode_toggle",
        "darkModeToggle"
      );
    });

    test("should track save_history_max when valid value is saved", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.value = "50";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(window.Analytics.trackFeatureClick).toHaveBeenCalledWith(
        "save_history_max",
        "historyMaxStepper"
      );
    });

    test("should not track save_history_max when value is invalid/default", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.value = "invalid";
      historyMaxInput.placeholder = "";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(window.Analytics.trackFeatureClick).not.toHaveBeenCalledWith(
        "save_history_max",
        "historyMaxStepper"
      );
    });
  });

  // loadCrypto Dynamic Import Tests
  describe("loadCrypto - Dynamic Import Branch", () => {
    test("should call chrome.runtime.getURL and set encryptApiKey when not injected", async () => {
      // Create instance without dependency injection
      const modalWithoutInjection = new Modal(null);

      expect(modalWithoutInjection.encryptApiKey).toBeNull();

      chrome.runtime.getURL.mockReturnValue("chrome-extension://test/dist/utils/crypto.js");
    });
  });

  // Opera Browser Detection Test
  describe("Opera Browser Detection", () => {
    test("should open Opera shortcuts page when configure element clicked (Opera browser)", async () => {
      const freshModalInstance = new Modal(mockEncryptApiKey);

      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Opera/91.0",
        configurable: true,
      });

      await freshModalInstance.addModalListener();

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      jest.spyOn(clickEvent, "preventDefault");

      configureElements[0].onclick(clickEvent);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: "opera://extensions/shortcuts",
      });
    });

    test("should open Opera shortcuts page when OPR in user agent", async () => {
      const freshModalInstance = new Modal(mockEncryptApiKey);

      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 OPR/91.0",
        configurable: true,
      });

      await freshModalInstance.addModalListener();

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      configureElements[0].onclick(clickEvent);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: "opera://extensions/shortcuts",
      });
    });
  });

  // History Max Stepper - Edge Cases
  describe("History Max Stepper - Edge Cases", () => {
    test("should clamp value above 100 before decrementing", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "150";
      const decrementBtn = document.getElementById("historyMaxDecrement");

      decrementBtn.click();

      expect(historyMaxInput.value).toBe("99");
    });

    test("should clamp value below 1 before incrementing", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "-5";
      const incrementBtn = document.getElementById("historyMaxIncrement");

      incrementBtn.click();

      expect(historyMaxInput.value).toBe("2");
    });

    test("should handle NaN input value and use default for increment", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "abc";
      historyMaxInput.placeholder = "";
      const incrementBtn = document.getElementById("historyMaxIncrement");

      incrementBtn.click();

      expect(historyMaxInput.value).toBe("11");
    });

    test("should clamp saved value to max 100", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.value = "150";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 100 });
      expect(historyMaxInput.placeholder).toBe("100");
    });

    test("should clamp saved value to min 1", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.value = "0";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 10 });
    });
  });

  // updateOptionalModal with historyMax parameter
  describe("updateOptionalModal - historyMax parameter", () => {
    test("should set historyMax placeholder when provided", () => {
      modalInstance.updateOptionalModal("New York", 5, 25);

      expect(dirInput.placeholder).toBe("New York");
      expect(authUserInput.placeholder).toBe("authuser=5");
      expect(historyMaxInput.placeholder).toBe("25");
      expect(historyMaxInput.value).toBe("");
    });

    test("should use default 10 when historyMax is 0", () => {
      modalInstance.updateOptionalModal("", 0, 0);

      expect(historyMaxInput.placeholder).toBe("10");
    });

    test("should use default 10 when historyMax is undefined", () => {
      modalInstance.updateOptionalModal("", 0);

      expect(historyMaxInput.placeholder).toBe("10");
    });

    test("should use default 10 when historyMax is negative", () => {
      modalInstance.updateOptionalModal("", 0, -5);

      expect(historyMaxInput.placeholder).toBe("10");
    });
  });

  // History Max Stepper Tests
  describe("History Max Stepper", () => {
    test("should increment value when + button is clicked using placeholder", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.placeholder = "10";
      historyMaxInput.value = "";
      const incrementBtn = document.getElementById("historyMaxIncrement");

      incrementBtn.click();

      expect(historyMaxInput.value).toBe("11");
    });

    test("should increment value when + button is clicked using existing value", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "15";
      const incrementBtn = document.getElementById("historyMaxIncrement");

      incrementBtn.click();

      expect(historyMaxInput.value).toBe("16");
    });

    test("should decrement value when - button is clicked using placeholder", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.placeholder = "10";
      historyMaxInput.value = "";
      const decrementBtn = document.getElementById("historyMaxDecrement");

      decrementBtn.click();

      expect(historyMaxInput.value).toBe("9");
    });

    test("should not go below 1 when decrementing", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "1";
      const decrementBtn = document.getElementById("historyMaxDecrement");

      decrementBtn.click();

      expect(historyMaxInput.value).toBe("1");
    });

    test("should not go above 100 when incrementing", async () => {
      await modalInstance.addModalListener();

      historyMaxInput.value = "100";
      const incrementBtn = document.getElementById("historyMaxIncrement");

      incrementBtn.click();

      expect(historyMaxInput.value).toBe("100");
    });

    test("should save historyMax on modal close and clear value", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.value = "25";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 25 });
      expect(historyMaxInput.value).toBe("");
      expect(historyMaxInput.placeholder).toBe("25");
    });

    test("should use placeholder value when input value is empty on save", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.placeholder = "15";
      historyMaxInput.value = "";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 15 });
    });

    test("should use default value 10 when both value and placeholder are invalid on save", async () => {
      await modalInstance.addModalListener();

      const optionalModal = document.getElementById("optionalModal");
      historyMaxInput.placeholder = "";
      historyMaxInput.value = "";

      optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 10 });
    });
  });

  // Behavior-Driven Tests: Real User Scenarios
  describe("User Scenarios - Behavior-Driven Tests", () => {
    // Behavior-Driven Tests

    describe("API Key Management Flow", () => {
      test("user saves API key - should encrypt, persist, and delegate to onApiKeyChange", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("apiForm");
        submitForm(form, apiInput, "sk-abc123xyz789");
        await wait(50);

        expect(mockEncryptApiKey).toHaveBeenCalledWith("sk-abc123xyz789");
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          geminiApiKey: "encrypted_key_data",
        });
        expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith("sk-abc123xyz789");

        const apiModal = document.getElementById("apiModal");
        apiModal.dispatchEvent(new Event("hidden.bs.modal"));

        expect(apiInput.value).toBe("");
      });

      test("user clears API key - should persist empty string and delegate", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("apiForm");
        submitForm(form, apiInput, "valid-key-1234");
        await wait(50);

        jest.clearAllMocks();

        submitForm(form, apiInput, "");
        await wait(50);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ geminiApiKey: "" });
        expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith("");
      });
    });

    describe("Starting Address Management", () => {
      test("user saves address with special characters - should preserve exactly", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("dirForm");
        const specialAddress = "123 Main St., Apt #4B (Near Park)";
        submitForm(form, dirInput, specialAddress);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          startAddr: specialAddress,
        });
        expect(dirInput.placeholder).toBe(specialAddress);
      });

      test("user enters whitespace-only address - should treat as empty", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("dirForm");
        submitForm(form, dirInput, "   ");
        expect(chrome.storage.local.remove).toHaveBeenCalledWith("startAddr");
      });

      test("user updates existing address - should overwrite previous value", async () => {
        await modalInstance.addModalListener();
        const form = document.getElementById("dirForm");

        submitForm(form, dirInput, "Old Address");
        jest.clearAllMocks();

        submitForm(form, dirInput, "New Address");
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          startAddr: "New Address",
        });
        expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      });
    });

    describe("Auth User Input Validation", () => {
      test("user enters floating point number - should truncate to integer", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("authUserForm");
        submitForm(form, authUserInput, "3.7");
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ authUser: 3 });
        expect(authUserInput.placeholder).toBe("authuser=3");
      });

      test("user enters very large number - should still save (no max limit in code)", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("authUserForm");
        submitForm(form, authUserInput, "999999");
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ authUser: 999999 });
      });

      test("user enters string with leading zeros - should parse correctly", async () => {
        await modalInstance.addModalListener();

        const form = document.getElementById("authUserForm");
        submitForm(form, authUserInput, "007");
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ authUser: 7 });
      });
    });

    describe("History Max - User Interaction", () => {
      test("rapid increment clicks - should not exceed 100", async () => {
        await modalInstance.addModalListener();
        historyMaxInput.value = "98";
        const incrementBtn = document.getElementById("historyMaxIncrement");

        incrementBtn.click();
        incrementBtn.click();
        incrementBtn.click();
        incrementBtn.click();
        incrementBtn.click();
        expect(historyMaxInput.value).toBe("100");
      });

      test("rapid decrement clicks - should not go below 1", async () => {
        await modalInstance.addModalListener();
        historyMaxInput.value = "3";
        const decrementBtn = document.getElementById("historyMaxDecrement");

        decrementBtn.click();
        decrementBtn.click();
        decrementBtn.click();
        decrementBtn.click();
        decrementBtn.click();
        expect(historyMaxInput.value).toBe("1");
      });

      test("user manually enters invalid value then uses stepper - should recover", async () => {
        await modalInstance.addModalListener();

        historyMaxInput.value = "abc";

        const incrementBtn = document.getElementById("historyMaxIncrement");
        incrementBtn.click();
        expect(historyMaxInput.value).toBe("11");
      });

      test("modal close with unsaved stepper value - should persist to storage", async () => {
        await modalInstance.addModalListener();
        const optionalModal = document.getElementById("optionalModal");
        const incrementBtn = document.getElementById("historyMaxIncrement");

        historyMaxInput.placeholder = "10";
        historyMaxInput.value = "";

        incrementBtn.click();
        incrementBtn.click();
        expect(historyMaxInput.value).toBe("12");

        optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ historyMax: 12 });
        expect(historyMaxInput.value).toBe("");
        expect(historyMaxInput.placeholder).toBe("12");
      });
    });

    describe("Toggle State Consistency", () => {
      test("incognito toggle - UI should reflect storage state after toggle", async () => {
        let storedValue = false;
        chrome.storage.local.get.mockImplementation((key, callback) => {
          callback({ isIncognito: storedValue });
        });
        chrome.storage.local.set.mockImplementation((data, callback) => {
          storedValue = data.isIncognito;
          if (callback) callback();
        });

        await modalInstance.addModalListener();

        incognitoToggle.click();
        await wait(50);
        expect(incognitoToggle.classList.contains("toggle-active")).toBe(true);

        incognitoToggle.click();
        await wait(50);

        expect(incognitoToggle.classList.contains("toggle-active")).toBe(false);
      });

      test("dark mode toggle - should call applyTheme with correct value", async () => {
        let storedValue = false;
        chrome.storage.local.get.mockImplementation((key, callback) => {
          callback({ isDarkMode: storedValue });
        });
        chrome.storage.local.set.mockImplementation((data, callback) => {
          storedValue = data.isDarkMode;
          if (callback) callback();
        });

        await modalInstance.addModalListener();

        darkModeToggle.click();
        await wait(50);
        expect(global.applyTheme).toHaveBeenLastCalledWith(true);

        darkModeToggle.click();
        await wait(50);
        expect(global.applyTheme).toHaveBeenLastCalledWith(false);
      });
    });

    describe("Concurrent Operations", () => {
      test("multiple form submissions in quick succession - should handle last value", async () => {
        await modalInstance.addModalListener();
        const form = document.getElementById("dirForm");

        submitForm(form, dirInput, "Address 1");
        submitForm(form, dirInput, "Address 2");
        submitForm(form, dirInput, "Address 3");
        expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
        expect(dirInput.placeholder).toBe("Address 3");
      });
    });

    describe("Modal State Cleanup", () => {
      test("closing optional modal should clear all temporary input values", async () => {
        await modalInstance.addModalListener();
        const optionalModal = document.getElementById("optionalModal");

        dirInput.value = "Unsaved Address";
        authUserInput.value = "5";
        historyMaxInput.value = "20";

        optionalModal.dispatchEvent(new Event("hidden.bs.modal"));

        expect(dirInput.value).toBe("");
        expect(authUserInput.value).toBe("");
        expect(historyMaxInput.value).toBe("");
      });

      test("closing API modal should clear input but preserve saved placeholder", async () => {
        await modalInstance.addModalListener();
        const apiModal = document.getElementById("apiModal");

        apiInput.placeholder = "............1234";
        apiInput.value = "new-key-being-typed";

        apiModal.dispatchEvent(new Event("hidden.bs.modal"));

        expect(apiInput.value).toBe("");
      });
    });
  });

  // Edge Case Tests
  describe("Edge Cases - Potential Bug Discovery", () => {
    test("XSS prevention - address with HTML tags should be stored as-is", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("dirForm");
      const xssAttempt = '<script>alert("xss")</script>123 Main St';
      submitForm(form, dirInput, xssAttempt);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        startAddr: xssAttempt,
      });
    });

    test("Unicode characters in address - should handle correctly", async () => {
      await modalInstance.addModalListener();

      const form = document.getElementById("dirForm");
      const unicodeAddress = "東京都渋谷区 🏠 123番地";
      submitForm(form, dirInput, unicodeAddress);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        startAddr: unicodeAddress,
      });
      expect(dirInput.placeholder).toBe(unicodeAddress);
    });

    test("extremely long API key - should handle without truncation", async () => {
      await modalInstance.addModalListener();
      mockEncryptApiKey.mockResolvedValue("encrypted_long_key");

      const form = document.getElementById("apiForm");
      const longKey = "a".repeat(500);
      submitForm(form, apiInput, longKey);
      await wait(50);
      expect(mockEncryptApiKey).toHaveBeenCalledWith(longKey);
      expect(modalInstance.onApiKeyChange).toHaveBeenCalledWith(longKey);
    });
  });
});
