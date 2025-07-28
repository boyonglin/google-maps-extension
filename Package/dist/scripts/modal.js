class Modal {
    addModalListener() {
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

            const encrypted = apiKey ? await encryptApiKey(apiKey) : "";
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

        // Premium panel
        paymentButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "extPay" });
        });

        restoreButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "restorePay" });
        });

        closeButton.addEventListener("click", () => {
            checkPay();
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
}

async function ensureAesKey() {
    const { aesKey } = await chrome.storage.local.get("aesKey");
    if (aesKey) {
        return await crypto.subtle.importKey(
            "jwk",
            aesKey,
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    }
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const jwk = await crypto.subtle.exportKey("jwk", key);
    await chrome.storage.local.set({ aesKey: jwk });
    return key;
}

// Encrypt functions
function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

async function encryptApiKey(apiKey) {
    const key = await ensureAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(apiKey);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
    return bufToB64(iv) + "." + bufToB64(cipher);
}