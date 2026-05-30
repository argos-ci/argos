import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { clsx } from "clsx";
import moment from "moment";
import { Button } from "react-aria-components";
import { toast } from "sonner";
import { useClipboard } from "use-clipboard-copy";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { CommentPermission } from "@/gql/graphql";
import { type EditorValue } from "@/ui/Editor/Editor";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { CommentActionsMenu } from "./CommentActionsMenu";

// Shared id so copying a comment link reuses a single toast instead of stacking.
const COPY_TOAST_ID = "comment-link-copied";

// Detailed date format used in the date tooltip, e.g. "Thu May 21, 2026, 15:47:43".
const DETAILED_DATE_FORMAT = "ddd MMM D, YYYY, HH:mm:ss";

const _CommentFragment = graphql(`
  fragment CommentCard_Comment on Comment {
    id
    date
    editedAt
    content
    permissions
    user {
      id
      name
      slug
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

const UpdateCommentMutation = graphql(`
  mutation CommentCard_updateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      ...CommentCard_Comment
    }
  }
`);

export function CommentCard(props: {
  comment: DocumentType<typeof _CommentFragment>;
  highlighted?: boolean;
}) {
  const { comment, highlighted = false } = props;
  const ref = useRef<HTMLDivElement>(null);
  const clipboard = useClipboard();
  const [isEditing, setIsEditing] = useState(false);
  const [updateComment] = useMutation(UpdateCommentMutation);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.hash = comment.id;
    clipboard.copy(url.toString());
    toast.success("Link copied", {
      id: COPY_TOAST_ID,
      description: "The link to this comment was copied to your clipboard.",
    });
  };

  const handleEditSubmit = async (body: EditorValue) => {
    try {
      await updateComment({
        variables: { input: { id: comment.id, body } },
      });
      setIsEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };

  const canEdit = comment.permissions.includes(CommentPermission.Edit);
  const isEdited = Boolean(comment.editedAt);

  return (
    <div
      ref={ref}
      id={comment.id}
      className={clsx(
        "border-thin bg-app ring-primary -mx-1 rounded-md transition",
        highlighted ? "ring-2" : "ring-0",
      )}
    >
      <div className="flex items-center gap-2 py-2 pr-2 pl-3">
        {comment.user ? (
          <AccountAvatar
            avatar={comment.user.avatar}
            className="size-5 border"
          />
        ) : null}
        <span className="text-default text-xs font-medium">
          {comment.user?.name || comment.user?.slug || "Unknown user"}
        </span>
        <Tooltip
          content={
            <div className="flex flex-col">
              <span>
                Created: {moment(comment.date).format(DETAILED_DATE_FORMAT)}
              </span>
              {comment.editedAt ? (
                <span>
                  Edited:{" "}
                  {moment(comment.editedAt).format(DETAILED_DATE_FORMAT)}
                </span>
              ) : null}
            </div>
          }
        >
          <Button
            onPress={copyLink}
            aria-label="Copy link to comment"
            className="text-low hover:text-default text-xs transition"
          >
            <Time date={comment.date} tooltip="none" />
            {isEdited ? " (edited)" : null}
          </Button>
        </Tooltip>
        <CommentActionsMenu
          onCopyLink={copyLink}
          onEdit={canEdit ? () => setIsEditing(true) : undefined}
        />
      </div>
      <div className="text-default px-2 pb-2 text-sm">
        {isEditing ? (
          <StandaloneEditor
            variant="plain"
            defaultValue={comment.content}
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
            submitLabel="Save"
            emptyMessage={{
              title: "Comment required",
              description: "Please add a comment before saving.",
            }}
            autoFocus
            aria-label="Edit comment"
            contentClassName="px-1"
          />
        ) : (
          <ReadOnlyEditor content={comment.content} className="px-1" />
        )}
      </div>
    </div>
  );
}
