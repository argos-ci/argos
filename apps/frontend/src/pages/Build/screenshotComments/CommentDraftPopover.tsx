import { useId, useState } from "react";

import { Editor, type EditorValue } from "@/ui/Editor/Editor";
import { hasEditorContent } from "@/ui/Editor/util";
import { toast } from "@/ui/Toaster";
import { useAltKeyHeld } from "@/ui/useAltKeyHeld";

import { ReviewCommentSubmitButton } from "../ReviewCommentSubmitButton";
import { useMentionableUsers } from "../sidebar/MentionableUsersContext";
import { CommentPopoverFrame } from "./CommentPopoverFrame";
import type { ScreenPoint } from "./geometry";

/**
 * The compact floating "Add a comment" prompt shown to the right of the pin
 * after clicking a point on the changes image with the comment tool. A
 * single-line pill (input + send) that grows with the content; the author's
 * avatar lives on the pin, so it's not repeated here. Submitting anchors the
 * comment to the point; the content is kept if the request fails.
 */
export function CommentDraftPopover(props: {
  point: ScreenPoint;
  canAddToReview: boolean;
  onSubmit: (
    body: EditorValue,
    options: { addToReview: boolean },
  ) => Promise<void>;
}) {
  const { point, canAddToReview, onSubmit } = props;
  const mentions = useMentionableUsers();
  const altHeld = useAltKeyHeld();
  const [value, setValue] = useState<EditorValue>(null);
  // Remounts the editor to clear it after a successful submit.
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);

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
      .then(() => {
        setValue(null);
        setEditorKey((key) => key + 1);
      })
      .catch(() => {
        // Keep the content so the user can retry.
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <CommentPopoverFrame
      point={point}
      // Anchor at the pin's vertical center (the 36px pin's center is 18px above
      // the point) and offset right of it; the pill pulls itself up by half its
      // height to stay centered on the pin regardless of how tall it grows.
      offset={{ x: 42, y: -18 }}
      role="dialog"
      aria-label="Add a comment"
      className="w-80"
    >
      <div className="bg-app border-thin flex -translate-y-1/2 items-end gap-2 rounded-2xl p-1.5 shadow-xl">
        <Editor
          key={editorKey}
          onChange={setValue}
          onSubmit={submit}
          mentions={mentions}
          placeholder="Add a comment"
          disabled={isPending}
          autoFocus
          aria-label="Add a comment"
          variant="plain"
          className="min-w-0 flex-1 px-1.5 text-sm"
          contentClassName="max-h-32 min-h-6 overflow-y-auto py-0.5"
        />
        <ReviewCommentSubmitButton
          canAddToReview={canAddToReview}
          altHeld={altHeld}
          fallbackLabel="Submit the comment"
          isEmpty={isEmpty}
          isPending={isPending}
          onPress={submit}
          className="shrink-0"
        />
      </div>
    </CommentPopoverFrame>
  );
}
