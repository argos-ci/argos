import { atomWithStorage } from "jotai/utils";

export const rightSidebarAtom = atomWithStorage<"details" | null>(
  "build.rightSidebar",
  null,
);
