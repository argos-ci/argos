import { useRef, useState } from "react";
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

import { AutomationRunStatus, ProjectPermission } from "../../gql/graphql";
import { IconButton } from "../../ui/IconButton";
import { Popover } from "../../ui/Popover";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { useProjectParams } from "../Project/ProjectParams";
import { ACTIONS } from "./AutomationFormActionsStep";
import { getAutomationURL } from "./AutomationParams";
import { DeleteAutomationDialog } from "./DeleteAutomation";
import { AutomationActionRunStatusIcon } from "./EditAutomation";
import { AutomationRule } from "./index";

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
                className="flex items-center gap-6 whitespace-nowrap border-t pt-2 text-sm"
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

function AutomationRow(props: {
  automationRule: AutomationRule;
  onDelete: (id: string) => void;
}) {
  const { automationRule, onDelete } = props;
  const params = useProjectParams();
  invariant(params, "Project params must be defined");
  const { permissions } = useProjectOutletContext();
  const hasEditPermission = permissions.includes(ProjectPermission.Admin);
  const url = getAutomationURL({ ...params, automationId: automationRule.id });

  return (
    <ListRowLink href={url} className="items-center px-4 py-2 text-sm">
      <div className="w-44 shrink-0 py-2 md:w-auto md:grow">
        <div className="truncate">{automationRule.name}</div>
      </div>
      <div className="text-low flex w-32 shrink-0 flex-col overflow-hidden truncate whitespace-nowrap py-2 text-sm">
        {automationRule.on.map((rawEvent) => {
          const event = AutomationEventSchema.parse(rawEvent);
          return <div key={event}>{getAutomationEventLabel(event)}</div>;
        })}
      </div>
      <div
        className="text-low w-36 shrink-0 overflow-hidden truncate whitespace-nowrap py-2"
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
        className="w-28 shrink-0 overflow-hidden truncate whitespace-nowrap py-2"
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

export function AutomationRulesList(props: {
  automationRules: AutomationRule[];
  projectId: string;
}) {
  const { automationRules, projectId } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const latestDeletedId = useLatestTruethyValue(deletedId);

  return (
    <>
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
              onDelete={setDeletedId}
            />
          ))}
        </div>
      </List>
      {latestDeletedId ? (
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
            />
          </Modal>
        </DialogTrigger>
      ) : null}
    </>
  );
}
