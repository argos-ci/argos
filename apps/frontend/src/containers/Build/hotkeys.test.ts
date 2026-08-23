import { afterEach, describe, expect, it, vi } from "vitest";

import type { HotkeyEvent, HotkeyName } from "./hotkeys";

/**
 * The platform is read once, when the module evaluates, so each case has to
 * load the module afresh under the platform it is about.
 *
 * Only `platform` is overridden. Spreading `navigator` would not do it: its
 * properties are prototype getters rather than own ones, so the copy comes out
 * empty and every other read breaks somewhere unrelated.
 */
async function loadHotkeys(platform: string) {
  vi.stubGlobal(
    "navigator",
    new Proxy(navigator, {
      get: (target, property, receiver) =>
        property === "platform"
          ? platform
          : Reflect.get(target, property, target ?? receiver),
    }),
  );
  vi.resetModules();
  return import("./hotkeys");
}

function keydown(event: Partial<HotkeyEvent>): HotkeyEvent {
  return {
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...event,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkHotkeyMatches", () => {
  const cases: {
    title: string;
    platform: string;
    hotkey: HotkeyName;
    event: Partial<HotkeyEvent>;
    matches: boolean;
  }[] = [
    {
      title: "⌘Z undoes on macOS",
      platform: "MacIntel",
      hotkey: "undoReviewMark",
      event: { key: "z", code: "KeyZ", metaKey: true },
      matches: true,
    },
    {
      title: "Control+Z does not undo on macOS, where ⌘ is the modifier",
      platform: "MacIntel",
      hotkey: "undoReviewMark",
      event: { key: "z", code: "KeyZ", ctrlKey: true },
      matches: false,
    },
    {
      title: "Ctrl+Z undoes on Windows",
      platform: "Win32",
      hotkey: "undoReviewMark",
      event: { key: "z", code: "KeyZ", ctrlKey: true },
      matches: true,
    },
    {
      title: "the Windows key does not undo on Windows",
      platform: "Win32",
      hotkey: "undoReviewMark",
      event: { key: "z", code: "KeyZ", metaKey: true },
      matches: false,
    },
    // Shift is what tells undo and redo apart, so it has to be forbidden on
    // the one that does not declare it.
    {
      title: "⌘⇧Z does not undo",
      platform: "MacIntel",
      hotkey: "undoReviewMark",
      event: { key: "Z", code: "KeyZ", metaKey: true, shiftKey: true },
      matches: false,
    },
    {
      title: "⌘⇧Z redoes",
      platform: "MacIntel",
      hotkey: "redoReviewMark",
      event: { key: "Z", code: "KeyZ", metaKey: true, shiftKey: true },
      matches: true,
    },
    {
      title: "⌘Z does not redo",
      platform: "MacIntel",
      hotkey: "redoReviewMark",
      event: { key: "z", code: "KeyZ", metaKey: true },
      matches: false,
    },
    // The digit row is shifted on an AZERTY keyboard: the "1" the dialog names
    // arrives as `Digit1` with shift held.
    {
      title: "a shifted digit still goes to the first failure",
      platform: "MacIntel",
      hotkey: "goToFirstFailure",
      event: { key: "1", code: "Digit1", shiftKey: true },
      matches: true,
    },
    {
      title: "an unshifted digit goes to the first failure",
      platform: "MacIntel",
      hotkey: "goToFirstFailure",
      event: { key: "1", code: "Digit1" },
      matches: true,
    },
    {
      title: "the unshifted AZERTY character on that key does not",
      platform: "MacIntel",
      hotkey: "goToFirstFailure",
      event: { key: "&", code: "Digit1" },
      matches: false,
    },
    // "?" cannot be typed without shift, so it must not be demanded twice.
    {
      title: "? opens the shortcuts dialog",
      platform: "MacIntel",
      hotkey: "toggleHotkeysDialog",
      event: { key: "?", code: "Slash", shiftKey: true },
      matches: true,
    },
    // Alt changes the character a key prints too: "[" is ⌥⇧( on a French Mac,
    // so demanding no alt would make "show details" untypeable there.
    {
      title: "an option-typed bracket still shows details",
      platform: "MacIntel",
      hotkey: "showDetails",
      event: { key: "[", code: "Digit5", altKey: true, shiftKey: true },
      matches: true,
    },
    {
      title: "the modifier held with it does not, alt or no alt",
      platform: "MacIntel",
      hotkey: "showDetails",
      event: { key: "[", code: "Digit5", altKey: true, metaKey: true },
      matches: false,
    },
    {
      title: "alt stays forbidden for a key named by its physical code",
      platform: "MacIntel",
      hotkey: "acceptDiff",
      event: { key: "y", code: "KeyY", altKey: true },
      matches: false,
    },
    {
      title: "a plain letter accepts",
      platform: "MacIntel",
      hotkey: "acceptDiff",
      event: { key: "y", code: "KeyY" },
      matches: true,
    },
    {
      title: "the same letter with the modifier held does not",
      platform: "MacIntel",
      hotkey: "acceptDiff",
      event: { key: "y", code: "KeyY", metaKey: true },
      matches: false,
    },
  ];

  it.each(cases)("$title", async ({ platform, hotkey, event, matches }) => {
    const { checkHotkeyMatches, getHotkey } = await loadHotkeys(platform);
    expect(checkHotkeyMatches(getHotkey(hotkey), keydown(event))).toBe(matches);
  });
});

describe("displayKeys", () => {
  it("names the modifier the way macOS does", async () => {
    const { getHotkey } = await loadHotkeys("MacIntel");
    expect(getHotkey("undoReviewMark").displayKeys).toEqual(["⌘", "Z"]);
    expect(getHotkey("redoReviewMark").displayKeys).toEqual(["⌘", "⇧", "Z"]);
  });

  it("spells it out everywhere else, where there is no ⌘ key", async () => {
    const { getHotkey } = await loadHotkeys("Win32");
    expect(getHotkey("undoReviewMark").displayKeys).toEqual(["Ctrl", "Z"]);
    expect(getHotkey("redoReviewMark").displayKeys).toEqual([
      "Ctrl",
      "Shift",
      "Z",
    ]);
  });
});
