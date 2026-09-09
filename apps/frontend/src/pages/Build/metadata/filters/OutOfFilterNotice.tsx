import { use } from "react";
import { FunnelXIcon } from "lucide-react";

import { LinkStyleButton } from "@/ui/Link";

import { useBuildDiffState } from "../../BuildDiffState";
import { FilterStateContext } from "./FilterState";
import { diffMatchesFilters } from "./util";

/**
 * Says out loud that the snapshot on screen is not in the list under it.
 *
 * Sits under the filter chips at the head of the snapshot list, which is the
 * list it is talking about — it reads as a caption on that list, not as a
 * banner about the page.
 *
 * The active diff is resolved from the URL against the unfiltered index, so a
 * filter that excludes it leaves the viewer on a snapshot no row points at —
 * nothing selected in the list, and the up arrow walking out to the build
 * overview. Filtering from a variant segment follows the value it names, which
 * keeps this out of the way for the common case; a filter that empties the
 * matrix around the snapshot, or one set from the menu above, still lands here.
 *
 * Announced rather than corrected: jumping the reviewer somewhere they did not
 * ask to go loses their place mid-review, which is the one thing worth
 * protecting.
 */
export function OutOfFilterNotice() {
  const state = use(FilterStateContext);
  const { activeDiff } = useBuildDiffState();

  if (
    !state ||
    state.active.size === 0 ||
    !activeDiff ||
    diffMatchesFilters(activeDiff, state.active)
  ) {
    return null;
  }

  return (
    <div className="text-low flex items-center gap-2 border-b px-2 py-1.5 text-xs">
      <FunnelXIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        The snapshot you are viewing is filtered out.
      </span>
      <LinkStyleButton
        className="shrink-0"
        onClick={() => state.setActive(new Set())}
      >
        Clear filters
      </LinkStyleButton>
    </div>
  );
}
