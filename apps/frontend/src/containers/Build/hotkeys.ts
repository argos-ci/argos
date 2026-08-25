import { ALT, MOD, SHIFT, type ModifierKey } from "@/util/os";

/**
 * The parts of a keyboard event a hotkey is matched against.
 */
export type HotkeyEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
>;

export type HotkeyEnv = "test" | "build" | "media";

export type Hotkey = {
  /**
   * The combination to match. A modifier is named by {@link ModifierKey}; the
   * key itself is either a physical code (`KeyZ`, `ArrowUp`) or the character
   * it prints ("1", "?"), which is what to use whenever the character is what
   * the reader is looking for on their keyboard.
   */
  keys: string[];
  /** The same combination, as a reader reads it. */
  displayKeys: string[];
  description: string;
  envs: Array<HotkeyEnv>;
  /** Listed in a sub-list of its group, headed by this name. */
  section?: string;
};

export type HotkeyGroup = {
  name: string;
  /**
   * Optional per name: read as a group of *all* the hotkeys, only the ones
   * this group declares are there. `satisfies` still checks each declaration.
   */
  hotkeys: Partial<Record<string, Hotkey>>;
};

const hotkeyGroups = [
  {
    name: "General",
    hotkeys: {
      toggleHotkeysDialog: {
        keys: ["?"],
        displayKeys: ["?"],
        description: "Open this dialog",
        envs: ["test", "build", "media"],
      },
      enterSearchMode: {
        keys: [MOD, "KeyF"],
        displayKeys: [MOD, "F"],
        description: "Find snapshot",
        envs: ["build"],
      },
      leaveSearchMode: {
        keys: ["Escape"],
        displayKeys: ["Esc"],
        description: "Exit search",
        envs: ["build"],
      },
      toggleFilters: {
        keys: ["KeyF"],
        displayKeys: ["F"],
        description: "Open filters",
        envs: ["build"],
      },
    },
  },
  {
    name: "Navigation",
    hotkeys: {
      startReview: {
        keys: ["Enter"],
        displayKeys: ["↵"],
        description: "Review changes",
        envs: ["build"],
      },
      goToPreviousDiff: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous snapshot",
        envs: ["test", "build"],
      },
      goToNextDiff: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next snapshot",
        envs: ["test", "build"],
      },
      // The same keys as the two above, named apart so the `?` dialog can say
      // "media" where a media page is what the reader is looking at. Only one
      // pair is ever mounted, so they never contend.
      goToPreviousMedia: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous media",
        envs: ["media"],
      },
      goToNextMedia: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next media",
        envs: ["media"],
      },
      toggleDiffGroup: {
        keys: ["KeyG"],
        displayKeys: ["G"],
        description: "Toggle group",
        envs: ["build"],
      },
      switchViewport: {
        keys: ["KeyV"],
        displayKeys: ["V"],
        description: "Switch viewport",
        envs: ["build"],
      },
      switchBrowser: {
        keys: ["KeyB"],
        displayKeys: ["B"],
        description: "Switch browser",
        envs: ["build"],
      },
      switchStoryMode: {
        keys: ["KeyM"],
        displayKeys: ["M"],
        description: "Switch story mode",
        envs: ["build"],
      },
      goToFirstFailure: {
        keys: ["1"],
        displayKeys: ["1"],
        description: "Go to first failure screenshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstChanged: {
        keys: ["2"],
        displayKeys: ["2"],
        description: "Go to first changed snapshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstAdded: {
        keys: ["3"],
        displayKeys: ["3"],
        description: "Go to first added snapshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstRemoved: {
        keys: ["4"],
        displayKeys: ["4"],
        description: "Go to first removed snapshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstUnchanged: {
        keys: ["5"],
        displayKeys: ["5"],
        description: "Go to first unchanged snapshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstRetryFailure: {
        keys: ["6"],
        displayKeys: ["6"],
        description: "Go to first retried failure screenshot",
        envs: ["build"],
        section: "Jump to first…",
      },
      goToFirstIgnored: {
        keys: ["7"],
        displayKeys: ["7"],
        description: "Go to first ignored snapshot",
        envs: ["build"],
        section: "Jump to first…",
      },
    },
  },
  {
    name: "Comparison",
    hotkeys: {
      // In the order `ViewToggle` puts them in.
      //
      // A media pair is compared with the same controls as a build's snapshot,
      // so it answers to the same keys. The wording is the build's because the
      // two sides are the same two things: a media's "before" is the baseline
      // it is compared against, and its "after" is what changed.
      showBaseline: {
        keys: ["ArrowLeft"],
        displayKeys: ["←"],
        description: "Show only baseline",
        envs: ["test", "build", "media"],
        section: "View mode",
      },
      toggleSplitView: {
        keys: ["KeyS"],
        displayKeys: ["S"],
        description: "Toggle side by side mode",
        envs: ["test", "build", "media"],
        section: "View mode",
      },
      showChanges: {
        keys: ["ArrowRight"],
        displayKeys: ["→"],
        description: "Show only changes",
        envs: ["test", "build", "media"],
        section: "View mode",
      },
      showOnion: {
        keys: ["KeyO"],
        displayKeys: ["O"],
        description: "Show onion skin view",
        envs: ["test", "build", "media"],
        section: "View mode",
      },
      showSwipe: {
        keys: ["KeyW"],
        displayKeys: ["W"],
        description: "Show swipe view",
        envs: ["test", "build", "media"],
        section: "View mode",
      },
      toggleChangesOverlay: {
        keys: ["KeyD"],
        displayKeys: ["D"],
        description: "Toggle changes overlay",
        envs: ["test", "build", "media"],
      },
      highlightChanges: {
        keys: ["KeyH"],
        displayKeys: ["H"],
        description: "Highlight changes",
        envs: ["test", "build", "media"],
      },
      // J before K, as the keys sit and as vim reads them.
      goToPreviousChanges: {
        keys: ["KeyJ"],
        displayKeys: ["J"],
        description: "Go to previous changes",
        envs: ["test", "build", "media"],
      },
      goToNextChanges: {
        keys: ["KeyK"],
        displayKeys: ["K"],
        description: "Go to next changes",
        envs: ["test", "build", "media"],
      },
    },
  },
  {
    name: "View",
    hotkeys: {
      toggleDiffFit: {
        keys: ["Space"],
        displayKeys: ["Space"],
        description: "Toggle fit to screen",
        envs: ["test", "build"],
      },
      fitView: {
        keys: ["0"],
        displayKeys: ["0"],
        description: "Fit view into screen",
        envs: ["test", "build"],
      },
      toggleSnapshotType: {
        keys: ["KeyL"],
        displayKeys: ["L"],
        description: "Switch between screenshot and aria view",
        envs: ["build"],
      },
      toggleCommentTool: {
        keys: ["KeyC"],
        displayKeys: ["C"],
        description: "Toggle comment tool",
        envs: ["build", "media"],
      },
      showDetails: {
        keys: ["["],
        displayKeys: ["["],
        description: "Show details",
        envs: ["build"],
      },
    },
  },
  {
    name: "Share",
    hotkeys: {
      copyAsSelectedFormat: {
        keys: [MOD, "KeyC"],
        displayKeys: [MOD, "C"],
        description: "Copy as the selected format",
        envs: ["media"],
      },
      copyMediaLink: {
        keys: [MOD, SHIFT, "Comma"],
        displayKeys: [MOD, SHIFT, ","],
        description: "Copy link",
        envs: ["media"],
      },
      downloadMedia: {
        keys: [MOD, SHIFT, "KeyD"],
        displayKeys: [MOD, SHIFT, "D"],
        description: "Download",
        envs: ["media"],
      },
    },
  },
  {
    name: "Actions",
    hotkeys: {
      requestReviewers: {
        keys: ["KeyA"],
        displayKeys: ["A"],
        description: "Add reviewer",
        envs: ["build"],
      },
      acceptDiff: {
        keys: ["KeyY"],
        displayKeys: ["Y"],
        description: "Mark individual change as accepted",
        envs: ["build"],
      },
      rejectDiff: {
        keys: ["KeyN"],
        displayKeys: ["N"],
        description: "Mark individual change as rejected",
        envs: ["build"],
      },
      ignoreChange: {
        keys: ["KeyI"],
        displayKeys: ["I"],
        description: "Ignore change",
        envs: ["test", "build"],
      },
      undoReviewMark: {
        keys: [MOD, "KeyZ"],
        displayKeys: [MOD, "Z"],
        description: "Undo last review mark",
        envs: ["build"],
      },
      redoReviewMark: {
        keys: [MOD, SHIFT, "KeyZ"],
        displayKeys: [MOD, SHIFT, "Z"],
        description: "Redo last undone review mark",
        envs: ["build"],
      },
    },
  },
] satisfies HotkeyGroup[];

