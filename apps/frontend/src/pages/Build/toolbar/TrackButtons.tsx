import { memo } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { ProjectPermission } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useProjectPermissions } from "../BuildContext";
import { Diff } from "../BuildDiffState";
import { useBuildHotkey } from "../BuildHotkeys";
import {
  EvaluationStatus,
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "../BuildReviewState";

function AcceptButton(props: {
  screenshotDiffId: string;
  diffGroup: string | null;
  disabled: boolean;
}) {
  const acknowledgeMarkedDiff = useAcknowledgeMarkedDiff();
  const [status, setStatus] = useBuildDiffStatusState({
    diffId: props.screenshotDiffId,
    diffGroup: props.diffGroup,
  });
  const toggle = () => {
    if (status === EvaluationStatus.Pending) {
      setStatus(EvaluationStatus.Accepted);
      acknowledgeMarkedDiff();
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
}

function RejectButton(props: {
  screenshotDiffId: string;
  diffGroup: string | null;
  disabled: boolean;
}) {
  const acknowledgeMarkedDiff = useAcknowledgeMarkedDiff();
  const [status, setStatus] = useBuildDiffStatusState({
    diffId: props.screenshotDiffId,
    diffGroup: props.diffGroup,
  });
  const toggle = () => {
    if (status === EvaluationStatus.Pending) {
      setStatus(EvaluationStatus.Rejected);
      acknowledgeMarkedDiff();
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
}

export const TrackButtons = memo(function TrackButtons(props: {
  diff: Diff;
  disabled: boolean;
  render: (renderProps: { children: React.ReactNode }) => React.ReactNode;
}) {
  const permissions = useProjectPermissions();
  if (!permissions || !permissions.includes(ProjectPermission.Review)) {
    return null;
  }
  return props.render({
    children: (
      <>
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
      </>
    ),
  });
});
