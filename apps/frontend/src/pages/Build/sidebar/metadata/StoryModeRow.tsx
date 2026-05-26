import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { SlidersHorizontalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipLink } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { MetadataRow } from "./MetadataRow";
import {
  getUniqueStoryModes,
  resolveDiffMetadata,
  useGetDiffPath,
} from "./utils";

export function StoryModeRow(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const storyModes = getUniqueStoryModes(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (storyModes.length === 0) {
    return null;
  }
  if (storyModes.length === 1) {
    const mode = storyModes[0]!;
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
  const activeMode = metadata?.story?.mode ?? null;
  const activeIndex = storyModes.findIndex((m) => m === activeMode);
  return (
    <MetadataRow>
      <ButtonGroup>
        {storyModes.map((mode, index) => {
          const isActive = activeMode === mode;
          const isNextActive = (activeIndex + 1) % storyModes.length === index;
          const resolvedDiff = isActive
            ? diff
            : siblingDiffs.find(
                (d) => resolveDiffMetadata(d)?.story?.mode === mode,
              );
          invariant(resolvedDiff, "diff cannot be null");
          return (
            <StoryModeChipLink
              key={mode}
              mode={mode}
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

function StoryModeChipLink(props: {
  mode: string;
  href: string;
  shortcutEnabled: boolean;
  "aria-current"?: "page";
}) {
  const { mode, shortcutEnabled, ...rest } = props;
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchStoryMode", () => navigate(props.href), {
    enabled: shortcutEnabled,
  });
  const content = `Story mode: ${mode}`;

  const chipLink = (
    <ChipLink {...rest} icon={SlidersHorizontalIcon} color="storybook">
      {mode}
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
