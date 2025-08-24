/**
 * Capitalize the first letter of a string
 */
export function firstUpper(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to a maximum length and add an ellipsis.
 * Truncation happens between words if possible.
 */
export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) {
    return str;
  }
  const words = str.split(" ");
  let result = "";
  for (let i = 0; i < words.length; i++) {
    const next = result ? result + " " + words[i] : words[i]!;
    if (next.length + 1 > maxLength) {
      // +1 for ellipsis
      break;
    }
    result = next;
  }
  if (!result) {
    // If the first word is too long, fall back to character-based truncation
    return str.slice(0, maxLength - 1) + "…";
  }
  return result + "…";
}
