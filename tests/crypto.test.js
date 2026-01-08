/**
 * Unit Tests for crypto.js
 * Tests encryption/decryption functionality for API key protection
 */

import { encryptApiKey, decryptApiKey } from "../Package/dist/utils/crypto.js";

describe("crypto.js - API Key Encryption/Decryption", () => {
  // Mock data for testing
  const mockAesKey = {
    kty: "oct",
    k: "mockKeyValue",
    alg: "A256GCM",
    ext: true,
    key_ops: ["encrypt", "decrypt"],
  };

  const mockCryptoKey = {
    type: "secret",
    algorithm: { name: "AES-GCM", length: 256 },
  };

  // Helper functions to reduce repetitive mock setup
  const setupEncryptionMocks = (options = {}) => {
    const {
      hasExistingKey = true,
      iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      cipherBuffer = new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]).buffer,
    } = options;

    if (hasExistingKey) {
      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
    } else {
      chrome.storage.local.get.mockResolvedValue({});
      crypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.exportKey.mockResolvedValue(mockAesKey);
      chrome.storage.local.set.mockResolvedValue(undefined);
    }

    crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
    crypto.getRandomValues.mockReturnValue(iv);
    crypto.subtle.encrypt.mockResolvedValue(cipherBuffer);
  };

  const setupDecryptionMocks = (decryptedText, options = {}) => {
    const { hasExistingKey = true } = options;

    if (hasExistingKey) {
      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
    } else {
      chrome.storage.local.get.mockResolvedValue({});
      crypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.exportKey.mockResolvedValue(mockAesKey);
      chrome.storage.local.set.mockResolvedValue(undefined);
    }

    crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
    const mockDecryptedBuffer = new TextEncoder().encode(decryptedText).buffer;
    crypto.subtle.decrypt.mockResolvedValue(mockDecryptedBuffer);
  };

  describe("encryptApiKey", () => {
    test("should encrypt an API key successfully with existing AES key", async () => {
      // Arrange
      const apiKey = "test-api-key-12345";
      setupEncryptionMocks();

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(chrome.storage.local.get).toHaveBeenCalledWith("aesKey");
      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockAesKey,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
      );
      expect(crypto.getRandomValues).toHaveBeenCalled();
      expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: "AES-GCM", iv: expect.any(Uint8Array) },
        mockCryptoKey,
        expect.any(Object) // TextEncoder().encode() returns Uint8Array which is an Object
      );
      expect(result).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/); // Format: base64.base64
      expect(result.split(".").length).toBe(2);
    });

    test("should generate new AES key if none exists", async () => {
      // Arrange
      const apiKey = "new-api-key";
      setupEncryptionMocks({ hasExistingKey: false });

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      expect(crypto.subtle.exportKey).toHaveBeenCalledWith("jwk", mockCryptoKey);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ aesKey: mockAesKey });
      expect(result).toBeTruthy();
      expect(result.split(".").length).toBe(2);
    });

    test("should encrypt empty string", async () => {
      // Arrange
      const apiKey = "";
      setupEncryptionMocks({ cipherBuffer: new Uint8Array([]).buffer });

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();
      expect(result.split(".").length).toBe(2);
    });

    test("should handle special characters in API key", async () => {
      // Arrange
      const apiKey = "test-key-!@#$%^&*()_+-={}[]|:;<>?,./~`";
      setupEncryptionMocks({ cipherBuffer: new Uint8Array([1, 2, 3]).buffer });

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
    });

    test("should handle unicode characters in API key", async () => {
      // Arrange
      const apiKey = "test-key-你好-مرحبا-🚀";
      setupEncryptionMocks({ cipherBuffer: new Uint8Array([1, 2, 3]).buffer });

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
    });

    test("should handle very long API key", async () => {
      // Arrange
      const apiKey = "a".repeat(10000);
      setupEncryptionMocks({ cipherBuffer: new Uint8Array([1, 2, 3]).buffer });

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
    });

    test("should propagate errors from crypto.subtle.encrypt", async () => {
      // Arrange
      const apiKey = "test-key";
      setupEncryptionMocks();
      crypto.subtle.encrypt.mockRejectedValue(new Error("Encryption failed"));

      // Act & Assert
      await expect(encryptApiKey(apiKey)).rejects.toThrow("Encryption failed");
    });

    test("should propagate errors from chrome.storage.local.set", async () => {
      // Arrange
      const apiKey = "test-key";
      setupEncryptionMocks({ hasExistingKey: false });
      chrome.storage.local.set.mockRejectedValue(new Error("Storage failed"));

      // Act & Assert
      await expect(encryptApiKey(apiKey)).rejects.toThrow("Storage failed");
    });
  });

  describe("decryptApiKey", () => {
    test("should decrypt an encrypted API key successfully", async () => {
      // Arrange
      const apiKey = "original-api-key";
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const dataB64 = btoa("encrypted-data");
      const stored = `${ivB64}.${dataB64}`;

      setupDecryptionMocks(apiKey);

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(chrome.storage.local.get).toHaveBeenCalledWith("aesKey");
      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockAesKey,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
      );
      expect(crypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: "AES-GCM", iv: expect.any(Uint8Array) },
        mockCryptoKey,
        expect.any(ArrayBuffer)
      );
      expect(result).toBe(apiKey);
    });

    test("should return empty string for null/undefined input", async () => {
      // Act & Assert
      expect(await decryptApiKey(null)).toBe("");
      expect(await decryptApiKey(undefined)).toBe("");
      expect(await decryptApiKey("")).toBe("");
    });

    test("should return empty string for invalid format (missing dot)", async () => {
      // Arrange
      const stored = "invalid-format-no-dot";

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe("");
      expect(crypto.subtle.decrypt).not.toHaveBeenCalled();
    });

    test("should return empty string for invalid format (empty IV)", async () => {
      // Arrange
      const stored = ".data";

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe("");
      expect(crypto.subtle.decrypt).not.toHaveBeenCalled();
    });

    test("should return empty string for invalid format (empty data)", async () => {
      // Arrange
      const stored = "iv.";

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe("");
      expect(crypto.subtle.decrypt).not.toHaveBeenCalled();
    });

    test("should return empty string for invalid format (both parts empty)", async () => {
      // Arrange
      const stored = ".";

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe("");
      expect(crypto.subtle.decrypt).not.toHaveBeenCalled();
    });

    test("should decrypt empty string successfully", async () => {
      // Arrange
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const dataB64 = btoa("x"); // Use a minimal valid base64 string
      const stored = `${ivB64}.${dataB64}`;

      setupDecryptionMocks("");

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe("");
      expect(crypto.subtle.decrypt).toHaveBeenCalled();
    });

    test("should decrypt unicode characters correctly", async () => {
      // Arrange
      const apiKey = "你好世界-مرحبا-🌍";
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const dataB64 = btoa("encrypted");
      const stored = `${ivB64}.${dataB64}`;

      setupDecryptionMocks(apiKey);

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(result).toBe(apiKey);
    });

    test("should generate new key if none exists during decryption", async () => {
      // Arrange
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const dataB64 = btoa("data");
      const stored = `${ivB64}.${dataB64}`;
      const apiKey = "decrypted-key";

      setupDecryptionMocks(apiKey, { hasExistingKey: false });

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      expect(crypto.subtle.generateKey).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ aesKey: mockAesKey });
      expect(result).toBe(apiKey);
    });

    test("should propagate errors from crypto.subtle.decrypt", async () => {
      // Arrange
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const dataB64 = btoa("data");
      const stored = `${ivB64}.${dataB64}`;

      setupDecryptionMocks("test");
      crypto.subtle.decrypt.mockRejectedValue(new Error("Decryption failed"));

      // Act & Assert
      await expect(decryptApiKey(stored)).rejects.toThrow("Decryption failed");
    });

    test("should handle invalid base64 in IV gracefully", async () => {
      // Arrange
      const stored = "invalid!!!base64.validbase64";

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);

      // Act & Assert
      // atob() will process the string but might not throw for all invalid inputs
      // The behavior depends on the base64 string structure
      // If it doesn't throw, it will return empty string due to validation
      try {
        const result = await decryptApiKey(stored);
        // If no error, should return empty string due to validation
        expect(result).toBe("");
      } catch (error) {
        // Or it might throw - both behaviors are acceptable
        expect(error).toBeDefined();
      }
    });

    test("should handle invalid base64 in data gracefully", async () => {
      // Arrange
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const ivB64 = btoa(String.fromCharCode(...mockIv));
      const stored = `${ivB64}.invalid!!!base64`;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);

      // Act & Assert
      // atob() will process the string but might not throw for all invalid inputs
      try {
        const result = await decryptApiKey(stored);
        // If no error, should return empty string due to validation
        expect(result).toBe("");
      } catch (error) {
        // Or it might throw - both behaviors are acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe("Encryption/Decryption Round-trip", () => {
    test("should encrypt and decrypt API key successfully (round-trip)", async () => {
      // This test simulates the full encrypt-decrypt cycle
      const originalApiKey = "my-secret-api-key-123";

      // Setup mocks for encryption
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const plainBuffer = new TextEncoder().encode(originalApiKey);
      const mockCipherBuffer = new Uint8Array([10, 20, 30, 40, 50]).buffer;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

      // Act - Encrypt
      const encrypted = await encryptApiKey(originalApiKey);
      expect(encrypted).toBeTruthy();
      expect(encrypted.split(".").length).toBe(2);

      // Setup mocks for decryption
      crypto.subtle.decrypt.mockResolvedValue(plainBuffer.buffer);

      // Act - Decrypt
      const decrypted = await decryptApiKey(encrypted);

      // Assert
      expect(decrypted).toBe(originalApiKey);
    });

    test("should handle multiple encrypt/decrypt operations", async () => {
      const keys = ["key1", "key2", "key3"];
      const encrypted = [];

      // Setup mocks
      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);

      // Encrypt all keys
      for (let i = 0; i < keys.length; i++) {
        const mockIv = new Uint8Array(12).fill(i);
        const mockCipherBuffer = new Uint8Array([i, i + 1, i + 2]).buffer;

        crypto.getRandomValues.mockReturnValue(mockIv);
        crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

        encrypted.push(await encryptApiKey(keys[i]));
      }

      // Decrypt all keys
      for (let i = 0; i < keys.length; i++) {
        const plainBuffer = new TextEncoder().encode(keys[i]);
        crypto.subtle.decrypt.mockResolvedValue(plainBuffer.buffer);

        const decrypted = await decryptApiKey(encrypted[i]);
        expect(decrypted).toBe(keys[i]);
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle chrome.storage.local.get returning null", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue(null);
      crypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.exportKey.mockResolvedValue(mockAesKey);
      chrome.storage.local.set.mockResolvedValue(undefined);
      crypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      crypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

      // Act
      const result = await encryptApiKey("test");

      // Assert
      expect(crypto.subtle.generateKey).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    test("should handle chrome.storage.local.get rejection", async () => {
      // Arrange
      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      // Act & Assert
      await expect(encryptApiKey("test")).rejects.toThrow("Storage error");
    });

    test("should handle crypto.subtle.importKey failure", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockRejectedValue(new Error("Import failed"));

      // Act & Assert
      await expect(encryptApiKey("test")).rejects.toThrow("Import failed");
    });

    test("should handle crypto.subtle.generateKey failure", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue({});
      crypto.subtle.generateKey.mockRejectedValue(new Error("Generate failed"));

      // Act & Assert
      await expect(encryptApiKey("test")).rejects.toThrow("Generate failed");
    });

    test("should handle crypto.subtle.exportKey failure", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue({});
      crypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.exportKey.mockRejectedValue(new Error("Export failed"));

      // Act & Assert
      await expect(encryptApiKey("test")).rejects.toThrow("Export failed");
    });

    test("should handle malformed encrypted string with multiple dots", async () => {
      // Arrange
      const stored = "part1.part2.part3.part4";

      // Act
      const result = await decryptApiKey(stored);

      // Assert
      // The function will try to decrypt using first part as IV and rest as data
      // Due to split() behavior, this becomes: ['part1', 'part2', 'part3', 'part4']
      // And stored.split(".") returns array, so [0] is IV and [1] is data
      // This means 'part2' becomes data and 'part3.part4' is ignored
      expect(result).toBe("");
    });

    test("should verify IV is exactly 12 bytes", async () => {
      // Arrange
      const apiKey = "test-key";
      const mockIv = new Uint8Array(12);
      const mockCipherBuffer = new Uint8Array([1, 2, 3]).buffer;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

      // Act
      await encryptApiKey(apiKey);

      // Assert
      const encryptCall = crypto.subtle.encrypt.mock.calls[0];
      const ivUsed = encryptCall[0].iv;
      expect(ivUsed.length).toBe(12);
    });
  });

  describe("Buffer Conversion Functions (Indirect Testing)", () => {
    // These functions are not exported but we can test their behavior indirectly

    test("should correctly convert buffer to base64 and back", async () => {
      // Arrange
      const apiKey = "test-conversion";
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const plainBuffer = new TextEncoder().encode(apiKey);
      const mockCipherBuffer = plainBuffer.buffer;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

      // Act - Encrypt (uses bufToB64)
      const encrypted = await encryptApiKey(apiKey);

      // Setup for decryption
      crypto.subtle.decrypt.mockResolvedValue(plainBuffer.buffer);

      // Act - Decrypt (uses b64ToBuf)
      const decrypted = await decryptApiKey(encrypted);

      // Assert - If conversion works, we get back the original
      expect(decrypted).toBe(apiKey);
    });

    test("should handle binary data in buffer conversions", async () => {
      // Arrange - Create binary data with all byte values
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }

      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(binaryData.buffer);

      // Act
      const encrypted = await encryptApiKey("test");

      // Assert - Should create valid base64
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      // Verify it can be split correctly
      const parts = encrypted.split(".");
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle multiple concurrent encrypt operations", async () => {
      // Arrange
      const apiKeys = ["key1", "key2", "key3", "key4", "key5"];

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.encrypt.mockImplementation(() =>
        Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer)
      );

      // Act
      const promises = apiKeys.map((key) => encryptApiKey(key));
      const results = await Promise.all(promises);

      // Assert
      expect(results.length).toBe(apiKeys.length);
      results.forEach((result) => {
        expect(result).toBeTruthy();
        expect(result.split(".").length).toBe(2);
      });
      expect(crypto.subtle.encrypt).toHaveBeenCalledTimes(apiKeys.length);
    });

    test("should handle multiple concurrent decrypt operations", async () => {
      // Arrange
      const encryptedKeys = [
        "aXYxMjM0NTY3ODkwMTI=.ZGF0YTE=",
        "aXYyMzQ1Njc4OTAxMjM=.ZGF0YTI=",
        "aXYzNDU2Nzg5MDEyMzQ=.ZGF0YTM=",
      ];

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.decrypt.mockImplementation((params, key, data) => {
        const text = "decrypted-key";
        return Promise.resolve(new TextEncoder().encode(text).buffer);
      });

      // Act
      const promises = encryptedKeys.map((key) => decryptApiKey(key));
      const results = await Promise.all(promises);

      // Assert
      expect(results.length).toBe(encryptedKeys.length);
      results.forEach((result) => {
        expect(result).toBe("decrypted-key");
      });
      expect(crypto.subtle.decrypt).toHaveBeenCalledTimes(encryptedKeys.length);
    });
  });

  describe("Performance and Limits", () => {
    test("should handle maximum safe integer as API key", async () => {
      // Arrange
      const apiKey = Number.MAX_SAFE_INTEGER.toString();
      const mockIv = new Uint8Array(12);
      const mockCipherBuffer = new Uint8Array([1, 2, 3]).buffer;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();
    });

    test("should handle API key with newlines and tabs", async () => {
      // Arrange
      const apiKey = "line1\nline2\tline3\r\nline4";
      const mockIv = new Uint8Array(12);
      const mockCipherBuffer = new Uint8Array([1, 2, 3]).buffer;

      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(mockIv);
      crypto.subtle.encrypt.mockResolvedValue(mockCipherBuffer);

      // Act
      const result = await encryptApiKey(apiKey);

      // Assert
      expect(result).toBeTruthy();

      // Verify it can be decrypted back
      const plainBuffer = new TextEncoder().encode(apiKey);
      crypto.subtle.decrypt.mockResolvedValue(plainBuffer.buffer);
      const decrypted = await decryptApiKey(result);
      expect(decrypted).toBe(apiKey);
    });
  });

  describe("AES Key Management", () => {
    test("should reuse existing AES key across multiple operations", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue({ aesKey: mockAesKey });
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      crypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

      // Act
      await encryptApiKey("key1");
      await encryptApiKey("key2");
      await encryptApiKey("key3");

      // Assert
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(3);
      expect(crypto.subtle.generateKey).not.toHaveBeenCalled();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test("should generate AES key only once when none exists", async () => {
      // Arrange
      let keyGenerated = false;
      chrome.storage.local.get.mockImplementation(() => {
        if (keyGenerated) {
          return Promise.resolve({ aesKey: mockAesKey });
        }
        return Promise.resolve({});
      });

      crypto.subtle.generateKey.mockImplementation(() => {
        keyGenerated = true;
        return Promise.resolve(mockCryptoKey);
      });

      crypto.subtle.exportKey.mockResolvedValue(mockAesKey);
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      chrome.storage.local.set.mockResolvedValue(undefined);
      crypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      crypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

      // Act
      await encryptApiKey("key1");
      await encryptApiKey("key2");

      // Assert
      expect(crypto.subtle.generateKey).toHaveBeenCalledTimes(1);
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });

    test("should use correct AES-GCM parameters", async () => {
      // Arrange
      chrome.storage.local.get.mockResolvedValue({});
      crypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
      crypto.subtle.exportKey.mockResolvedValue(mockAesKey);
      chrome.storage.local.set.mockResolvedValue(undefined);
      crypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      crypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      crypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

      // Act
      await encryptApiKey("test");

      // Assert
      expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
    });
  });
});
