import { useRef, useState } from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  MoreVerticalIcon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { List, ListHeaderRow, ListRowLink } from "@/ui/List";
import { Menu, MenuItem, MenuTrigger } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";

import {
  AutomationActionRunStatus,
  AutomationRunStatus,
  ProjectPermission,
} from "../../gql/graphql";
import { IconButton } from "../../ui/IconButton";
import { Popover } from "../../ui/Popover";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { useProjectParams } from "../Project/ProjectParams";
import { ACTIONS } from "./AutomationFormActionsStep";
import { getAutomationURL } from "./AutomationParams";
import { AutomationRule } from "./index";

function DeleteAutomationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog size="medium">
          <DialogBody>
            <DialogTitle>Delete Automation</DialogTitle>
            <DialogText>
              Are you sure you want to delete this automation rule? This action
              cannot be undone.
            </DialogText>
          </DialogBody>
          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

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

const AutomationActionRunStatusIcon = ({ status }: { status: string }) => {
  const iconClassName = "shrink-0 size-3";

  switch (status) {
    case AutomationActionRunStatus.Aborted:
    case AutomationActionRunStatus.Failed:
    case AutomationActionRunStatus.Error:
      return (
        <>
          <XCircleIcon className={iconClassName} />
          <span className="text-danger-low capitalize">{status}</span>
        </>
      );

    case AutomationActionRunStatus.Success:
      return (
        <>
          <CheckCircle2Icon className={iconClassName} />
          <span className="text-success-low capitalize">{status}</span>
        </>
      );

    case AutomationActionRunStatus.Pending:
    case AutomationActionRunStatus.Progress:
      return (
        <>
          <CircleDotIcon className={iconClassName} />
          <span className="text-warning-low capitalize">{status}</span>
        </>
      );

    default:
      throw new Error(`Unexpected status for AutomationActionRunId ${status}`);
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
      <IconButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <AutomationRunStatusIcon status={automationRun.status} />
      </IconButton>
      <Popover className="bg-app">
        <div className="flex flex-col gap-2 p-2">
          <div className="text-xs font-semibold">Actions</div>
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
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { permissions } = useProjectOutletContext();
  const hasEditPermission = permissions.includes(ProjectPermission.Admin);
  const url = getAutomationURL({ ...params, automationId: automationRule.id });

  return (
    <ListRowLink href={url} className="items-center px-4 py-2 text-sm">
      <div className="w-44 shrink-0 py-2 md:w-auto md:grow">
        <div className="truncate">{automationRule.name}</div>
      </div>
      <div className="text-low flex w-32 shrink-0 flex-col overflow-hidden truncate whitespace-nowrap py-2 text-sm">
        {automationRule.on.map((event) => (
          <div key={event}>{event}</div>
        ))}
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
                {hasEditPermission ? "Edit" : "View"}
              </MenuItem>
              <MenuItem variant="danger" onAction={() => setDialogOpen(true)}>
                Delete
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
        <DeleteAutomationDialog
          isOpen={isDialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={() => {
            setDialogOpen(false);
            onDelete(automationRule.id);
          }}
        />
      </div>
    </ListRowLink>
  );
}

export function AutomationRulesList(props: {
  automationRules: AutomationRule[];
  onDelete: (id: string) => void;
}) {
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
