import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type SnapshotGrouping = "status" | "test";

export type SnapshotDisplay = "screenshots" | "names";

/**
 * Local storage without the default `subscribe`: a choice made in another tab
 * applies from the next page load, rather than relaying the list out under the
 * reader of this one, past the setters that keep the open snapshot in view.
 */
function createTabStorage<Value>() {
  const { getItem, setItem, removeItem } = createJSONStorage<Value>(
    () => localStorage,
  );
  return { getItem, setItem, removeItem };
}

// Read on init: the list is grouped from its first render, and a value that
// arrived a render later would regroup it under the reader's eyes.
const groupingAtom = atomWithStorage<SnapshotGrouping>(
  "preferences.snapshotList.grouping",
  "status",
  createTabStorage(),
  { getOnInit: true },
);

const displayAtom = atomWithStorage<SnapshotDisplay>(
  "preferences.snapshotList.display",
  "screenshots",
  createTabStorage(),
  { getOnInit: true },
);

// Local storage is not ours to trust: a value this version does not know
// reads as the default.

export function useSnapshotGrouping() {
  const [grouping, setGrouping] = useAtom(groupingAtom);
  return [grouping === "test" ? "test" : "status", setGrouping] as const;
}

export function useSnapshotDisplay() {
  const [display, setDisplay] = useAtom(displayAtom);
  return [display === "names" ? "names" : "screenshots", setDisplay] as const;
}
