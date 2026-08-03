import {
  BellIcon,
  BellOffIcon,
  CheckIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import {
  AiPromptTargetItems,
  useAiPromptTarget,
} from "@/containers/AiPromptButton";
import { Button } from "@/ui/Button";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  MenuTrigger,
  SubmenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { toast } from "@/ui/Toaster";

// Shared id so copying from several threads reuses one toast instead of stacking.
const COPY_PROMPT_TOAST_ID = "thread-prompt-copied";

export function CommentActionsMenu(props: {
  onCopyLink: () => void;
  threadSubscribed: boolean;
  onSubscribeThread: () => void;
  onUnsubscribeThread: () => void;
  /** Whether the thread is currently resolved. */
  resolved: boolean;
  /** When provided, a "Resolve thread"/"Reopen thread" action is shown. */
  onToggleResolved?: () => void;
  /** When provided, an "Edit comment" action is shown. */
  onEdit?: () => void;
  /** When provided, a "Delete comment" action is shown. */
  onDelete?: () => void;
  /**
   * When provided, a "Handle with AI" submenu hands this prompt to a coding
   * agent. It lives in the menu rather than next to the reactions: it acts on
   * the whole thread, like resolving does, and a comment row has no room left
   * for a control that only some threads would use.
   */
  threadPrompt?: string;
}) {
  const {
    onCopyLink,
    onSubscribeThread,
    onUnsubscribeThread,
    threadSubscribed,
    resolved,
    onToggleResolved,
    onEdit,
    onDelete,
    threadPrompt,
  } = props;
  const [, setTarget] = useAiPromptTarget();
  const clipboard = useClipboard();
  return (
    <MenuTrigger>
      <Button
        variant="secondary"
        iconOnly
        size="small"
        aria-label="Comment actions"
      >
        <MoreHorizontalIcon />
      </Button>
      <Popover placement="bottom end">
        <Menu aria-label="Comment actions">
          {onEdit ? (
            <MenuItem onAction={onEdit}>
              <MenuItemIcon>
                <PencilIcon />
              </MenuItemIcon>
              Edit
            </MenuItem>
          ) : null}
          <MenuItem
            onAction={
              threadSubscribed ? onUnsubscribeThread : onSubscribeThread
            }
          >
            <MenuItemIcon>
              {threadSubscribed ? <BellOffIcon /> : <BellIcon />}
            </MenuItemIcon>
            {threadSubscribed
              ? "Unsubscribe from thread"
              : "Subscribe to thread"}
          </MenuItem>
          {threadPrompt ? (
            <>
              <MenuSeparator />
              <SubmenuTrigger>
                <MenuItem textValue="Handle with AI">
                  <MenuItemIcon>
                    <SparklesIcon />
                  </MenuItemIcon>
                  Handle with AI
                </MenuItem>
                <Popover>
                  <Menu aria-label="Handle with AI">
                    <AiPromptTargetItems
                      entry={{
                        label: "Handle this thread",
                        name: "thread prompt",
                        prompt: threadPrompt,
                      }}
                      onPick={setTarget}
                      onCopy={(entry) => {
                        clipboard.copy(entry.prompt);
                        // The menu closes on the click, so the toast is the
                        // only place left to confirm the copy.
                        toast.success("Prompt copied", {
                          id: COPY_PROMPT_TOAST_ID,
                          description:
                            "Paste it into a coding agent working in your repository.",
                        });
                      }}
                    />
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </>
          ) : null}
          {onToggleResolved ? (
            <>
              <MenuSeparator />
              <MenuItem onAction={onToggleResolved}>
                <MenuItemIcon>
                  <CheckIcon />
                </MenuItemIcon>
                {resolved ? "Reopen thread" : "Resolve thread"}
              </MenuItem>
            </>
          ) : null}
          <MenuSeparator />
          <MenuItem onAction={onCopyLink}>
            <MenuItemIcon>
              <LinkIcon />
            </MenuItemIcon>
            Copy link to comment
          </MenuItem>
          {onDelete ? (
            <>
              <MenuSeparator />
              <MenuItem variant="danger" onAction={onDelete}>
                <MenuItemIcon>
                  <Trash2Icon />
                </MenuItemIcon>
                Delete
              </MenuItem>
            </>
          ) : null}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
