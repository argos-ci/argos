import { isMacOS } from "@/util/os";

export const MOD = isMacOS ? "⌘" : "Ctrl";
export const ALT = isMacOS ? "⌥" : "Alt";
export const SHIFT = isMacOS ? "⇧" : "Shift";
export const LINK_KEYS = [MOD, "K"];
