import { useId, useState } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { toast } from "sonner";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { Button, ButtonIcon } from "@/ui/Button";
import { Editor, type EditorValue } from "@/ui/Editor/Editor";
import { MOD } from "@/ui/Editor/EditorToolbar.shortcuts";
import { hasEditorContent } from "@/ui/Editor/util";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { useAltKeyHeld } from "@/ui/useAltKeyHeld";

import { useMentionableUsers } from "../sidebar/MentionableUsersContext";

type Avatar = React.ComponentProps<typeof AccountAvatar>["avatar"];

/**
 * The inline "Leave a comment" composer rendered between diff lines once the
 * user adds a comment from the gutter. The editor sits in a bordered field with
 * the author's avatar beside it, and the actions live *below* the field — a real
 * "Cancel" and "Add comment" (no send arrow), matching the edit-comment UX.
 * Submitting anchors the comment to the line range; the content is kept if the
 * request fails so the user can retry.
 */
export function DiffCommentDraft(props: {
  avatar: Avatar | null;
  canAddToReview: boolean;
  onSubmit: (
    body: EditorValue,
    options: { addToReview: boolean },
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { avatar, canAddToReview, onSubmit, onCancel } = props;
  const mentions = useMentionableUsers();
  const altHeld = useAltKeyHeld();
  const [value, setValue] = useState<EditorValue>(null);
  const [isPending, setIsPending] = useState(false);
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);
  const reviewMode = canAddToReview && !altHeld;
  const submitLabel = !canAddToReview
    ? "Add comment"
    : reviewMode
      ? "Add to review"
      : "Post comment";

  const submit = () => {
    if (isPending) {
      return;
    }
    if (isEmpty) {
      toast.warning("Comment required", {
        id: emptyToastId,
        description: "Please add a comment before submitting.",
      });
      return;
    }
    setIsPending(true);
    onSubmit(value, { addToReview: canAddToReview && !altHeld })
      .catch(() => {
        // Keep the content so the user can retry.
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <div className="flex items-start gap-2">
      {avatar ? (
        <AccountAvatar
          avatar={avatar}
          className="mt-1 size-6 shrink-0 border"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="border-thin bg-app focus-within:border-default rounded-lg px-3 py-2 transition-colors">
          <Editor
            onChange={setValue}
            onSubmit={submit}
            mentions={mentions}
            placeholder="Leave a comment"
            disabled={isPending}
            autoFocus
            aria-label="Add a comment"
            variant="plain"
            className="text-sm"
            contentClassName="max-h-48 min-h-12 overflow-y-auto"
          />
        </div>
        <div className="mt-2 flex justify-end gap-1.5">
          <Button
            variant="ghost"
            rounded
            size="small"
            onPress={onCancel}
            isDisabled={isPending}
          >
            Cancel
          </Button>
          <HotkeyTooltip
            description={
              canAddToReview ? (
                <div className="flex flex-col">
                  <span>{submitLabel}</span>
                  <span className="text-low">
                    {reviewMode
                      ? "Hold Alt to post now"
                      : "Release Alt to draft"}
                  </span>
                </div>
              ) : (
                submitLabel
              )
            }
            keys={[MOD, "Enter"]}
            placement="top"
          >
            <Button
              variant="secondary"
              rounded
              size="small"
              onPress={submit}
              // Stays clickable while empty so the press can surface the toast;
              // only truly disabled while a submit is in flight.
              isDisabled={isPending}
              aria-disabled={isEmpty}
            >
              {reviewMode ? (
                <ButtonIcon>
                  <MessageSquarePlusIcon />
                </ButtonIcon>
              ) : null}
              {submitLabel}
            </Button>
          </HotkeyTooltip>
        </div>
      </div>
    </div>
  );
}
