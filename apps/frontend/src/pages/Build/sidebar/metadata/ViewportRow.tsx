import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipLink } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import {
  getViewportIconKind,
  viewportIcons,
} from "../../metadata/metadataIcons";
import { MetadataRow } from "./MetadataRow";
import {
  getUniqueViewports,
  hashViewport,
  resolveDiffMetadata,
  useGetDiffPath,
  type MetadataViewport,
} from "./utils";

export function ViewportRow(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const viewports = getUniqueViewports(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (viewports.length === 0) {
    return null;
  }
  if (viewports.length === 1) {
    const viewport = viewports[0]!;
    return (
      <MetadataRow>
        <Chip icon={viewportIcons[getViewportIconKind(viewport.width)]}>
          {viewport.width}×{viewport.height}px
        </Chip>
      </MetadataRow>
    );
  }
  const activeKey = metadata?.viewport ? hashViewport(metadata.viewport) : null;
  const activeIndex = viewports.findIndex((v) => hashViewport(v) === activeKey);
  return (
    <MetadataRow>
      <ButtonGroup>
        {viewports.map((viewport, index) => {
          const key = hashViewport(viewport);
          const isActive = activeKey === key;
          const isNextActive = (activeIndex + 1) % viewports.length === index;
          const resolvedDiff = isActive
            ? diff
            : siblingDiffs.find((d) => {
                const m = resolveDiffMetadata(d);
                return m?.viewport && hashViewport(m.viewport) === key;
              });
          invariant(resolvedDiff, "diff cannot be null");
          return (
            <ViewportChipLink
              key={key}
              viewport={viewport}
              aria-current={isActive ? "page" : undefined}
              href={getDiffPath(resolvedDiff.id) ?? ""}
              shortcutEnabled={isNextActive}
            />
          );
        })}
      </ButtonGroup>
    </MetadataRow>
  );
}

function ViewportChipLink(props: {
  viewport: MetadataViewport;
  href: string;
  shortcutEnabled: boolean;
  "aria-current"?: "page";
}) {
  const { viewport, shortcutEnabled, ...rest } = props;
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchViewport", () => navigate(props.href), {
    enabled: shortcutEnabled,
  });
  const content = tooltipContent(viewport);

  const chipLink = (
    <ChipLink
      {...rest}
      icon={viewportIcons[getViewportIconKind(viewport.width)]}
      className={clsx("cursor-default font-mono")}
    >
      {viewport.width}
    </ChipLink>
  );

  if (!shortcutEnabled) {
    return <Tooltip content={content}>{chipLink}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={content}>
      {chipLink}
    </HotkeyTooltip>
  );
}

function tooltipContent(viewport: MetadataViewport) {
  return `Viewport size of ${viewport.width}×${viewport.height}px`;
}
