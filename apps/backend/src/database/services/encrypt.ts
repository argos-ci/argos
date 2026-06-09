import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

import config from "@/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const IV_DERIVATION_INFO = "argos-iv-derivation";
const DEV_DEFAULT_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

let cachedKey: Buffer | null = null;

/**
 * Derive the 32-byte AES key from the configured secret via SHA-256.
 * Accepts any high-entropy string; throws in production when the insecure
 * default is still in use.
 */
function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const secret = config.get("encryption.key");
  if (
    config.get("env") === "production" &&
    (!secret || secret === DEV_DEFAULT_KEY)
  ) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a strong secret in production. Generate one with: openssl rand -hex 32",
    );
  }
  cachedKey = createHash("sha256").update(secret).digest();
  return cachedKey;
}

/**
 * Derive a deterministic IV from the plaintext so that encrypting the same value
 * always yields the same ciphertext. This keeps the column queryable by equality
 * (e.g. project tokens) at the cost of revealing equal plaintexts.
 */
function deriveDeterministicIv(key: Buffer, plaintext: string): Buffer {
  const ivKey = createHmac("sha256", key).update(IV_DERIVATION_INFO).digest();
  return createHmac("sha256", ivKey)
    .update(plaintext)
    .digest()
    .subarray(0, IV_LENGTH);
}

function encryptWithIv(plaintext: string, iv: Buffer): string {
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Encrypt a value using AES-256-GCM with a random IV.
 */
export function encrypt(plaintext: string): string {
  return encryptWithIv(plaintext, randomBytes(IV_LENGTH));
}

/**
 * Encrypt a value deterministically: the same plaintext always produces the same
 * ciphertext, allowing equality lookups on the encrypted column.
 */
export function encryptDeterministic(plaintext: string): string {
  return encryptWithIv(plaintext, deriveDeterministicIv(getKey(), plaintext));
}

/**
 * Decrypt a value produced by {@link encrypt} or {@link encryptDeterministic}.
 *
 * If the value is not valid ciphertext (e.g. legacy plaintext that has not been
 * migrated yet), it is returned unchanged.
 */
export function decrypt(value: string): string {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(value, "base64");
  } catch {
    return value;
  }

  // Too short to contain an IV, an auth tag and at least an empty ciphertext.
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return value;
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // Not a value we encrypted (auth check failed) — assume legacy plaintext.
    return value;
  }
}