export type HotkeyName = keyof (typeof hotkeyGroups)[number]["hotkeys"];

export const plainHotkeyGroups: HotkeyGroup[] = hotkeyGroups;

const MODIFIER_LABELS = {
  "⌘": "Command",
  Ctrl: "Control",
  "⌥": "Option",
  Alt: "Alt",
  "⇧": "Shift",
  Shift: "Shift",
} as const satisfies Record<ModifierKey, string>;

export function getModifierLabel(modifier: ModifierKey): string {
  return MODIFIER_LABELS[modifier];
}

/**
 * Derived rather than listed: offering a modifier no shortcut takes would be a
 * filter that can only ever empty the list.
 */
export const SEARCHABLE_MODIFIERS: ModifierKey[] = [MOD, SHIFT, ALT].filter(
  (modifier) =>
    plainHotkeyGroups.some((group) =>
      Object.values(group.hotkeys).some((hotkey) =>
        hotkey?.displayKeys.includes(modifier),
      ),
    ),
);

export function checkHotkeyUsesModifiers(
  hotkey: Hotkey,
  modifiers: ModifierKey[],
): boolean {
  return modifiers.every((modifier) => hotkey.displayKeys.includes(modifier));
}

const hotkeys = plainHotkeyGroups.reduce(
  (acc, group) => ({ ...acc, ...group.hotkeys }),
  {} as Record<HotkeyName, Hotkey>,
);

