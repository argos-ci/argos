/**
 * Maps a browser name to its display label. Kept free of logo imports so it can
 * be used eagerly without pulling in the (lazily-loaded) `BrowserIcon` assets.
 */
const browserLabels: Record<string, string> = {
  chrome: "Chrome",
  chromium: "Chromium",
  edge: "Edge",
  electron: "Electron",
  firefox: "Firefox",
  safari: "Safari",
  webkit: "WebKit",
};

/** Returns the display label for a browser name. */
export function getBrowserLabel(name: string): string {
  return (
    browserLabels[name.toLowerCase()] ??
    name.charAt(0).toUpperCase() + name.slice(1)
  );
}
