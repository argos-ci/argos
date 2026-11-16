import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type SnapshotGrouping = "status" | "test";

export type SnapshotDisplay = "screenshots" | "names";

// Read on init: the list is grouped from its first render, and a value that
// arrived a render later would regroup it under the reader's eyes.
const groupingAtom = atomWithStorage<SnapshotGrouping>(
  "preferences.snapshotList.grouping",
  "status",
  undefined,
  { getOnInit: true },
);

const displayAtom = atomWithStorage<SnapshotDisplay>(
  "preferences.snapshotList.display",
  "screenshots",
  undefined,
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
