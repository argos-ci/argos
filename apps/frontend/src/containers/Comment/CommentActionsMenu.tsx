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
  getAiPromptTargetItems,
  useAiPromptTarget,
} from "@/containers/AiPromptButton";
import { Button } from "@/ui/Button";
import {
  Menu,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
  SubMenu,
  SubMenuContent,
} from "@/ui/menu-kit";
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
    <MenuRoot>
      <MenuTrigger>
        <Button
          variant="ghost"
          iconOnly
          size="small"
          aria-label="Comment actions"
        >
          <MoreHorizontalIcon />
        </Button>
      </MenuTrigger>
      <Menu side="bottom" align="end" aria-label="Comment actions">
        {onEdit ? (
          <MenuItem icon={<PencilIcon />} onAction={onEdit}>
            Edit
          </MenuItem>
        ) : null}
        <MenuItem
          icon={<>{threadSubscribed ? <BellOffIcon /> : <BellIcon />}</>}
          onAction={threadSubscribed ? onUnsubscribeThread : onSubscribeThread}
        >
          {threadSubscribed ? "Unsubscribe from thread" : "Subscribe to thread"}
        </MenuItem>
        {threadPrompt ? (
          <>
            <MenuSeparator />
            <SubMenu>
              <MenuItem icon={<SparklesIcon />} textValue="Handle with AI">
                Handle with AI
              </MenuItem>
              <SubMenuContent>
                {getAiPromptTargetItems({
                  entry: {
                    label: "Handle this thread",
                    name: "thread prompt",
                    prompt: threadPrompt,
                  },
                  onPick: setTarget,
                  onCopy: (entry: { prompt: string }) => {
                    clipboard.copy(entry.prompt);
                    // The menu closes on the click, so the toast is the
                    // only place left to confirm the copy.
                    toast.success("Prompt copied", {
                      id: COPY_PROMPT_TOAST_ID,
                      description:
                        "Paste it into a coding agent working in your repository.",
                    });
                  },
                })}
              </SubMenuContent>
            </SubMenu>
          </>
        ) : null}
        {onToggleResolved ? (
          <>
            <MenuSeparator />
            <MenuItem icon={<CheckIcon />} onAction={onToggleResolved}>
              {resolved ? "Reopen thread" : "Resolve thread"}
            </MenuItem>
          </>
        ) : null}
        <MenuSeparator />
        <MenuItem icon={<LinkIcon />} onAction={onCopyLink}>
          Copy link to comment
        </MenuItem>
        {onDelete ? (
          <>
            <MenuSeparator />
            <MenuItem
              icon={<Trash2Icon />}
              variant="danger"
              onAction={onDelete}
            >
              Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </MenuRoot>
  );
}
