import { useRef, useState } from "react";
import { MoreVerticalIcon } from "lucide-react";
import { useParams } from "react-router-dom";

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

import { IconButton } from "../../ui/IconButton";
import { Popover } from "../../ui/Popover";

type AutomationRule = {
  id: string;
  name: string;
  createdAt: string;
  on: string[];
  lastAutomationRunDate?: string | null;
};

function formatEventLabel(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

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

function AutomationRow({
  automationRule,
  onDelete,
}: {
  automationRule: AutomationRule;
  onDelete: (id: string) => void;
}) {
  const { accountSlug, projectName } = useParams();
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <ListRowLink
      href={`/${accountSlug}/${projectName}/automations/${automationRule.id}`}
      className="items-center p-4 text-sm"
    >
      <div className="w-44 shrink-0 md:w-auto md:grow">
        <div className="truncate">{automationRule.name}</div>
      </div>
      <div className="text-low flex w-32 shrink-0 flex-col overflow-hidden truncate whitespace-nowrap text-sm">
        {automationRule.on.map((event) => (
          <div key={event}>{formatEventLabel(event)}</div>
        ))}
      </div>
      <div
        className="text-low w-28 shrink-0 overflow-hidden truncate whitespace-nowrap"
        data-visual-test="transparent"
      >
        {automationRule.lastAutomationRunDate ? (
          <Time date={automationRule.lastAutomationRunDate} />
        ) : (
          "Never run yet"
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
              <MenuItem
                href={`/${accountSlug}/${projectName}/automations/${automationRule.id}`}
              >
                Edit
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

export function AutomationRulesList({
  automationRules,
  onDelete,
}: {
  automationRules: AutomationRule[];
  onDelete: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <List
      ref={parentRef}
      className="absolute max-h-full w-full"
      style={{ display: "block" }}
    >
      <div className="relative">
        <ListHeaderRow>
          <div className="w-44 shrink-0 md:w-auto md:grow">
            Automation rule name
          </div>
          <div className="w-32 shrink-0">Trigger Events</div>
          <div className="w-28 shrink-0">Last run</div>
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
