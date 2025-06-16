import { useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { MoreVerticalIcon } from "lucide-react";

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

import { ProjectPermission } from "../../gql/graphql";
import { IconButton } from "../../ui/IconButton";
import { Popover } from "../../ui/Popover";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { useProjectParams } from "../Project/ProjectParams";
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
    <ListRowLink href={url} className="items-center p-4 text-sm">
      <div className="w-44 shrink-0 md:w-auto md:grow">
        <div className="truncate">{automationRule.name}</div>
      </div>
      <div className="text-low flex w-32 shrink-0 flex-col overflow-hidden truncate whitespace-nowrap text-sm">
        {automationRule.on.map((event) => (
          <div key={event}>{event}</div>
        ))}
      </div>
      <div
        className="text-low w-36 shrink-0 overflow-hidden truncate whitespace-nowrap"
        data-visual-test="transparent"
      >
        {automationRule.lastAutomationRunDate ? (
          <Time date={automationRule.lastAutomationRunDate} />
        ) : (
          "Not triggered yet"
        )}
      </div>
      <div
        className="w-28 shrink-0 overflow-hidden truncate whitespace-nowrap"
        data-visual-test="transparent"
      >
        <Time date={automationRule.createdAt} className="text-low" />
      </div>
      <div className="w-8 shrink-0">
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
