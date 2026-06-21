import { memo } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { ProjectPermission } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { useEventCallback } from "@/ui/useEventCallback";
import { useNonNullable } from "@/util/useNonNullable";

import { Diff, useBuildDiffState } from "./BuildDiffState";
import {
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { useRejectCommentInvite } from "./RejectCommentDialog";

function useEvaluationToggle(props: {
  diffId: string;
  diffGroup: string | null;
  target: EvaluationStatus;
}) {
  const { diffId, diffGroup, target } = props;
  const [checkIsPending, acknowledge] = useAcknowledgeMarkedDiff();
  const promptRejectComment = useRejectCommentInvite();
  const { diffs } = useBuildDiffState();
  const [status, setStatus] = useBuildDiffStatusState({
    diffId,
    diffGroup,
  });
  const toggle = useEventCallback(() => {
    if (checkIsPending()) {
      return;
    }
    const nextStatus =
      status === EvaluationStatus.Pending ? target : EvaluationStatus.Pending;
    setStatus(nextStatus);
    if (nextStatus !== EvaluationStatus.Pending) {
      // On a fresh rejection with no note yet, invite the reviewer to explain
      // why. A whole-group rejection anchors the note to the group's first
      // snapshot. When the dialog opens we skip the usual auto-advance/review
      // dialog so it isn't buried; otherwise proceed as normal.
      if (target === EvaluationStatus.Rejected) {
        const rejectDiffId = diffGroup
          ? (diffs.find((diff) => diff.group === diffGroup)?.id ?? diffId)
          : diffId;
        if (promptRejectComment?.(rejectDiffId)) {
          return;
        }
      }
      acknowledge();
    }
  });
  const isActive = status === target;
  return [isActive, toggle] as const;
}

function AcceptButton(props: {
  screenshotDiffId: string;
  diffGroup: string | null;
  disabled: boolean;
}) {
  const [isActive, toggle] = useEvaluationToggle({
    diffId: props.screenshotDiffId,
    diffGroup: props.diffGroup,
    target: EvaluationStatus.Accepted,
  });
  const hotkey = useBuildHotkey("acceptDiff", toggle, {
    preventDefault: true,
    enabled: !props.disabled,
  });
  return (
    <HotkeyTooltip
      description={isActive ? "Remove mark" : hotkey.description}
      keys={hotkey.displayKeys}
      disabled={props.disabled}
    >
      <IconButton
        aria-pressed={isActive}
        onPress={toggle}
        color={isActive ? "success" : undefined}
        isDisabled={props.disabled}
      >
        <ThumbsUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}

function RejectButton(props: {
  screenshotDiffId: string;
  diffGroup: string | null;
  disabled: boolean;
}) {
  const [isActive, toggle] = useEvaluationToggle({
    diffId: props.screenshotDiffId,
    diffGroup: props.diffGroup,
    target: EvaluationStatus.Rejected,
  });
  const hotkey = useBuildHotkey("rejectDiff", toggle, {
    preventDefault: true,
    enabled: !props.disabled,
  });
  return (
    <HotkeyTooltip
      description={isActive ? "Remove mark" : hotkey.description}
      keys={hotkey.displayKeys}
      disabled={props.disabled}
    >
      <IconButton
        aria-pressed={isActive}
        onPress={toggle}
        color={isActive ? "danger" : undefined}
        isDisabled={props.disabled}
      >
        <ThumbsDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}

export const TrackButtons = memo(function TrackButtons(props: {
  diff: Diff;
  disabled: boolean;
}) {
  const permissions = useNonNullable(ProjectPermissionsContext);
  if (!permissions.includes(ProjectPermission.Review)) {
    return null;
  }
  return (
    <div className="flex gap-1.5">
      <RejectButton
        screenshotDiffId={props.diff.id}
        diffGroup={props.diff.group ?? null}
        disabled={props.disabled}
      />
      <AcceptButton
        screenshotDiffId={props.diff.id}
        diffGroup={props.diff.group ?? null}
        disabled={props.disabled}
      />
    </div>
  );
});
