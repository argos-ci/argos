import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { useNavigate } from "react-router";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import {
  getUniqueViewports,
  hashViewport,
  resolveDiffMetadata,
  useGetDiffPath,
  type MetadataViewport,
} from "../utils";

export function ViewportSwitcher(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const viewports = getUniqueViewports(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (viewports.length < 2) {
    return null;
  }
  const activeKey = metadata?.viewport ? hashViewport(metadata.viewport) : null;
  const activeIndex = viewports.findIndex((v) => hashViewport(v) === activeKey);
  return (
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
          <ViewportLinkButton
            key={key}
            viewport={viewport}
            aria-current={isActive ? "page" : undefined}
            href={getDiffPath(resolvedDiff.id) ?? ""}
            shortcutEnabled={isNextActive}
          />
        );
      })}
    </ButtonGroup>
  );
}

function ViewportLinkButton(props: {
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

  const button = (
    // The width alone: it is what tells siblings apart, and the height and the
    // unit are the same for all of them — the tooltip carries both.
    <LinkButton {...rest} variant="secondary">
      <span className="align-baseline">
        {viewport.width}
        <small className="ml-px">px</small>
      </span>
    </LinkButton>
  );

  if (!shortcutEnabled) {
    return <Tooltip content={content}>{button}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={content}>
      {button}
    </HotkeyTooltip>
  );
}

function tooltipContent(viewport: MetadataViewport) {
  return `Viewport size of ${viewport.width}×${viewport.height}px`;
}
