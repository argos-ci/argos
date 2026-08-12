import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import {
  BlendIcon,
  ColumnsIcon,
  PanelLeftIcon,
  PanelRightIcon,
  SplitSquareHorizontalIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { useBuildHotkey, type HotkeyName } from "../BuildHotkeys";
import { buildViewModeAtom, type ViewMode } from "../BuildViewMode";
import { useZoomerSyncContext } from "../Zoomer";

type ViewModeDefinition = {
  label: string;
  icon: LucideIcon;
  hotkey: HotkeyName;
  /** Needs a pair of comparable images to blend. */
  blend?: true;
};

/**
 * The single-pane modes take the panel icons rather than one shared icon: which
 * side is kept is the whole difference between them.
 */
const VIEW_MODES: Record<ViewMode, ViewModeDefinition> = {
  split: {
    label: "Side by side",
    icon: ColumnsIcon,
    hotkey: "toggleSplitView",
  },
  baseline: {
    label: "Baseline only",
    icon: PanelLeftIcon,
    hotkey: "showBaseline",
  },
  changes: {
    label: "Changes only",
    icon: PanelRightIcon,
    hotkey: "showChanges",
  },
  onion: {
    label: "Onion skin",
    icon: BlendIcon,
    hotkey: "showOnion",
    blend: true,
  },
  swipe: {
    label: "Swipe",
    icon: SplitSquareHorizontalIcon,
    hotkey: "showSwipe",
    blend: true,
  },
};

const ORDER: ViewMode[] = ["split", "baseline", "changes", "onion", "swipe"];

/**
 * How the two sides are shown: one segmented control, one icon per mode.
 *
 * Icons rather than labels because the row has to keep its width — spelled out,
 * the five modes took a third of the toolbar, and the group changed size with
 * the mode, moving every control next to it.
 */
export const ViewModeGroup = memo(function ViewModeGroup(props: {
  blendEnabled: boolean;
}) {
  const { blendEnabled } = props;
  const [viewMode] = useAtom(buildViewModeAtom);
  // A mode kept from a previous snapshot may not apply to this one; the pane
  // falls back to the split view, so the pressed state says so too.
  const current =
    !blendEnabled && VIEW_MODES[viewMode].blend ? "split" : viewMode;

  return (
    <ButtonGroup role="group" aria-label="View mode">
      {ORDER.map((mode) => {
        const definition = VIEW_MODES[mode];
        if (definition.blend && !blendEnabled) {
          return null;
        }
        return (
          <ViewModeButton
            key={mode}
            mode={mode}
            definition={definition}
            isPressed={current === mode}
          />
        );
      })}
    </ButtonGroup>
  );
});

function ViewModeButton(props: {
  mode: ViewMode;
  definition: ViewModeDefinition;
  isPressed: boolean;
}) {
  const { mode, definition, isPressed } = props;
  const { icon: Icon, label } = definition;
  const [viewMode, setViewMode] = useAtom(buildViewModeAtom);
  const { reset } = useZoomerSyncContext();

  const setMode = (next: ViewMode) => {
    startTransition(() => {
      setViewMode(next);
    });
    // Going from one pane to two (or back) changes what the shared zoom means.
    if (next === "split" || viewMode === "split") {
      reset();
    }
  };
  const select = () => setMode(mode);

  // The split shortcut keeps alternating between one pane and two, which is what
  // it did before the group and what a reviewer presses it for. The other
  // shortcuts select their mode, like the buttons.
  const hotkey = useBuildHotkey(
    definition.hotkey,
    mode === "split"
      ? () => setMode(viewMode === "split" ? "changes" : "split")
      : select,
    { preventDefault: true },
  );

  return (
    <HotkeyTooltip
      description={label}
      keys={hotkey.displayKeys}
      keysEnabled={!isPressed}
    >
      <Button
        variant="secondary"
        iconOnly
        aria-pressed={isPressed}
        aria-label={label}
        onPress={select}
      >
        <Icon />
      </Button>
    </HotkeyTooltip>
  );
}
