import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
} from "lucide-react";

import { DialogTrigger } from "@/ui/Dialog";
import { List, ListHeaderRow, ListRowLink } from "@/ui/List";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useLatestTruethyValue } from "@/ui/useLatestTruethyValue";
import {
  AutomationEventSchema,
  getAutomationEventLabel,
} from "@/util/automation";

import { AutomationRule } from ".";
import { AutomationRunStatus, ProjectPermission } from "../../gql/graphql";
import { IconButton } from "../../ui/IconButton";
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
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <AutomationRunStatusIcon status={automationRun.status} />
        </IconButton>
      </Tooltip>
      <Popover className="bg-app">
        <div className="flex flex-col gap-2 p-2">
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
    <ListRowLink
      href={url}
      className="flex items-center gap-6 px-4 py-2 text-sm"
    >
      <div className="w-44 shrink-0 py-2 md:w-auto md:grow">
        <div className="truncate">{automationRule.name}</div>
      </div>
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
      <div className="w-8 shrink-0 py-2">
        <MenuTrigger>
          <IconButton>
            <MoreVerticalIcon />
          </IconButton>
          <Popover>
            <Menu>
              <MenuItem href={url}>
                <MenuItemIcon>
                  <PencilIcon />
                </MenuItemIcon>
                {hasEditPermission ? "Edit" : "View"}
              </MenuItem>
              <MenuItem
                variant="danger"
                onAction={() => onDelete(automationRule.id)}
              >
                <MenuItemIcon>
                  <TrashIcon />
                </MenuItemIcon>
                Delete
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </ListRowLink>
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
    <DialogTrigger
      isOpen={Boolean(deletedId)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDeletedId(null);
        }
      }}
    >
      <Modal>
        <DeleteAutomationDialog
          projectId={projectId}
          automationRuleId={latestDeletedId}
          onCompleted={() => {
            setDeletedId(null);
          }}
        />
      </Modal>
    </DialogTrigger>
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
    <List
      ref={parentRef}
      className="absolute max-h-full w-full"
      style={{ display: "block" }}
    >
      <div className="relative">
        <ListHeaderRow>
          <div className="w-44 shrink-0 md:w-auto md:grow">Name</div>
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
