import { atomWithStorage } from "jotai/utils";

type SnapshotType = "screenshot" | "aria";

export const snapshotTypeAtom = atomWithStorage<SnapshotType>(
  "preferences.snapshotType",
  "screenshot",
);