const MODIFIER_SEARCH_TERMS = {
  "⌘": ["cmd", "command", "meta"],
  Ctrl: ["ctrl", "control"],
  "⌥": ["alt", "option"],
  Alt: ["alt", "option"],
  "⇧": ["shift"],
  Shift: ["shift"],
} as const satisfies Record<ModifierKey, string[]>;

/**
 * What someone types to mean a key they cannot type. Everything left out — the
 * letters, the digits, `Esc`, `Space`, `?`, `[` — is already the character it
 * is searched by.
 */
const KEY_SEARCH_TERMS: Record<string, readonly string[]> = {
  ...MODIFIER_SEARCH_TERMS,
  "↑": ["up", "arrow"],
  "↓": ["down", "arrow"],
  "←": ["left", "arrow"],
  "→": ["right", "arrow"],
  "↵": ["enter", "return"],
  Esc: ["escape"],
  Space: ["spacebar"],
};

/**
 * Whether `hotkey` answers `query`, read as terms that must all match: "cmd z"
 * finds ⌘Z. A term matches a description anywhere inside it, and a key from
 * its start, so "com" is someone part-way through "command".
 */
export function checkHotkeyMatchesSearch(
  hotkey: Hotkey,
  query: string,
): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const description = hotkey.description.toLowerCase();
  const keyTerms = hotkey.displayKeys.flatMap((key) => [
    key.toLowerCase(),
    ...(KEY_SEARCH_TERMS[key] ?? []),
  ]);
  return terms.every(
    (term) =>
      description.includes(term) ||
      keyTerms.some((keyTerm) => keyTerm.startsWith(term)),
  );
}

/** The `KeyboardEvent` fields saying which modifiers are held. */
type ModifierFlag = "metaKey" | "ctrlKey" | "altKey" | "shiftKey";

/**
 * The event flag each modifier key sets. `MOD` resolves to one of these names
 * per platform, so nothing below has to know which platform it runs on.
 */
const MODIFIER_FLAGS = {
  "⌘": "metaKey",
  Ctrl: "ctrlKey",
  "⌥": "altKey",
  Alt: "altKey",
  "⇧": "shiftKey",
  Shift: "shiftKey",
} as const satisfies Record<ModifierKey, ModifierFlag>;

/** Derived, so a modifier added above cannot end up declared but unchecked. */
const MODIFIER_FLAG_NAMES = [...new Set(Object.values(MODIFIER_FLAGS))];

/**
 * The modifiers that change which character a key prints, and are therefore
 * already accounted for by `event.key`.
 */
const CHARACTER_MODIFIER_FLAGS = new Set<ModifierFlag>(["shiftKey", "altKey"]);

function checkIsModifier(key: string): key is ModifierKey {
  return key in MODIFIER_FLAGS;
}

/** A key written as the character it prints, rather than as a physical code. */
function checkIsLiteralKey(key: string): boolean {
  return !checkIsModifier(key) && key.length === 1;
}

/**
 * Whether `event` holds the modifiers `hotkey` declares, and none it doesn't.
 *
 * Meta and Control are always exact: they leave the character a key prints
 * alone, so a hotkey that does not declare one must not fire while it is held.
 * Shift and Alt do change that character, and a hotkey named by the character
 * it prints is matched on `event.key` — which has already answered them. "?"
 * *is* shift+/, "[" *is* ⌥⇧( on a French Mac, and the digit row is shifted on
 * AZERTY, so demanding either a second time would make those impossible to
 * type.
 */
function checkModifiersMatch(hotkey: Hotkey, event: HotkeyEvent): boolean {
  const declared = new Set<ModifierFlag>(
    hotkey.keys.filter(checkIsModifier).map((key) => MODIFIER_FLAGS[key]),
  );
  // The key that decides the match is the one that is not a modifier; a
  // combination has exactly one, since a single event prints a single
  // character.
  const mainKey = hotkey.keys.find((key) => !checkIsModifier(key));
  const printsACharacter = mainKey !== undefined && checkIsLiteralKey(mainKey);
  return MODIFIER_FLAG_NAMES.every((flag) => {
    if (
      printsACharacter &&
      !declared.has(flag) &&
      CHARACTER_MODIFIER_FLAGS.has(flag)
    ) {
      return true;
    }
    return declared.has(flag) === event[flag];
  });
}

/** Whether `event` triggers `hotkey`, modifiers included. */
export function checkHotkeyMatches(
  hotkey: Hotkey,
  event: HotkeyEvent,
): boolean {
  if (!checkModifiersMatch(hotkey, event)) {
    return false;
  }

  return hotkey.keys.every((key) => {
    if (checkIsModifier(key)) {
      return true;
    }
    if (key.startsWith("Key")) {
      const letter = key.slice(3);
      return letter === event.key || letter.toLowerCase() === event.key;
    }
    return key === event.code || key === event.key;
  });
}

/** The hotkey named `name`, as declared above. */
export function getHotkey(name: HotkeyName): Hotkey {
  return hotkeys[name];
}
