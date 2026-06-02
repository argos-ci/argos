import { useSetAtom } from "jotai/react";
import { atomWithStorage } from "jotai/utils";

export const rightSidebarOpenAtom = atomWithStorage<boolean>(
  "build.rightSidebar.open",
  true,
);

export type RightSidebarTab = "snapshot" | "review";

export const rightSidebarTabAtom = atomWithStorage<RightSidebarTab>(
  "build.rightSidebar.tab",
  "snapshot",
);

export function useOpenReviewSidebar() {
  const setOpen = useSetAtom(rightSidebarOpenAtom);
  const setTab = useSetAtom(rightSidebarTabAtom);

  return () => {
    setTab("review");
    setOpen(true);
  };
}
