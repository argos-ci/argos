import { SlidersHorizontalIcon } from "lucide-react";

import {
  ScreenshotMetadataColorScheme,
  ScreenshotMetadataMediaType,
} from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { BrowserIcon } from "../../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../../metadata/browser/browserLabels";
import {
  colorSchemeIcons,
  getViewportIconKind,
  mediaTypeIcons,
  viewportIcons,
} from "../../metadata/metadataIcons";
import { resolveColorScheme, type Metadata } from "../../metadata/utils";
import { MetadataRow } from "./MetadataRow";

/**
 * The snapshot's own dimensions, stated: which browser, which viewport, which
 * scheme, which mode. Plain chips — jumping to the siblings along these
 * dimensions is the toolbar's job, the panel only says what this one is.
 */

export function BrowserRow(props: { metadata: Metadata | null }) {
  const browser = props.metadata?.browser;
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

export function ViewportRow(props: { metadata: Metadata | null }) {
  const viewport = props.metadata?.viewport;
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

export function ColorSchemeRow(props: { metadata: Metadata | null }) {
  const { metadata } = props;
  // Light is the default under which everything is captured unless said
  // otherwise, so only dark is worth a line.
  if (
    !metadata ||
    resolveColorScheme(metadata) !== ScreenshotMetadataColorScheme.Dark
  ) {
    return null;
  }
  return (
    <MetadataRow>
      {/* Named, not just an icon: a lone moon is a symbol the reader has to
          decode. */}
      <Tooltip content="Dark color scheme">
        <Chip
          icon={colorSchemeIcons[ScreenshotMetadataColorScheme.Dark]}
          className="cursor-default"
        >
          Dark
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}

export function MediaTypeRow(props: { metadata: Metadata | null }) {
  const mediaType = props.metadata?.mediaType;
  if (!mediaType || mediaType === ScreenshotMetadataMediaType.Screen) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content="Print mode (media: print)">
        <Chip icon={mediaTypeIcons[mediaType]}>Print</Chip>
      </Tooltip>
    </MetadataRow>
  );
}

export function StoryModeRow(props: { metadata: Metadata | null }) {
  const mode = props.metadata?.story?.mode;
  if (!mode) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content={`Story mode: ${mode}`}>
        <Chip icon={SlidersHorizontalIcon} color="storybook">
          {mode}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
