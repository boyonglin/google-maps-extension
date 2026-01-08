class Modal {
    // Allow dependency injection for testing
    constructor(encryptApiKeyFn = null) {
        this.encryptApiKey = encryptApiKeyFn;
    }

    // Load crypto module dynamically (for browser extension context)
    async loadCrypto() {
        if (!this.encryptApiKey) {
            const { encryptApiKey } = await import(chrome.runtime.getURL("dist/utils/crypto.js"));
            this.encryptApiKey = encryptApiKey;
        }
    }

    async addModalListener() {
        await this.loadCrypto();

        // Shortcuts configuration link
        for (let i = 0; i < configureElements.length; i++) {
            configureElements[i].onclick = function (event) {
                if (window.Analytics) window.Analytics.trackFeatureClick("configure_shortcuts", "configureLink");
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

        // Save the API key
        document.getElementById("apiForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            if (window.Analytics) window.Analytics.trackFeatureClick("save_api_key", "apiForm");
            const apiKey = apiInput.value.trim();

            const encrypted = apiKey ? await this.encryptApiKey(apiKey) : "";
            chrome.storage.local.set({ geminiApiKey: encrypted });

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

        this.text2Link(
            "apiNote",
            "Google AI Studio",
            "https://aistudio.google.com/app/apikey"
        );

        // Modal close event
        const apiModal = document.getElementById("apiModal");
        
        // Update reset button when API modal opens
        apiModal.addEventListener("shown.bs.modal", () => {
            this._updateApiResetButtonVisibility();
        });
        
        apiModal.addEventListener("hidden.bs.modal", () => {
            apiInput.value = "";
            this._hideInputButtons(apiInput);
        });

        // Show/hide API submit button based on input content
        this._setupInputButtonToggle(apiInput);
        
        // Setup reset button for API input
        this._setupResetButton(apiInput, "geminiApiKey", () => {
            apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
            geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
            sendButton.disabled = true;
        });

        const optionalModal = document.getElementById("optionalModal");
        
        // Update reset buttons when modal opens
        optionalModal.addEventListener("shown.bs.modal", () => {
            this._updateResetButtonsVisibility();
        });
        
        optionalModal.addEventListener("hidden.bs.modal", () => {
            dirInput.value = "";
            authUserInput.value = "";
            this._hideInputButtons(dirInput);
            this._hideInputButtons(authUserInput);
            
            // Save historyMax value on modal close
            this._saveHistoryMax();
        });

        // Save the starting address
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
        
        // Setup reset button for direction input
        this._setupResetButton(dirInput, "startAddr", () => {
            dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
        });

        // Save the authentication user
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
        
        // Setup reset button for authUser input
        this._setupResetButton(authUserInput, "authUser", () => {
            authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
        }, true);

        // History Max stepper buttons
        const historyMaxDecrement = document.getElementById("historyMaxDecrement");
        const historyMaxIncrement = document.getElementById("historyMaxIncrement");

        historyMaxDecrement.addEventListener("click", () => {
            const currentValue = parseInt(historyMaxInput.value || historyMaxInput.placeholder, 10) || 10;
            // Clamp to valid range first, then decrement
            const clampedValue = Math.min(100, Math.max(1, currentValue));
            const newValue = Math.max(1, clampedValue - 1);
            historyMaxInput.value = newValue;
        });

        historyMaxIncrement.addEventListener("click", () => {
            const currentValue = parseInt(historyMaxInput.value || historyMaxInput.placeholder, 10) || 10;
            // Clamp to valid range first, then increment
            const clampedValue = Math.min(100, Math.max(1, currentValue));
            const newValue = Math.min(100, clampedValue + 1);
            historyMaxInput.value = newValue;
        });

        // Show/hide submit buttons based on input content (search bar behavior)
        this._setupInputButtonToggle(authUserInput);
        this._setupInputButtonToggle(dirInput);

        // Toggle handlers using shared pattern
        this._setupToggle(incognitoToggle, "isIncognito", (newState) => {
            if (window.Analytics) window.Analytics.trackFeatureClick("incognito_toggle", "incognitoToggle");
            this.updateIncognitoModal(newState);
        });

        this._setupToggle(darkModeToggle, "isDarkMode", (newState) => {
            if (window.Analytics) window.Analytics.trackFeatureClick("dark_mode_toggle", "darkModeToggle");
            applyTheme(newState);
        });

        // Premium panel
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
        authUserInput.placeholder = authUser ? `authuser=${authUser}` : chrome.i18n.getMessage("authUserPlaceholder");
        historyMaxInput.placeholder = (historyMax && historyMax > 0) ? String(historyMax) : "10";
        historyMaxInput.value = "";
    }

    // Save history max value to storage
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
            if (window.Analytics) window.Analytics.trackFeatureClick("save_history_max", "historyMaxStepper");
        }
        // Clear value after save, show as placeholder
        historyMaxInput.value = "";
    }

    // Update toggle button UI state (modern toggle switch design)
    updateToggleUI(isActive, textSelector, iconSelector, toggleElement) {
        // Support for legacy text/icon toggle (if elements exist)
        const textEl = document.querySelector(textSelector);
        const iconEl = document.querySelector(iconSelector);

        if (textEl && iconEl) {
            textEl.classList.toggle("d-none", isActive);
            iconEl.classList.toggle("d-none", !isActive);
        }
        
        // Modern toggle switch - just toggle the active class
        toggleElement.classList.toggle("toggle-active", isActive);
    }

    // Hide submit and reset buttons for an input field
    _hideInputButtons(inputElement) {
        const submitButton = inputElement.parentElement.querySelector("button[type='submit']");
        const resetButton = inputElement.parentElement.querySelector(".btn-reset");
        if (submitButton) submitButton.classList.add("d-none");
        if (resetButton) resetButton.classList.add("d-none");
    }

    // Setup a toggle button with click handler
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

    // Setup input field to show/hide submit button based on content (like search bar)
    _setupInputButtonToggle(inputElement) {
        const submitButton = inputElement.parentElement.querySelector("button[type='submit']");
        const resetButton = inputElement.parentElement.querySelector(".btn-reset");
        if (!submitButton) return;

        inputElement.addEventListener("input", () => {
            if (inputElement.value.trim() === "") {
                submitButton.classList.add("d-none");
                // Show reset button if there's a custom placeholder (user setting exists)
                if (resetButton) {
                    const defaultPlaceholder = inputElement.dataset.defaultPlaceholder;
                    const hasCustomValue = defaultPlaceholder && inputElement.placeholder !== defaultPlaceholder;
                    resetButton.classList.toggle("d-none", !hasCustomValue);
                }
            } else {
                submitButton.classList.remove("d-none");
                // Hide reset button when typing
                if (resetButton) resetButton.classList.add("d-none");
            }
        });
    }

    // Setup reset button for an input field
    _setupResetButton(inputElement, storageKey, onReset, isNumeric = false) {
        const resetButton = inputElement.parentElement.querySelector(".btn-reset");
        if (!resetButton) return;

        // Store default placeholder for comparison
        const defaultPlaceholder = chrome.i18n.getMessage(inputElement.id.replace("Input", "Placeholder")) || inputElement.placeholder;
        inputElement.dataset.defaultPlaceholder = defaultPlaceholder;

        resetButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (window.Analytics) window.Analytics.trackFeatureClick("reset_" + storageKey, "resetButton");
            
            // Remove or reset the storage value
            if (isNumeric) {
                chrome.storage.local.set({ [storageKey]: 0 });
            } else {
                chrome.storage.local.remove(storageKey);
            }
            
            // Clear input and reset placeholder
            inputElement.value = "";
            onReset();
            
            // Hide reset button after reset
            resetButton.classList.add("d-none");
        });
    }

    // Update reset buttons visibility based on current stored values
    _updateResetButtonsVisibility() {
        chrome.storage.local.get(["startAddr", "authUser"], (result) => {
            const dirResetButton = dirInput.parentElement.querySelector(".btn-reset");
            const authResetButton = authUserInput.parentElement.querySelector(".btn-reset");
            
            // Show/hide based on whether custom values exist
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

    // Update API reset button visibility based on stored API key
    _updateApiResetButtonVisibility() {
        chrome.storage.local.get(["geminiApiKey"], (result) => {
            const apiResetButton = apiInput.parentElement.querySelector(".btn-reset");
            
            if (apiResetButton) {
                // Check if API key exists (placeholder shows masked key)
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