import { memo } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useGoToNextDiff } from "../BuildDiffState";
import { useBuildHotkey } from "../BuildHotkeys";
import { EvaluationStatus, useBuildDiffStatusState } from "../BuildReviewState";

export const AcceptButton = memo(
  (props: {
    screenshotDiffId: string;
    diffGroup: string | null;
    disabled: boolean;
  }) => {
    const goToNextDiff = useGoToNextDiff();
    const [status, setStatus] = useBuildDiffStatusState({
      diffId: props.screenshotDiffId,
      diffGroup: props.diffGroup,
    });
    const toggle = () => {
      if (status === EvaluationStatus.Pending) {
        setStatus(EvaluationStatus.Accepted);
        goToNextDiff();
      } else {
        setStatus(EvaluationStatus.Pending);
      }
    };
    const hotkey = useBuildHotkey("acceptDiff", toggle, {
      preventDefault: true,
      enabled: !props.disabled,
    });
    const active = status === EvaluationStatus.Accepted;
    return (
      <HotkeyTooltip
        description={active ? "Remove mark" : hotkey.description}
        keys={hotkey.displayKeys}
        keysEnabled={!active}
        disabled={props.disabled}
      >
        <IconButton
          aria-pressed={status === EvaluationStatus.Accepted}
          onPress={toggle}
          color={active ? "success" : undefined}
          isDisabled={props.disabled}
        >
          <ThumbsUpIcon />
        </IconButton>
      </HotkeyTooltip>
    );
  },
);

export const RejectButton = memo(
  (props: {
    screenshotDiffId: string;
    diffGroup: string | null;
    disabled: boolean;
  }) => {
    const goToNextDiff = useGoToNextDiff();
    const [status, setStatus] = useBuildDiffStatusState({
      diffId: props.screenshotDiffId,
      diffGroup: props.diffGroup,
    });
    const toggle = () => {
      if (status === EvaluationStatus.Pending) {
        setStatus(EvaluationStatus.Rejected);
        goToNextDiff();
      } else {
        setStatus(EvaluationStatus.Pending);
      }
    };
    const hotkey = useBuildHotkey("rejectDiff", toggle, {
      preventDefault: true,
      enabled: !props.disabled,
    });
    const active = status === EvaluationStatus.Rejected;
    return (
      <HotkeyTooltip
        description={active ? "Remove mark" : hotkey.description}
        keys={hotkey.displayKeys}
        keysEnabled={!active}
        disabled={props.disabled}
      >
        <IconButton
          aria-pressed={status === EvaluationStatus.Rejected}
          onPress={toggle}
          color={active ? "danger" : undefined}
          isDisabled={props.disabled}
        >
          <ThumbsDownIcon />
        </IconButton>
      </HotkeyTooltip>
    );
  },
);
