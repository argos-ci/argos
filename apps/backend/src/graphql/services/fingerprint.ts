const FINGERPRINT_PREFIX = "v1:g16:d1:t0.002,0.02,0.08";

/**
 * Encode a fingerprint for URL by removing the version prefix.
 */
export function encodeFingerprint(fingerprint: string): string {
  const prefix = `${FINGERPRINT_PREFIX}:`;
  if (!fingerprint.startsWith(prefix)) {
    throw new Error("Invalid fingerprint format");
  }
  return fingerprint.slice(prefix.length);
}

/**
 * Decode a fingerprint from URL by adding the version prefix.
 */
export function decodeFingerprint(token: string): string {
  const prefix = `${FINGERPRINT_PREFIX}:`;
  if (token.startsWith(prefix)) {
    return token;
  }
  if (token.includes(":")) {
    throw new Error("Invalid fingerprint token");
  }
  return `${prefix}${token}`;
}
