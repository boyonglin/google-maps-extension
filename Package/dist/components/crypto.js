// uses the AES key to protect geminiApiKey
function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
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

export async function decryptApiKey(stored) {
  if (!stored) return "";
  const [ivB64, dataB64] = stored.split(".");
  if (!ivB64 || !dataB64) return "";
  const key = await ensureAesKey();
  const iv = new Uint8Array(b64ToBuf(ivB64));
  const data = b64ToBuf(dataB64);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

export async function encryptApiKey(apiKey) {
  const key = await ensureAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(apiKey);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  return bufToB64(iv) + "." + bufToB64(cipher);
}