/**
 * Crypto utility functions for API key encryption
 * Uses AES-GCM encryption to protect the Gemini API key
 * @module utils/crypto
 */

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buf - Buffer to convert
 * @returns {string} Base64 encoded string
 */
function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} b64 - Base64 encoded string
 * @returns {ArrayBuffer} Decoded buffer
 */
function b64ToBuf(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

/**
 * Ensure AES encryption key exists in storage, create if needed
 * @returns {Promise<CryptoKey>} The AES-GCM encryption key
 */
async function ensureAesKey() {
    const result = await chrome.storage.local.get("aesKey");
    const aesKey = result ? result.aesKey : null;
    if (aesKey) {
        return await crypto.subtle.importKey("jwk", aesKey, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
    }
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const jwk = await crypto.subtle.exportKey("jwk", key);
    await chrome.storage.local.set({ aesKey: jwk });
    return key;
}

/**
 * Decrypt an encrypted API key from storage
 * @param {string} stored - Encrypted API key in format "iv.data" (both base64)
 * @returns {Promise<string>} Decrypted API key
 */
export async function decryptApiKey(stored) {
    if (!stored)
        return "";
    const [ivB64, dataB64] = stored.split(".");
    if (!ivB64 || !dataB64)
        return "";
    const key = await ensureAesKey();
    const iv = new Uint8Array(b64ToBuf(ivB64));
    const data = b64ToBuf(dataB64);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plain);
}

/**
 * Encrypt an API key for secure storage
 * @param {string} apiKey - The API key to encrypt
 * @returns {Promise<string>} Encrypted key in format "iv.data" (both base64)
 */
export async function encryptApiKey(apiKey) {
    const key = await ensureAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(apiKey);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
    return bufToB64(iv) + "." + bufToB64(cipher);
}
//# sourceMappingURL=crypto.js.map