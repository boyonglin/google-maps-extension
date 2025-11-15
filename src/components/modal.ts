type EncryptApiKeyFn = (apiKey: string) => Promise<string>;

declare const configureElements: HTMLCollectionOf<Element>;
declare const apiInput: HTMLInputElement;
declare const geminiEmptyMessage: HTMLElement;
declare const sendButton: HTMLButtonElement;
declare const dirInput: HTMLInputElement;
declare const authUserInput: HTMLInputElement;
declare const incognitoToggle: HTMLElement;
declare const paymentButton: HTMLButtonElement;
declare const restoreButton: HTMLButtonElement;
declare const payment: { checkPay: () => void };

class Modal {
    private encryptApiKey: EncryptApiKeyFn | null;

    // Allow dependency injection for testing
    constructor(encryptApiKeyFn: EncryptApiKeyFn | null = null) {
        this.encryptApiKey = encryptApiKeyFn;
    }

    // Load crypto module dynamically (for browser extension context)
    async loadCrypto(): Promise<void> {
        if (!this.encryptApiKey) {
            const { encryptApiKey } = await import(chrome.runtime.getURL("dist/utils/crypto.js"));
            this.encryptApiKey = encryptApiKey;
        }
    }

    async addModalListener(): Promise<void> {
        await this.loadCrypto();

        // Shortcuts configuration link
        for (let i = 0; i < configureElements.length; i++) {
            const element = configureElements[i] as HTMLElement;
            element.onclick = function (event: MouseEvent): void {
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
        document.getElementById("apiForm")!.addEventListener("submit", async (event: Event) => {
            event.preventDefault();
            const apiKey = apiInput.value.trim();

            const encrypted = apiKey ? await this.encryptApiKey!(apiKey) : "";
            chrome.storage.local.set({ geminiApiKey: encrypted });

            if (!apiKey) {
                apiInput.placeholder = chrome.i18n.getMessage("apiPlaceholder");
                geminiEmptyMessage.innerText = chrome.i18n.getMessage("geminiFirstMsg");
                sendButton.disabled = true;
                return;
            }

            chrome.runtime.sendMessage(
                { action: "verifyApiKey", apiKey: apiKey },
                ({ valid, error }: { valid?: boolean; error?: string } = {}) => {
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
        const apiModal = document.getElementById("apiModal")!;
        apiModal.addEventListener("hidden.bs.modal", () => {
            apiInput.value = "";
        });

        const optionalModal = document.getElementById("optionalModal")!;
        optionalModal.addEventListener("hidden.bs.modal", () => {
            dirInput.value = "";
            authUserInput.value = "";
        });

        // Save the starting address
        document.getElementById("dirForm")!.addEventListener("submit", (event: Event) => {
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
        document.getElementById("authUserForm")!.addEventListener("submit", (event: Event) => {
            event.preventDefault();

            const authUser = parseInt(authUserInput.value.trim());

            if (authUserInput.value.trim() === "" || authUser === 0 || isNaN(authUser)) {
                chrome.storage.local.set({ authUser: 0 });
                authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");
            } else if (/^\d+$/.test(String(authUser)) && authUser > 0) {
                chrome.storage.local.set({ authUser: authUser });
                authUserInput.placeholder = `authuser=${authUser}`;
            }
        });

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

        const closeButton = document.querySelector(".btn-close")!;
        closeButton.addEventListener("click", () => {
            payment.checkPay();
        });
    }

    // Replace text from note with a link
    text2Link(dataLocale: string, linkText: string, linkHref: string): void {
        const pElement = document.querySelector<HTMLParagraphElement>(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            const originalText = pElement.innerHTML;
            const newText = originalText.replace(
                linkText,
                `<a href="${linkHref}" target="_blank">${linkText}</a>`
            );
            pElement.innerHTML = newText;
        }
    }

    text2Modal(dataLocale: string, linkText: string, modalId: string): void {
        const pElement = document.querySelector<HTMLParagraphElement>(`p[data-locale="${dataLocale}"]`);
        if (pElement) {
            const originalText = pElement.innerHTML;
            const newText = originalText.replace(
                linkText,
                `<a href="#" data-bs-toggle="modal" data-bs-target="#${modalId}">${linkText}</a>`
            );
            pElement.innerHTML = newText;
        }
    }

    updateOptionalModal(startAddr: string | null, authUser: number | null): void {
        dirInput.placeholder = chrome.i18n.getMessage("dirPlaceholder");
        authUserInput.placeholder = chrome.i18n.getMessage("authUserPlaceholder");

        if (startAddr) {
            dirInput.placeholder = startAddr;
        }

        if (authUser) {
            authUserInput.placeholder = `authuser=${authUser}`;
        }
    }

    updateIncognitoModal(isIncognito: boolean): void {
        const incognitoText = document.querySelector<HTMLElement>(".incognito-text")!;
        const incognitoIcon = document.querySelector<HTMLElement>(".incognito-icon")!;

        if (isIncognito) {
            incognitoText.classList.add("d-none");
            incognitoIcon.classList.remove("d-none");
            incognitoToggle.classList.add("incognito-active");
            incognitoToggle.classList.remove("incognito-just-off");
        } else {
            incognitoText.classList.remove("d-none");
            incognitoIcon.classList.add("d-none");
            incognitoToggle.classList.remove("incognito-active");
            incognitoToggle.classList.add("incognito-just-off");
        }
    }
}

// CommonJS export for tests
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = Modal;
}
