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
            } else if (/^\d+$/.test(authUser) && authUser > 0) {
                chrome.storage.local.set({ authUser: authUser });
                authUserInput.placeholder = `authuser=${authUser}`;
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

    // Replace text from note with a link
    text2Link(dataLocale, linkText, linkHref) {
        const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            const originalText = pElement.innerHTML;
            const newText = originalText.replace(
                linkText,
                `<a href="${linkHref}" target="_blank">${linkText}</a>`
            );
            pElement.innerHTML = newText;
        }
    }

    text2Modal(dataLocale, linkText, modalId) {
        const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            const originalText = pElement.innerHTML;
            const newText = originalText.replace(
                linkText,
                `<a href="#" data-bs-toggle="modal" data-bs-target="#${modalId}">${linkText}</a>`
            );
            pElement.innerHTML = newText;
        }
    }

    updateOptionalModal(startAddr, authUser) {
        dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
        authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");

        if (startAddr) {
            dirInput.placeholder = startAddr;
        }

        if (authUser) {
            authUserInput.placeholder = `authuser=${authUser}`;
        }
    }

    // Update toggle button UI state
    updateToggleUI(isActive, textSelector, iconSelector, toggleElement) {
        const textEl = document.querySelector(textSelector);
        const iconEl = document.querySelector(iconSelector);

        textEl.classList.toggle("d-none", isActive);
        iconEl.classList.toggle("d-none", !isActive);
        toggleElement.classList.toggle("toggle-active", isActive);
        toggleElement.classList.toggle("toggle-just-off", !isActive);
    }

    // Setup a toggle button with click and mouseleave handlers
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

        toggleElement.addEventListener("mouseleave", () => {
            toggleElement.classList.remove("toggle-just-off");
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