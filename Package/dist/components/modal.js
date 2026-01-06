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
        apiModal.addEventListener("hidden.bs.modal", () => {
            apiInput.value = "";
        });

        const optionalModal = document.getElementById("optionalModal");
        optionalModal.addEventListener("hidden.bs.modal", () => {
            dirInput.value = "";
            authUserInput.value = "";
            historyMaxInput.value = "";
        });

        // Save the starting address
        document.getElementById("dirForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const startAddr = dirInput.value.trim();

            if (startAddr === "") {
                chrome.storage.local.remove("startAddr");
                dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
            } else {
                chrome.storage.local.set({ startAddr: startAddr });
                dirInput.placeholder = startAddr;
            }
        });

        // Save the authentication user
        document.getElementById("authUserForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const authUser = parseInt(authUserInput.value.trim());

            if (authUserInput.value.trim() === "" || authUser === 0 || isNaN(authUser)) {
                chrome.storage.local.set({ authUser: 0 });
                authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
            } else if (authUser > 0) {
                chrome.storage.local.set({ authUser: authUser });
                authUserInput.placeholder = `authuser=${authUser}`;
            }
        });

        // Save the history max limit
        document.getElementById("historyMaxForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const historyMax = parseInt(historyMaxInput.value.trim());

            if (historyMaxInput.value.trim() === "" || isNaN(historyMax) || historyMax <= 0) {
                chrome.storage.local.set({ historyMax: 10 });
                historyMaxInput.placeholder = "10";
            } else {
                const clampedValue = Math.min(Math.max(historyMax, 1), 100);
                chrome.storage.local.set({ historyMax: clampedValue });
                historyMaxInput.placeholder = String(clampedValue);
            }
        });

        // Initialize number input from placeholder when arrows are clicked on empty input
        historyMaxInput.addEventListener("focus", () => {
            if (historyMaxInput.value === "") {
                historyMaxInput.value = historyMaxInput.placeholder || "10";
                historyMaxInput.select();
            }
        });

        // Toggle handlers using shared pattern
        this._setupToggle(incognitoToggle, "isIncognito", (newState) => {
            this.updateIncognitoModal(newState);
        });

        this._setupToggle(darkModeToggle, "isDarkMode", (newState) => {
            applyTheme(newState);
        });

        // Premium panel
        paymentButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "extPay" });
        });

        restoreButton.addEventListener("click", () => {
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
        dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
        authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
        historyMaxInput.placeholder = "10";

        if (startAddr) {
            dirInput.placeholder = startAddr;
        }

        if (authUser) {
            authUserInput.placeholder = `authuser=${authUser}`;
        }

        if (historyMax && historyMax > 0) {
            historyMaxInput.placeholder = String(historyMax);
        }
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