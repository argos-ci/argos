/**
 * Check if a URL can be parsed.
 */
export function canParseURL(url: string) {
  // If browser does not support URL, return false.
  if (typeof URL !== "function") {
    return false;
  }

  // If browser supports URL.canParse, use it.
  if (typeof URL.canParse === "function") {
    return URL.canParse(url);
  }

  // Otherwise, try to parse the URL and return true if it succeeds.
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
