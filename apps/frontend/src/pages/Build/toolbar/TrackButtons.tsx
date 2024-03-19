import { memo } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildHotkey } from "../BuildHotkeys";
import { EvaluationStatus, useBuildDiffStatusState } from "../BuildReviewState";

export const AcceptButton = memo(
  (props: {
    screenshotDiffId: string;
    diffGroup: string | null;
    disabled: boolean;
  }) => {
    const [status, setStatus] = useBuildDiffStatusState({
      diffId: props.screenshotDiffId,
      diffGroup: props.diffGroup,
    });
    const toggle = () =>
      setStatus(
        status === EvaluationStatus.Accepted
          ? EvaluationStatus.Pending
          : EvaluationStatus.Accepted,
      );
    const hotkey = useBuildHotkey(
      "acceptDiff",
      () => {
        setStatus(EvaluationStatus.Accepted);
      },
      {
        preventDefault: true,
        enabled: !props.disabled,
      },
    );
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
          onClick={toggle}
          color={active ? "success" : undefined}
          disabled={props.disabled}
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
    const [status, setStatus] = useBuildDiffStatusState({
      diffId: props.screenshotDiffId,
      diffGroup: props.diffGroup,
    });
    const toggle = () =>
      setStatus(
        status === EvaluationStatus.Rejected
          ? EvaluationStatus.Pending
          : EvaluationStatus.Rejected,
      );
    const hotkey = useBuildHotkey(
      "rejectDiff",
      () => {
        setStatus(EvaluationStatus.Rejected);
      },
      {
        preventDefault: true,
        enabled: !props.disabled,
      },
    );
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
          onClick={toggle}
          color={active ? "danger" : undefined}
          disabled={props.disabled}
        >
          <ThumbsDownIcon />
        </IconButton>
      </HotkeyTooltip>
    );
  },
);
