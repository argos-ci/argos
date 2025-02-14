/**
 * Generates a variant key by sanitizing the given name string.
 *
 * The function performs the following transformations:
 * 1. Removes the browser prefix (chromium, firefox, safari, chrome) followed by a slash.
 * 2. Removes any whitespace followed by "vw-" and digits, ending with ".png".
 * 3. Removes any occurrence of " #<digits> (failed).png".
 * 4. Removes the ".png" extension.
 *
 * @param name - The name string to be sanitized.
 * @returns The sanitized variant key.
 */
export function getVariantKey(name: string): string {
  return name
    .replace(/^(chromium|firefox|safari|chrome)\//, "")
    .replace(/\s+vw-\d+\.png$/, "")
    .replace(/ #\d+ \(failed\)\.png$/, "")
    .replace(/\.png$/, "")
    .trim();
}
