import { memo, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { List, ListHeaderRow, ListRowLink, ListRowLoader } from "@/ui/List";
import { Menu, MenuItem, MenuTrigger } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";

import { IconButton } from "../../ui/IconButton";
import { Popover } from "../../ui/Popover";

type AutomationRules = {
  edges: AutomationRule[];
  pageInfo: { totalCount: number; hasNextPage: boolean };
};

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

const AutomationRow = memo(function AutomationRow({
  automationRule,
  style,
  onDelete,
}: {
  automationRule: AutomationRule;
  style: React.CSSProperties;
  onDelete: (id: string) => void;
}) {
  const { accountSlug, projectName } = useParams();
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <ListRowLink
      href={`/${accountSlug}/${projectName}/automations/${automationRule.id}`}
      className="items-center p-4 text-sm"
      style={style}
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
});

export function AutomationRulesList({
  automationRules,
  fetching,
  fetchNextPage,
  onDelete,
}: {
  automationRules: AutomationRules;
  fetching: boolean;
  fetchNextPage: () => void;
  onDelete: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = automationRules.pageInfo;
  const displayCount = automationRules.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 75,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      !fetching &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, fetching, hasNextPage, fetchNextPage]);

  return (
    <List
      ref={parentRef}
      className="absolute max-h-full w-full"
      style={{ display: "block" }}
    >
      <div
        className="relative"
        style={{ height: rowVirtualizer.getTotalSize() + 50 }}
      >
        <ListHeaderRow
          key="header"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 50,
          }}
        >
          <div className="w-44 shrink-0 md:w-auto md:grow">
            Automation rule name
          </div>
          <div className="w-32 shrink-0">Trigger Events</div>
          <div className="w-28 shrink-0">Last run</div>
          <div className="w-28 shrink-0">Created</div>
          <div className="w-8 shrink-0" />
        </ListHeaderRow>
        {virtualItems.map((virtualRow) => {
          const automationRule = automationRules.edges[virtualRow.index];
          if (!automationRule) {
            return (
              <ListRowLoader
                key={`loader-${virtualRow.index}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start + 50}px)`,
                }}
              >
                Fetching automations...
              </ListRowLoader>
            );
          }
          return (
            <AutomationRow
              key={`automation-${automationRule.id}`}
              automationRule={automationRule}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start + 50}px)`,
              }}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </List>
  );
}
