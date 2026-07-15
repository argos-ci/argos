/**
 * URI schemes that must never be used as a navigation/redirect target: they
 * execute script or inline a document in the current origin, so navigating to
 * (or linking) them would be an XSS vector.
 */
const DANGEROUS_URI_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Parse a URL, returning `null` when it is not a valid absolute URL. */
function tryParseUrl(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

/**
 * Whether a URL is safe to hand to `window.location` or an anchor `href` —
 * i.e. it does not use a script-executing scheme.
 */
export function isSafeUri(uri: string): boolean {
  const url = tryParseUrl(uri);
  return url !== null && !DANGEROUS_URI_SCHEMES.has(url.protocol.toLowerCase());
}

/** Whether a URL is a plain web link (http/https). */
export function isHttpUri(uri: string): boolean {
  const url = tryParseUrl(uri);
  return (
    url !== null && ["http:", "https:"].includes(url.protocol.toLowerCase())
  );
}

/**
 * Whether a `redirect_uri` is acceptable to register (RFC 8252): https anywhere,
 * http only for loopback, or any other private-use scheme for native apps (e.g.
 * `vscode://`) — except script-executing schemes, which are always rejected.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  const url = tryParseUrl(uri);
  if (!url || DANGEROUS_URI_SCHEMES.has(url.protocol.toLowerCase())) {
    return false;
  }
  if (url.protocol === "https:") {
    return true;
  }
  if (url.protocol === "http:") {
    return LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
  }
  return true;
}
