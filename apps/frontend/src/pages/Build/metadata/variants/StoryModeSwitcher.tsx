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
  getUniqueStoryModes,
  resolveDiffMetadata,
  storyModeRestatesColorScheme,
  useGetDiffPath,
} from "../utils";
import { findVariantSibling } from "./sibling";
import {
  getVariantStatus,
  VariantStatusButtonIcon,
  withVariantStatus,
  type VariantStatus,
} from "./VariantStatus";

export function StoryModeSwitcher(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const siblingMetadata = siblingDiffs
    .map(resolveDiffMetadata)
    .filter(checkIsNonNullable);
  const storyModes = getUniqueStoryModes(siblingMetadata);
  // Modes named after the scheme they set are the same choice twice over, and
  // the color scheme switcher is the one that reads without a legend. It is
  // always there to take over: a mode that spells its scheme out cannot offer
  // two values without the schemes differing too.
  if (storyModes.length < 2 || storyModeRestatesColorScheme(siblingMetadata)) {
    return null;
  }
  const activeMode = metadata?.story?.mode ?? null;
  const activeIndex = storyModes.findIndex((m) => m === activeMode);
  return (
    <ButtonGroup>
      {storyModes.map((mode, index) => {
        const isActive = activeMode === mode;
        const isNextActive = (activeIndex + 1) % storyModes.length === index;
        const resolvedDiff = isActive
          ? diff
          : findVariantSibling({
              diff,
              siblingDiffs,
              axis: "storyMode",
              value: mode,
            });
        invariant(resolvedDiff, "diff cannot be null");
        return (
          <StoryModeLinkButton
            key={mode}
            mode={mode}
            status={getVariantStatus(resolvedDiff)}
            aria-current={isActive ? "page" : undefined}
            href={getDiffPath(resolvedDiff.id) ?? ""}
            shortcutEnabled={isNextActive}
          />
        );
      })}
    </ButtonGroup>
  );
}

function StoryModeLinkButton(props: {
  mode: string;
  status: VariantStatus | null;
  href: string;
  shortcutEnabled: boolean;
  "aria-current"?: "page";
}) {
  const { mode, status, shortcutEnabled, ...rest } = props;
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchStoryMode", () => navigate(props.href), {
    enabled: shortcutEnabled,
  });
  const content = withVariantStatus(`Story mode: ${mode}`, status);

  // No icon of its own: a mode is named by whoever wrote the story, so the name
  // is the only thing that tells one from another.
  const button = (
    <LinkButton
      {...rest}
      variant="secondary"
      aria-label={status ? withVariantStatus(mode, status) : undefined}
    >
      {mode}
      {status ? <VariantStatusButtonIcon status={status} /> : null}
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
