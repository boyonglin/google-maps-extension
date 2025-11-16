"use strict";
class Modal {
    // Allow dependency injection for testing
    constructor(encryptApiKeyFn = null) {
        this.encryptApiKey = encryptApiKeyFn;
    }
    // Load crypto module dynamically (for browser extension context)
    async loadCrypto() {
        if (!this.encryptApiKey) {
            const url = chrome.runtime.getURL("dist/utils/crypto.js");
            // Validate URL is from our extension
            if (!url.startsWith(chrome.runtime.getURL(""))) {
                throw new Error("Invalid module URL");
            }
            const { encryptApiKey } = await import(url);
            this.encryptApiKey = encryptApiKey;
        }
    }
    async addModalListener() {
        await this.loadCrypto();
        // Shortcuts configuration link
        for (const elem of Array.from(configureElements)) {
            const element = elem;
            element.onclick = function (event) {
                // Detect user browser
                const userAgent = navigator.userAgent;
                if (/Chrome/i.test(userAgent)) {
                    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
                }
                else if (/Opera|OPR\//i.test(userAgent)) {
                    chrome.tabs.create({ url: "opera://extensions/shortcuts" });
                }
                event.preventDefault();
            };
        }
        // Save the API key
        const apiForm = document.getElementById("apiForm");
        if (apiForm) {
            apiForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const apiKey = apiInput.value.trim();
                if (!this.encryptApiKey) {
                    console.error("Encryption function not loaded");
                    return;
                }
                // Handle async operation properly
                void (async () => {
                    if (!this.encryptApiKey) {
                        return;
                    }
                    const encrypted = apiKey ? await this.encryptApiKey(apiKey) : "";
                    chrome.storage.local.set({ geminiApiKey: encrypted });
                    if (!apiKey) {
                        apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
                        geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
                        sendButton.disabled = true;
                        return;
                    }
                    chrome.runtime.sendMessage({ action: "verifyApiKey", apiKey: apiKey }, ({ valid, error } = {}) => {
                        if (error || !valid) {
                            geminiEmptyMessage.classList.remove("d-none");
                            apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
                            geminiEmptyMessage.innerText = chrome.i18n.getMessage("apiInvalidMsg");
                            sendButton.disabled = true;
                        }
                        else {
                            apiInput.placeholder = "............" + apiKey.slice(-4);
                            geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiEmptyMsg");
                            sendButton.disabled = false;
                        }
                    });
                })();
            });
        }
        this.text2Link("apiNote", "Google AI Studio", "https://aistudio.google.com/app/apikey");
        // Modal close event
        const apiModal = document.getElementById("apiModal");
        if (apiModal) {
            apiModal.addEventListener("hidden.bs.modal", () => {
                apiInput.value = "";
            });
        }
        const optionalModal = document.getElementById("optionalModal");
        if (optionalModal) {
            optionalModal.addEventListener("hidden.bs.modal", () => {
                dirInput.value = "";
                authUserInput.value = "";
            });
        }
        // Save the starting address
        const dirForm = document.getElementById("dirForm");
        if (dirForm) {
            dirForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const startAddr = dirInput.value.trim();
                if (startAddr === "") {
                    chrome.storage.local.remove("startAddr");
                    dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
                }
                else {
                    chrome.storage.local.set({ startAddr: startAddr });
                    dirInput.placeholder = startAddr;
                }
            });
        }
        // Save the authentication user
        const authUserForm = document.getElementById("authUserForm");
        if (authUserForm) {
            authUserForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const authUser = parseInt(authUserInput.value.trim());
                if (authUserInput.value.trim() === "" || authUser === 0 || isNaN(authUser)) {
                    chrome.storage.local.set({ authUser: 0 });
                    authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
                }
                else if (/^\d+$/.test(String(authUser)) && authUser > 0) {
                    chrome.storage.local.set({ authUser: authUser });
                    authUserInput.placeholder = `authuser=${authUser}`;
                }
            });
        }
        // Incognito toggle
        incognitoToggle.addEventListener("click", () => {
            chrome.storage.local.get("isIncognito", ({ isIncognito = false }) => {
                const newState = !isIncognito;
                chrome.storage.local.set({ isIncognito: newState }, () => {
                    this.updateIncognitoModal(newState);
                });
            });
        });
        incognitoToggle.addEventListener("mouseleave", () => {
            incognitoToggle.classList.remove("incognito-just-off");
        });
        // Premium panel
        paymentButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "extPay" });
        });
        restoreButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "restorePay" });
        });
        const closeButton = document.querySelector(".btn-close");
        if (closeButton) {
            closeButton.addEventListener("click", () => {
                payment.checkPay();
            });
        }
    }
    // Replace text from note with a link
    text2Link(dataLocale, linkText, linkHref) {
        const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            // Use safe DOM manipulation instead of innerHTML
            const textContent = pElement.textContent || "";
            const textParts = textContent.split(linkText);
            // Clear and rebuild the element safely
            pElement.textContent = '';
            for (let i = 0; i < textParts.length; i++) {
                pElement.appendChild(document.createTextNode(textParts[i]));
                if (i < textParts.length - 1) {
                    // Create a safe anchor element
                    const anchor = document.createElement('a');
                    anchor.href = linkHref;
                    anchor.target = "_blank";
                    anchor.rel = "noopener noreferrer";
                    anchor.textContent = linkText;
                    pElement.appendChild(anchor);
                }
            }
        }
    }
    text2Modal(dataLocale, linkText, modalId) {
        const pElement = document.querySelector(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            // Use safe DOM manipulation instead of innerHTML
            const textContent = pElement.textContent || "";
            const textParts = textContent.split(linkText);
            // Clear and rebuild the element safely
            pElement.textContent = '';
            for (let i = 0; i < textParts.length; i++) {
                pElement.appendChild(document.createTextNode(textParts[i]));
                if (i < textParts.length - 1) {
                    // Create a safe anchor element
                    const anchor = document.createElement('a');
                    anchor.href = "#";
                    anchor.setAttribute('data-bs-toggle', 'modal');
                    anchor.setAttribute('data-bs-target', `#${modalId}`);
                    anchor.textContent = linkText;
                    pElement.appendChild(anchor);
                }
            }
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
    updateIncognitoModal(isIncognito) {
        const incognitoText = document.querySelector(".incognito-text");
        const incognitoIcon = document.querySelector(".incognito-icon");
        if (incognitoText && incognitoIcon) {
            if (isIncognito) {
                incognitoText.classList.add("d-none");
                incognitoIcon.classList.remove("d-none");
                incognitoToggle.classList.add("incognito-active");
                incognitoToggle.classList.remove("incognito-just-off");
            }
            else {
                incognitoText.classList.remove("d-none");
                incognitoIcon.classList.add("d-none");
                incognitoToggle.classList.remove("incognito-active");
                incognitoToggle.classList.add("incognito-just-off");
            }
        }
    }
}
// CommonJS export for tests
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = Modal;
}
