import { Chip } from "@/ui/Chip";

import type { Diff } from "../../BuildDiffState";
import { BrowserIcon } from "../../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../../metadata/browser/browserLabels";
import { MetadataRow } from "./MetadataRow";
import { resolveDiffMetadata } from "./utils";

/**
 * The browser this capture ran in, with its version — a fact about the snapshot,
 * not a way out of it. Moving between browsers belongs to the variant switcher
 * over the snapshot, which is on screen whether or not this sidebar is open.
 */
export function BrowserRow(props: { diff: Diff }) {
  const { diff } = props;
  const browser = resolveDiffMetadata(diff)?.browser;
  if (!browser) {
    return null;
  }
  return (
    <MetadataRow>
      <Chip icon={<BrowserIcon browser={browser} />}>
        {getBrowserLabel(browser.name)}
        <span className="text-low ml-1">v{browser.version}</span>
      </Chip>
    </MetadataRow>
  );
}
