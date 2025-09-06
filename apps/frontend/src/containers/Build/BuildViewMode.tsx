import { atomWithStorage } from "jotai/utils";

type ViewMode = "split" | "baseline" | "changes";

export const buildViewModeAtom = atomWithStorage<ViewMode>(
  "preferences.diffViewMode",
  "split",
);
