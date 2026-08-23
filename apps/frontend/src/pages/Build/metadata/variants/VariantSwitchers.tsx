import { useBuildDiffState, type Diff } from "../../BuildDiffState";
import { BrowserSwitcher } from "./BrowserSwitcher";
import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher";
import { StoryModeSwitcher } from "./StoryModeSwitcher";
import { ViewportSwitcher } from "./ViewportSwitcher";

/**
 * The dimensions along which the snapshot on screen has siblings to jump to.
 * Only those: a dimension with a single value is a fact, not a choice, and the
 * facts live in the sidebar's Metadata panel — a toolbar earns its place by
 * doing something. Lives up here rather than in the sidebar so the switch
 * hotkeys stay bound when the sidebar is closed.
 */
export function VariantSwitchers(props: { diff: Diff }) {
  const { diff } = props;
  const { siblingDiffs } = useBuildDiffState();
  return (
    // Named, because the switchers would otherwise be a bare run of buttons in
    // the middle of the toolbar, indistinguishable from the pane controls.
    //
    // `min-w-[min(100%,fit-content)]`: the group refuses to be squeezed — that
    // is what makes the toolbar's cluster fold it under the controls whole —
    // except once it has a line to itself, where `100%` wins and the internal
    // `flex-wrap` takes over if even a full line is not enough.
    //
    // `empty:hidden` so a snapshot with nothing to switch — most of them — does
    // not leave the cluster's gap twice over.
    <div
      role="group"
      aria-label="Snapshot variants"
      className="flex min-w-[min(100%,fit-content)] flex-wrap items-center justify-end gap-1.5 empty:hidden"
    >
      <BrowserSwitcher diff={diff} siblingDiffs={siblingDiffs} />
      <ViewportSwitcher diff={diff} siblingDiffs={siblingDiffs} />
      <ColorSchemeSwitcher diff={diff} siblingDiffs={siblingDiffs} />
      <StoryModeSwitcher diff={diff} siblingDiffs={siblingDiffs} />
    </div>
  );
}
