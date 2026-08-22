const isMacOS =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

/**
 * A modifier key, named the way the platform names it. Both halves of a
 * shortcut use these: what the reader is told to press, and what the matcher
 * looks for in the event.
 */
export type ModifierKey = "⌘" | "Ctrl" | "⌥" | "Alt" | "⇧" | "Shift";

/**
 * The modifier keys of this platform.
 *
 * macOS names its modifiers with symbols and nothing else; every other
 * platform spells them out, and a Windows keyboard has no ⌘ key at all. `MOD`
 * is the one a shortcut is built on — Command on macOS, Control elsewhere.
 */
export const MOD: ModifierKey = isMacOS ? "⌘" : "Ctrl";
export const ALT: ModifierKey = isMacOS ? "⌥" : "Alt";
export const SHIFT: ModifierKey = isMacOS ? "⇧" : "Shift";
