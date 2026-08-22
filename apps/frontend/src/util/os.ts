export const isMacOS =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

/**
 * How this platform writes its modifier keys, for anything a reader has to
 * find on their own keyboard: a `?` dialog, a tooltip, a menu row.
 *
 * macOS names its modifiers with symbols and nothing else; every other
 * platform spells them out, and a Windows keyboard has no ⌘ key at all. Only
 * the label differs — `MOD` is Command or Control depending on where the app
 * is being read, which is the same key in both cases as far as the shortcut
 * is concerned.
 */
export const MOD = isMacOS ? "⌘" : "Ctrl";
export const ALT = isMacOS ? "⌥" : "Alt";
export const SHIFT = isMacOS ? "⇧" : "Shift";
