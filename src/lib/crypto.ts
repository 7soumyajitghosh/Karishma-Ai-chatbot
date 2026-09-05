/**
 * Client-Side End-to-End Encryption (E2EE) Module for Karishma AI
 *
 * Uses the standard W3C Web Crypto API (`crypto.subtle`) with:
 * - Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - Key size: 256 bits
 * - Nonce/IV: 96-bit (12 bytes) cryptographically secure random per message
 * - Tag: 128-bit authentication tag (enforces ciphertext integrity)
 * - Key derivation: PBKDF2 with SHA-256 (100,000 iterations)
 *
 * The server never sees or stores plaintext encryption keys.
 */

// Universal crypto reference supporting both modern browser / WebView and Node.js test environments
const cryptoSubtle = (() => {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (crypto.subtle) is not available in this environment.");
})();

const cryptoRandom = (() => {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    return (buf: Uint8Array) => window.crypto.getRandomValues(buf);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    return (buf: Uint8Array) => globalThis.crypto.getRandomValues(buf);
  }
  throw new Error("Secure random generator is not available in this environment.");
})();

/**
 * Base64 encoding/decoding utilities that work reliably in browser and Node
 */
function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

function base64ToBuffer(b64: string): Uint8Array {
  const clean = b64.trim();
  const binary = typeof atob !== "undefined" ? atob(clean) : Buffer.from(clean, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Envelope prefix for versioned authenticated ciphertexts
 * Format: enc:v1:<base64-iv>:<base64-ciphertext-and-tag>
 */
export const ENVELOPE_PREFIX = "enc:v1:";

/**
 * Generate a new random 256-bit AES-GCM CryptoKey
 */
export async function generateE2EEKey(): Promise<CryptoKey> {
  return await cryptoSubtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Export CryptoKey to a clean Base64 string for on-device storage or backup
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await cryptoSubtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

/**
 * Import a Base64 string back into an AES-GCM CryptoKey
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const keyBytes = base64ToBuffer(base64Key);
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid AES-256 key length: expected 32 bytes, got ${keyBytes.length}`);
  }
  return await cryptoSubtle.importKey(
    "raw",
    keyBytes,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive an AES-256-GCM key from a user passphrase using PBKDF2 + SHA-256
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltHex: string = "karishma_e2ee_default_salt"
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passBytes = encoder.encode(passphrase);
  const saltBytes = encoder.encode(saltHex);

  const baseKey = await cryptoSubtle.importKey(
    "raw",
    passBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await cryptoSubtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Checks whether a given string is an encrypted ciphertext envelope
 */
export function isEncrypted(text: unknown): boolean {
  if (typeof text !== "string") return false;
  return text.startsWith(ENVELOPE_PREFIX);
}

/**
 * Encrypt plaintext using AES-256-GCM with a freshly generated 96-bit random IV
 * Returns an envelope string: enc:v1:<iv_b64>:<ct_b64>
 */
export async function encryptPayload(plaintext: string, key: CryptoKey): Promise<string> {
  if (typeof plaintext !== "string") {
    plaintext = String(plaintext || "");
  }

  // Generate 96-bit (12 bytes) cryptographically secure random IV
  const iv = new Uint8Array(12);
  cryptoRandom(iv);

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const encryptedBuffer = await cryptoSubtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedData
  );

  const ivB64 = bufferToBase64(iv);
  const ctB64 = bufferToBase64(encryptedBuffer);

  return `${ENVELOPE_PREFIX}${ivB64}:${ctB64}`;
}

export interface DecryptResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Decrypt an AES-256-GCM envelope string.
 * - Verifies ciphertext integrity with the 128-bit authentication tag.
 * - If tampering or wrong key is detected, returns a safe error indicator.
 * - Backward-compatible: If the text is not in enc:v1 format, returns original text safely.
 */
export async function decryptPayload(
  payload: string,
  key: CryptoKey | null
): Promise<DecryptResult> {
  if (typeof payload !== "string") {
    return { text: "", success: true };
  }

  // Backward compatibility: If message was saved in legacy plaintext format, return as-is
  if (!payload.startsWith(ENVELOPE_PREFIX)) {
    return { text: payload, success: true };
  }

  if (!key) {
    return {
      text: "[Encrypted Message — Key Required to Decrypt]",
      success: false,
      error: "Missing encryption key",
    };
  }

  const parts = payload.substring(ENVELOPE_PREFIX.length).split(":");
  if (parts.length !== 2) {
    return {
      text: "[Corrupted Encrypted Payload]",
      success: false,
      error: "Malformed ciphertext envelope",
    };
  }

  try {
    const iv = base64ToBuffer(parts[0]);
    const ciphertext = base64ToBuffer(parts[1]);

    const decryptedBuffer = await cryptoSubtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return {
      text: decoder.decode(decryptedBuffer),
      success: true,
    };
  } catch (err: any) {
    return {
      text: "[Decryption Failed — Authentication Tag Mismatch or Wrong Key]",
      success: false,
      error: err?.message || "Cryptographic integrity verification failed",
    };
  }
}

/**
 * Format a 32-byte Base64 key into a readable 4-character chunked recovery string
 * Example: KARM-A1B2-C3D4-E5F6-G7H8-...
 */
export function formatRecoveryKey(base64Key: string): string {
  const clean = base64Key.replace(/[^a-zA-Z0-9+/=]/g, "");
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    chunks.push(clean.substring(i, i + 4));
  }
  return `KARM-${chunks.join("-")}`;
}

/**
 * Parse a formatted recovery string back to standard Base64
 */
export function parseRecoveryKey(formattedPhrase: string): string {
  let cleaned = formattedPhrase.trim();
  if (cleaned.toUpperCase().startsWith("KARM-")) {
    cleaned = cleaned.substring(5);
  }
  return cleaned.replace(/-/g, "").replace(/\s+/g, "");
}

/**
 * Client-side Storage Utilities for Device Key Management
 * Keys are isolated per user account and never transmitted to the server.
 */
function getStorageKeyForUser(userId?: string | null): string {
  const id = (userId || "guest").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `karishma_e2ee_key_${id}`;
}

export function saveUserE2EEKey(userId: string | null | undefined, base64Key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const storageKey = getStorageKeyForUser(userId);
    localStorage.setItem(storageKey, base64Key.trim());
    // Also save as current active key for quick session resume
    localStorage.setItem("karishma_e2ee_active_key", base64Key.trim());
  } catch {}
}

export function getUserE2EEKey(userId: string | null | undefined): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const storageKey = getStorageKeyForUser(userId);
    const userKey = localStorage.getItem(storageKey);
    if (userKey) return userKey.trim();
    // Fallback to active key if present
    const activeKey = localStorage.getItem("karishma_e2ee_active_key");
    return activeKey ? activeKey.trim() : null;
  } catch {
    return null;
  }
}

export function clearUserE2EEKey(userId: string | null | undefined): void {
  if (typeof localStorage === "undefined") return;
  try {
    const storageKey = getStorageKeyForUser(userId);
    localStorage.removeItem(storageKey);
    localStorage.removeItem("karishma_e2ee_active_key");
  } catch {}
}
