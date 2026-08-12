import { Chip } from "@/ui/Chip";

import type { Diff } from "../../BuildDiffState";
import {
  getViewportIconKind,
  viewportIcons,
} from "../../metadata/metadataIcons";
import { MetadataRow } from "./MetadataRow";
import { resolveDiffMetadata } from "./utils";

/**
 * The viewport this capture was taken at, both dimensions — the switcher over the
 * snapshot only has room for the width, and the height is what tells a phone from
 * a tablet held sideways.
 */
export function ViewportRow(props: { diff: Diff }) {
  const { diff } = props;
  const viewport = resolveDiffMetadata(diff)?.viewport;
  if (!viewport) {
    return null;
  }
  return (
    <MetadataRow>
      <Chip icon={viewportIcons[getViewportIconKind(viewport.width)]}>
        {viewport.width}×{viewport.height}px
      </Chip>
    </MetadataRow>
  );
}
