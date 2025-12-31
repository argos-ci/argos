import { atomWithStorage } from "jotai/utils";

export const testSidebarAtom = atomWithStorage<"details" | null>(
  "build.test.sidebar",
  null,
);
