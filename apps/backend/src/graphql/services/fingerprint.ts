const FINGERPRINT_PREFIX = "v1:g16:d1:t0.002,0.02,0.08:";
const SHORT_PREFIX = "v1";

/**
 * Encode a fingerprint for URL by removing the version prefix.
 */
export function encodeFingerprint(fingerprint: string): string {
  if (!fingerprint.startsWith(FINGERPRINT_PREFIX)) {
    return fingerprint;
  }
  return `${SHORT_PREFIX}${fingerprint.slice(FINGERPRINT_PREFIX.length)}`;
}

/**
 * Decode a fingerprint from URL by adding the version prefix.
 */
export function decodeFingerprint(token: string): string {
  if (token.startsWith(SHORT_PREFIX)) {
    return `${FINGERPRINT_PREFIX}${token.slice(SHORT_PREFIX.length)}`;
  }
  return token;
}
