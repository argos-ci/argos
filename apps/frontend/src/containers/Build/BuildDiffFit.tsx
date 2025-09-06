import { atomWithStorage } from "jotai/utils";

export const buildDiffFitContainedAtom = atomWithStorage(
  "preferences.diffFit.contained",
  true,
);
