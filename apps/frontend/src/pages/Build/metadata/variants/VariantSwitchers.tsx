import { ChipContext } from "@/ui/Chip";

import { useBuildDiffState, type Diff } from "../../BuildDiffState";
import { resolveDiffMetadata } from "../utils";
import { BrowserSwitcher } from "./BrowserSwitcher";
import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher";
import { MediaTypeChip } from "./MediaTypeChip";
import { StoryModeSwitcher } from "./StoryModeSwitcher";
import { ViewportSwitcher } from "./ViewportSwitcher";

const CHIP_DEFAULTS = { color: "blank", scale: "sm" } as const;

/**
 * The dimensions the snapshot on screen varies along, and the siblings to jump
 * to along each. Lives in the toolbar rather than the sidebar so the switch
 * hotkeys stay bound when the sidebar is closed.
 */
export function VariantSwitchers(props: { diff: Diff }) {
  const { diff } = props;
  const { siblingDiffs } = useBuildDiffState();
  const metadata = resolveDiffMetadata(diff);
  return (
    <ChipContext value={CHIP_DEFAULTS}>
      {/* `empty:hidden` so a snapshot with no dimensions at all — a markdown
          one — does not leave the toolbar's gap twice over. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 empty:hidden">
        <BrowserSwitcher diff={diff} siblingDiffs={siblingDiffs} />
        <ViewportSwitcher diff={diff} siblingDiffs={siblingDiffs} />
        <ColorSchemeSwitcher diff={diff} siblingDiffs={siblingDiffs} />
        <MediaTypeChip mediaType={metadata?.mediaType ?? null} />
        <StoryModeSwitcher diff={diff} siblingDiffs={siblingDiffs} />
      </div>
    </ChipContext>
  );
}
