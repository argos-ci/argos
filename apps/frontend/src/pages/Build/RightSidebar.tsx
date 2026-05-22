import { assertNever } from "@argos/util/assertNever";
import { useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { Sidebar } from "@/ui/Sidebar";

import { useBuildDiffState } from "./BuildDiffState";
import { TestDetails } from "./TestDetails";

export const rightSidebarAtom = atomWithStorage<"details" | null>(
  "build.rightSidebar",
  null,
);

export function RightSidebar() {
  const sidebar = useAtomValue(rightSidebarAtom);
  if (!sidebar) {
    return null;
  }
  return (
    <Sidebar>
      {(() => {
        switch (sidebar) {
          case "details":
            return <ActiveTestDetails />;
          default:
            assertNever(sidebar);
        }
      })()}
    </Sidebar>
  );
}

function ActiveTestDetails() {
  const { activeDiff } = useBuildDiffState();
  if (!activeDiff?.test) {
    return null;
  }

  return (
    <TestDetails
      test={activeDiff.test}
      change={activeDiff.change ?? null}
      occurrences={activeDiff.last7daysOccurrences}
    />
  );
}
