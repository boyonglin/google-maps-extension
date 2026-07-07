class Modal {
  constructor(encryptApiKeyFn = null) {
    this.encryptApiKey = encryptApiKeyFn;
  }

  async loadCrypto() {
    if (!this.encryptApiKey) {
      const { encryptApiKey } = await import(chrome.runtime.getURL("dist/utils/crypto.js"));
      this.encryptApiKey = encryptApiKey;
    }
  }

  async addModalListener() {
    await this.loadCrypto();

    this._setupShortcutsLinks();
    this._setupApiForm();
    this._setupSettingsScrollFade();
    this._setupOptionalModalLifecycle();
    this._setupDirForm();
    this._setupAuthUserForm();
    this._setupHistoryMaxStepper();

    this._setupInputButtonToggle(authUserInput);
    this._setupInputButtonToggle(dirInput);

    this._setupIncognitoToggle();
    this._setupDarkModeToggle();
    this._setupLanguageDropdown();
    this._setupPremiumPanel();
  }

  // ---------------------------------------------------------------------------
  // Private setup helpers (called once from addModalListener)
  // ---------------------------------------------------------------------------

  _setupShortcutsLinks() {
    for (let i = 0; i < configureElements.length; i++) {
      configureElements[i].onclick = function (event) {
        if (window.Analytics)
          window.Analytics.trackFeatureClick("configure_shortcuts", "configureLink");
        // Detect user browser
        let userAgent = navigator.userAgent;

        if (/Chrome/i.test(userAgent)) {
          chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
        } else if (/Opera|OPR\//i.test(userAgent)) {
          chrome.tabs.create({ url: "opera://extensions/shortcuts" });
        }

        event.preventDefault();
      };
    }
  }

  _setupApiForm() {
    document.getElementById("apiForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (window.Analytics) window.Analytics.trackFeatureClick("save_api_key", "apiForm");
      const apiKey = apiInput.value.trim();

      const encrypted = apiKey ? await this.encryptApiKey(apiKey) : "";
      chrome.storage.local.set({ geminiApiKey: encrypted });

      // Popup production flow delegates API state to the Gemini controller/store.
      // Standalone component consumers keep the legacy fallback below.
      if (this.onApiKeyChange) {
        this.onApiKeyChange(apiKey);
        return;
      }

      if (!apiKey) {
        apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
        sendButton.disabled = true;
        return;
      }

      chrome.runtime.sendMessage(
        { action: "verifyApiKey", apiKey: apiKey },
        ({ valid, error } = {}) => {
          if (error || !valid) {
            geminiEmptyMessage.classList.remove("d-none");
            apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
            geminiEmptyMessage.innerText = chrome.i18n.getMessage("apiInvalidMsg");
            sendButton.disabled = true;
          } else {
            apiInput.placeholder = "............" + apiKey.slice(-4);
            geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
            sendButton.disabled = false;
          }
        }
      );
    });

    this.text2Link("apiNote", "Google AI Studio", "https://aistudio.google.com/app/apikey");

    const apiModal = document.getElementById("apiModal");

    apiModal.addEventListener("shown.bs.modal", () => {
      this._updateApiResetButtonVisibility();
    });

    apiModal.addEventListener("hidden.bs.modal", () => {
      apiInput.value = "";
      this._hideInputButtons(apiInput);
    });

    this._setupInputButtonToggle(apiInput);

    this._setupResetButton(apiInput, "geminiApiKey", () => {
      apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
      if (this.onApiKeyChange) {
        this.onApiKeyChange("");
        return;
      }
      geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
      sendButton.disabled = true;
    });
  }

  _setupSettingsScrollFade() {
    const optionalModal = document.getElementById("optionalModal");
    const settingsBody = optionalModal.querySelector(".settings-body");
    const settingsModalContent = optionalModal.querySelector(".modal-content");

    const updateFade = () => {
      const atBottom =
        settingsBody.scrollHeight - settingsBody.scrollTop <= settingsBody.clientHeight + 2;
      settingsModalContent.classList.toggle("at-bottom", atBottom);
    };

    optionalModal.addEventListener("shown.bs.modal", () => {
      this._updateResetButtonsVisibility();
      settingsModalContent.classList.remove("at-bottom");
      updateFade();
      settingsBody.addEventListener("scroll", updateFade);
    });

    optionalModal.addEventListener("hide.bs.modal", () => {
      settingsBody.removeEventListener("scroll", updateFade);
    });
  }

  _setupOptionalModalLifecycle() {
    const optionalModal = document.getElementById("optionalModal");
    optionalModal.addEventListener("hidden.bs.modal", () => {
      dirInput.value = "";
      authUserInput.value = "";
      this._hideInputButtons(dirInput);
      this._hideInputButtons(authUserInput);

      this._saveHistoryMax();
    });
  }

  _setupDirForm() {
    document.getElementById("dirForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (window.Analytics) window.Analytics.trackFeatureClick("save_start_address", "dirForm");

      const startAddr = dirInput.value.trim();

      if (startAddr === "") {
        chrome.storage.local.remove("startAddr");
        dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
      } else {
        chrome.storage.local.set({ startAddr: startAddr });
        dirInput.placeholder = startAddr;
      }
    });

    this._setupResetButton(dirInput, "startAddr", () => {
      dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
    });
  }

  _setupAuthUserForm() {
    document.getElementById("authUserForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (window.Analytics) window.Analytics.trackFeatureClick("save_auth_user", "authUserForm");

      const authUser = parseInt(authUserInput.value.trim(), 10);

      if (authUserInput.value.trim() === "" || authUser === 0 || isNaN(authUser)) {
        chrome.storage.local.set({ authUser: 0 });
        authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
      } else if (authUser > 0) {
        chrome.storage.local.set({ authUser: authUser });
        authUserInput.placeholder = `authuser=${authUser}`;
      }
    });

    this._setupResetButton(
      authUserInput,
      "authUser",
      () => {
        authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
      },
      true
    );
  }

  _setupHistoryMaxStepper() {
    const historyMaxDecrement = document.getElementById("historyMaxDecrement");
    const historyMaxIncrement = document.getElementById("historyMaxIncrement");

    historyMaxDecrement.addEventListener("click", () => {
      const currentValue = parseInt(historyMaxInput.value || historyMaxInput.placeholder, 10) || 10;
      const clampedValue = Math.min(100, Math.max(1, currentValue));
      const newValue = Math.max(1, clampedValue - 1);
      historyMaxInput.value = newValue;
    });

    historyMaxIncrement.addEventListener("click", () => {
      const currentValue = parseInt(historyMaxInput.value || historyMaxInput.placeholder, 10) || 10;
      const clampedValue = Math.min(100, Math.max(1, currentValue));
      const newValue = Math.min(100, clampedValue + 1);
      historyMaxInput.value = newValue;
    });
  }

  _setupIncognitoToggle() {
    this._setupToggle(incognitoToggle, "isIncognito", (newState) => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("incognito_toggle", "incognitoToggle");
      this.updateIncognitoModal(newState);
    });
  }

  _setupDarkModeToggle() {
    this._setupToggle(darkModeToggle, "isDarkMode", (newState) => {
      if (window.Analytics)
        window.Analytics.trackFeatureClick("dark_mode_toggle", "darkModeToggle");
      applyTheme(newState);
    });
  }

  // Language selector — uses Bootstrap's dropdown plugin (Popper bundled via
  // bootstrap.bundle.min.js). Bootstrap handles open/close, outside-click, and
  // Escape; we only sync the visual state and persist the selection.
  _setupLanguageDropdown() {
    const languageDropdown = document.getElementById("languageDropdown");
    if (!languageDropdown || typeof window === "undefined" || !window.I18nUtils) return;

    const toggleBtn = languageDropdown.querySelector(".language-dropdown-toggle");
    const labelEl = languageDropdown.querySelector(".language-dropdown-label");
    const items = languageDropdown.querySelectorAll(".language-dropdown-item");

    const syncDropdownState = (lang, isDirty = false) => {
      // Gray (placeholder-like) until user makes a change in this session
      toggleBtn.classList.toggle("is-default", !isDirty);
      items.forEach((item) => {
        const isActive = item.dataset.value === lang;
        item.classList.toggle("active", isActive);
        if (isActive && labelEl) {
          // Prefer the i18n message directly so this works regardless of
          // whether popup.js's [data-locale] pass has run yet.
          const localeKey = item.dataset.locale;
          const localized = localeKey ? chrome.i18n.getMessage(localeKey) : "";
          labelEl.textContent = localized || item.textContent;
        }
      });
    };

    syncDropdownState(window.I18nUtils.getCurrentLanguage());

    const optionalModal = document.getElementById("optionalModal");
    if (optionalModal) {
      optionalModal.addEventListener("show.bs.modal", () => {
        syncDropdownState(window.I18nUtils.getCurrentLanguage(), false);
      });
    }

    items.forEach((item) => {
      item.addEventListener("click", async () => {
        const newLang = item.dataset.value;
        syncDropdownState(newLang, true); // user made a change → go dark
        if (newLang === window.I18nUtils.getCurrentLanguage()) return;
        if (window.Analytics)
          window.Analytics.trackFeatureClick("change_language_" + newLang, "languageDropdown");
        // setLanguage now applies the override synchronously, so no reloadOverride needed.
        await window.I18nUtils.setLanguage(newLang);
        if (typeof window.applyI18n === "function") window.applyI18n();
        syncDropdownState(window.I18nUtils.getCurrentLanguage(), true);
        window.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: newLang } }));
      });
    });
  }

  _setupPremiumPanel() {
    paymentButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("payment", "paymentButton");
      chrome.runtime.sendMessage({ action: "extPay" });
    });

    restoreButton.addEventListener("click", () => {
      if (window.Analytics) window.Analytics.trackFeatureClick("restore_payment", "restoreButton");
      chrome.runtime.sendMessage({ action: "restorePay" });
    });

    closeButton.addEventListener("click", () => {
      payment.checkPay();
    });
  }

  // Replace text in a locale element with a link or modal trigger
  _replaceTextWithElement(dataLocale, linkText, replacement) {
    const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
    if (pElement) {
      pElement.innerHTML = pElement.innerHTML.replace(linkText, replacement);
    }
  }

  text2Link(dataLocale, linkText, linkHref) {
    this._replaceTextWithElement(
      dataLocale,
      linkText,
      `<a href="${linkHref}" target="_blank">${linkText}</a>`
    );
  }

  text2Modal(dataLocale, linkText, modalId) {
    this._replaceTextWithElement(
      dataLocale,
      linkText,
      `<a href="#" data-bs-toggle="modal" data-bs-target="#${modalId}">${linkText}</a>`
    );
  }

  updateOptionalModal(startAddr, authUser, historyMax) {
    dirInput.placeholder = startAddr || chrome.i18n.getMessage("dirPlaceholder");
    authUserInput.placeholder = authUser
      ? `authuser=${authUser}`
      : chrome.i18n.getMessage("authUserPlaceholder");
    historyMaxInput.placeholder = historyMax && historyMax > 0 ? String(historyMax) : "10";
    historyMaxInput.value = "";
  }

  _saveHistoryMax() {
    const inputValue = historyMaxInput.value || historyMaxInput.placeholder;
    const historyMax = parseInt(inputValue, 10);

    if (isNaN(historyMax) || historyMax <= 0) {
      chrome.storage.local.set({ historyMax: 10 });
      historyMaxInput.placeholder = "10";
    } else {
      const clampedValue = Math.min(Math.max(historyMax, 1), 100);
      chrome.storage.local.set({ historyMax: clampedValue });
      historyMaxInput.placeholder = String(clampedValue);
      if (window.Analytics)
        window.Analytics.trackFeatureClick("save_history_max", "historyMaxStepper");
    }
    historyMaxInput.value = "";
  }

  updateToggleUI(isActive, textSelector, iconSelector, toggleElement) {
    // Support for legacy text/icon toggle (if elements exist)
    const textEl = document.querySelector(textSelector);
    const iconEl = document.querySelector(iconSelector);

    if (textEl && iconEl) {
      textEl.classList.toggle("d-none", isActive);
      iconEl.classList.toggle("d-none", !isActive);
    }

    toggleElement.classList.toggle("toggle-active", isActive);
  }

  _hideInputButtons(inputElement) {
    const submitButton = inputElement.parentElement.querySelector("button[type='submit']");
    const resetButton = inputElement.parentElement.querySelector(".btn-reset");
    if (submitButton) submitButton.classList.add("d-none");
    if (resetButton) resetButton.classList.add("d-none");
  }

  _setupToggle(toggleElement, storageKey, onToggle) {
    toggleElement.addEventListener("click", () => {
      chrome.storage.local.get(storageKey, (result) => {
        const currentState = result[storageKey] || false;
        const newState = !currentState;
        chrome.storage.local.set({ [storageKey]: newState }, () => {
          onToggle(newState);
        });
      });
    });
  }

  _setupInputButtonToggle(inputElement) {
    const submitButton = inputElement.parentElement.querySelector("button[type='submit']");
    const resetButton = inputElement.parentElement.querySelector(".btn-reset");
    if (!submitButton) return;

    inputElement.addEventListener("input", () => {
      if (inputElement.value.trim() === "") {
        submitButton.classList.add("d-none");
        if (resetButton) {
          const defaultPlaceholder = inputElement.dataset.defaultPlaceholder;
          const hasCustomValue =
            defaultPlaceholder && inputElement.placeholder !== defaultPlaceholder;
          resetButton.classList.toggle("d-none", !hasCustomValue);
        }
      } else {
        submitButton.classList.remove("d-none");
        if (resetButton) resetButton.classList.add("d-none");
      }
    });
  }

  _setupResetButton(inputElement, storageKey, onReset, isNumeric = false) {
    const resetButton = inputElement.parentElement.querySelector(".btn-reset");
    if (!resetButton) return;

    const defaultPlaceholder =
      chrome.i18n.getMessage(inputElement.id.replace("Input", "Placeholder")) ||
      inputElement.placeholder;
    inputElement.dataset.defaultPlaceholder = defaultPlaceholder;

    resetButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (window.Analytics)
        window.Analytics.trackFeatureClick("reset_" + storageKey, "resetButton");

      if (isNumeric) {
        chrome.storage.local.set({ [storageKey]: 0 });
      } else {
        chrome.storage.local.remove(storageKey);
      }

      inputElement.value = "";
      onReset();

      resetButton.classList.add("d-none");
    });
  }

  _updateResetButtonsVisibility() {
    chrome.storage.local.get(["startAddr", "authUser"], (result) => {
      const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
      const authResetButton = authUserInput.parentElement.querySelector(".btn-reset");

      if (dirResetButton) {
        const hasCustomDir = result.startAddr && result.startAddr.trim() !== "";
        dirResetButton.classList.toggle("d-none", !hasCustomDir);
      }

      if (authResetButton) {
        const hasCustomAuth = result.authUser && result.authUser > 0;
        authResetButton.classList.toggle("d-none", !hasCustomAuth);
      }
    });
  }

  _updateApiResetButtonVisibility() {
    chrome.storage.local.get(["geminiApiKey"], (result) => {
      const apiResetButton = apiInput.parentElement.querySelector(".btn-reset");

      if (apiResetButton) {
        const hasApiKey = result.geminiApiKey && result.geminiApiKey.trim() !== "";
        apiResetButton.classList.toggle("d-none", !hasApiKey);
      }
    });
  }

  updateIncognitoModal(isIncognito) {
    this.updateToggleUI(isIncognito, ".incognito-text", ".incognito-icon", incognitoToggle);
  }

  updateDarkModeModal(isDarkMode) {
    this.updateToggleUI(isDarkMode, ".darkmode-text", ".darkmode-icon", darkModeToggle);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Modal;
}
