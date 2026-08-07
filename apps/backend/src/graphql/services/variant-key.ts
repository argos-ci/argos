/**
 * Generates a variant key by sanitizing the given name string.
 *
 * The function performs the following transformations:
 * 1. Removes the browser prefix (chromium, firefox, safari, chrome) followed by a slash.
 * 2. Removes any whitespace followed by "repeat-" and digits, before the extension.
 * 3. Removes any whitespace followed by "vw-" and digits, ending with ".png".
 * 4. Removes any occurrence of " #<digits> (failed).png".
 * 5. Removes any occurrence of "mode-[]" followed by ".png".
 * 6. Removes the ".png" extension.
 * 7. Removes a trailing color-scheme token (" dark", "-dark", " light",
 *    "-light") so light and dark captures of the same screen are variants.
 *
 * @param name - The name string to be sanitized.
 * @returns The sanitized variant key.
 */
export function getVariantKey(name: string): string {
  return (
    name
      .replace(/^(chromium|firefox|safari|chrome)\//, "")
      // `repeatEach` appends the suffix after the viewport one, so it has to go
      // first for the rules below to still match. It is stripped before any
      // extension so ARIA snapshots (`.aria.yml`) are handled too.
      .replace(/\s+repeat-\d+(?=\.|$)/, "")
      .replace(/\s*mode-\[[^[\]]+\]\.png$/, "")
      .replace(/\s+vw-\d+\.png$/, "")
      .replace(/ #\d+ \(failed\)\.png$/, "")
      .replace(/\.png$/, "")
      // There is no canonical suffix for color schemes, so suites encode
      // them ad hoc in the name ("homepage-dark", "homepage dark"): strip
      // the common forms once every other suffix is gone.
      .replace(/[\s-]+(dark|light)$/i, "")
      .trim()
  );
}
