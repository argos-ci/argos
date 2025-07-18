import { memo, useEffect, useRef } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { ProjectPermission } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { useEventCallback } from "@/ui/useEventCallback";
import { useNonNullable } from "@/util/useNonNullable";

import { Diff } from "./BuildDiffState";
import {
  EvaluationStatus,
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "./BuildReviewState";

function useEvaluationToggle(props: {
  diffId: string;
  diffGroup: string | null;
  target: EvaluationStatus;
}) {
  const { diffId, diffGroup, target } = props;
  const acknowledgeMarkedDiff = useAcknowledgeMarkedDiff();
  const [status, setStatus] = useBuildDiffStatusState({
    diffId,
    diffGroup,
  });
  const expectedStatus = useRef<EvaluationStatus | null>(null);
  useEffect(() => {
    if (status === expectedStatus.current) {
      expectedStatus.current = null;
      acknowledgeMarkedDiff();
      return;
    }
  }, [status, acknowledgeMarkedDiff]);
  const toggle = useEventCallback(() => {
    const nextStatus =
      status === EvaluationStatus.Pending ? target : EvaluationStatus.Pending;
    setStatus(nextStatus);
    expectedStatus.current = nextStatus;
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
      keysEnabled={!isActive}
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
      keysEnabled={!isActive}
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
