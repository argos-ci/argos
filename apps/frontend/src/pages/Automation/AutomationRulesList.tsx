import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AutomationEventSchema } from "@argos/schemas/automation-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "@/ui/Button";
import { DialogTrigger } from "@/ui/Dialog";
import { HeadlessLink } from "@/ui/Link";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useLatestTruethyValue } from "@/ui/useLatestTruethyValue";
import { getAutomationEventLabel } from "@/util/automation";

import { AutomationRule } from ".";
import { AutomationRunStatus, ProjectPermission } from "../../gql/graphql";
import { Popover } from "../../ui/Popover";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { useProjectParams } from "../Project/ProjectParams";
import { ACTIONS } from "./AutomationFormActionsStep";
import { getAutomationURL } from "./AutomationParams";
import { DeleteAutomationDialog } from "./DeleteAutomation";
import { AutomationActionRunStatusIcon } from "./EditAutomation";

const AutomationRunStatusIcon = ({
  status,
}: {
  status: AutomationRunStatus;
}) => {
  const className = "shrink-0 size-4";

  switch (status) {
    case AutomationRunStatus.Running:
      return <CircleDotIcon className={clsx("text-warning-low", className)} />;

    case AutomationRunStatus.Success:
      return (
        <CheckCircle2Icon className={clsx("text-success-low", className)} />
      );

    case AutomationRunStatus.Failed:
      return <XCircleIcon className={clsx("text-danger-low", className)} />;

    default:
      assertNever(status, `Unexpected status for AutomationRunId ${status}`);
  }
};

function LastTriggerStatusIcon({
  automationRun,
}: {
  automationRun: AutomationRule["lastAutomationRun"];
}) {
  if (!automationRun) {
    return null;
  }

  return (
    <DialogTrigger>
      <Tooltip content="View latest automation runs">
        <Button variant="secondary" iconOnly className="relative">
          <AutomationRunStatusIcon status={automationRun.status} />
        </Button>
      </Tooltip>
      <Popover className="bg-app">
        <div className="flex flex-col gap-2 p-3">
          <div className="text-xs font-semibold">Runs</div>
          {automationRun.actionRuns.map((actionRun) => {
            const action = ACTIONS.find((a) => a.type === actionRun.actionName);
            return (
              <div
                key={actionRun.id}
                className="flex items-center gap-6 border-t pt-2 text-sm whitespace-nowrap"
              >
                <div>{action?.label}</div>
                <div className="flex items-center gap-1 text-xs">
                  <AutomationActionRunStatusIcon status={actionRun.status} />
                </div>
              </div>
            );
          })}
        </div>
      </Popover>
    </DialogTrigger>
  );
}

type AutomationRowProps = {
  automationRule: AutomationRule;
  onDelete: (id: string) => void;
};

function AutomationRow(props: AutomationRowProps) {
  const { automationRule, onDelete } = props;
  const params = useProjectParams();
  invariant(params, "Project params must be defined");
  const { permissions } = useProjectOutletContext();
  const hasEditPermission = permissions.includes(ProjectPermission.Admin);
  const url = getAutomationURL({ ...params, automationId: automationRule.id });

  return (
    <ListRow
      // Not a `ListRowLink`: a link around the row's menu and runs buttons
      // would take their clicks. The link is stretched over the row instead,
      // the buttons sit above it, and the row rebuilds the link's feedback.
      className="group/row hover:bg-hover has-[a:focus-visible]:bg-hover relative flex items-center gap-6 px-4 py-2 text-sm"
    >
      <HeadlessLink
        href={url}
        // Sized by the row, never by its name: a name wider than its share
        // would push this row's other columns out of line with the header's.
        className="min-w-44 flex-1 py-2 after:absolute after:inset-0 focus:outline-hidden"
      >
        <div className="truncate">{automationRule.name}</div>
      </HeadlessLink>
      <div className="text-low flex w-32 shrink-0 flex-col truncate overflow-hidden py-2 text-sm whitespace-nowrap">
        {automationRule.on.map((rawEvent) => {
          const event = AutomationEventSchema.parse(rawEvent);
          return <div key={event}>{getAutomationEventLabel(event)}</div>;
        })}
      </div>
      <div
        className="text-low w-36 shrink-0 truncate overflow-hidden py-2 whitespace-nowrap"
        data-visual-test="transparent"
      >
        {automationRule.lastAutomationRun ? (
          <div className="flex items-center gap-2">
            <Time date={automationRule.lastAutomationRun.createdAt} />
            <LastTriggerStatusIcon
              automationRun={automationRule.lastAutomationRun}
            />
          </div>
        ) : (
          "Not triggered yet"
        )}
      </div>
      <div
        className="w-28 shrink-0 truncate overflow-hidden py-2 whitespace-nowrap"
        data-visual-test="transparent"
      >
        <Time date={automationRule.createdAt} className="text-low" />
      </div>
      <div className="relative w-8 shrink-0 py-2">
        <MenuRoot>
          <MenuTrigger>
            <Button variant="ghost" size="small" iconOnly>
              <MoreVerticalIcon />
            </Button>
          </MenuTrigger>
          <Menu>
            <MenuItem icon={<PencilIcon />} href={url}>
              {hasEditPermission ? "Edit" : "View"}
            </MenuItem>
            <MenuItem
              icon={<Trash2Icon />}
              variant="danger"
              onAction={() => onDelete(automationRule.id)}
            >
              Delete
            </MenuItem>
          </Menu>
        </MenuRoot>
      </div>
    </ListRow>
  );
}

type DeleteAutomationState = {
  deletedId: string | null;
  setDeletedId: Dispatch<SetStateAction<string | null>>;
};

export function useDeleteAutomationState(): DeleteAutomationState {
  const [deletedId, setDeletedId] = useState<string | null>(null);
  return { deletedId, setDeletedId };
}

export function DeleteAutomation(props: {
  projectId: string;
  state: DeleteAutomationState;
}) {
  const { projectId, state } = props;
  const { deletedId, setDeletedId } = state;
  const latestDeletedId = useLatestTruethyValue(deletedId);

  if (!latestDeletedId) {
    return null;
  }

  return (
    <Modal
      open={Boolean(deletedId)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDeletedId(null);
        }
      }}
    >
      <DeleteAutomationDialog
        projectId={projectId}
        automationRuleId={latestDeletedId}
        onCompleted={() => {
          setDeletedId(null);
        }}
      />
    </Modal>
  );
}

export function AutomationRulesList(
  props: Pick<AutomationRowProps, "onDelete"> & {
    automationRules: AutomationRule[];
  },
) {
  const { automationRules, onDelete } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <List ref={parentRef} className="absolute max-h-full w-full">
      <div className="relative">
        <ListHeaderRow>
          <div className="min-w-44 flex-1">Name</div>
          <div className="w-32 shrink-0">Triggers</div>
          <div className="w-36 shrink-0">Last triggered</div>
          <div className="w-28 shrink-0">Created</div>
          <div className="w-8 shrink-0" />
        </ListHeaderRow>

        {automationRules.map((automationRule) => (
          <AutomationRow
            key={`automation-${automationRule.id}`}
            automationRule={automationRule}
            onDelete={onDelete}
          />
        ))}
      </div>
    </List>
  );
}
