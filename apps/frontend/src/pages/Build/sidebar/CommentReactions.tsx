import { useMutation } from "@apollo/client/react";
import { clsx } from "clsx";
import { SmilePlusIcon } from "lucide-react";
import { Button } from "react-aria-components";
import { toast } from "sonner";

import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { EmojiPickerPopover, EmojiPickerTrigger } from "@/ui/EmojiPicker";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";
import { formatNameListText } from "@/util/nameList";

const _CommentFragment = graphql(`
  fragment CommentReactions_Comment on Comment {
    id
    reactions {
      emoji
      count
      reactedByMe
      users {
        id
        name
        slug
      }
    }
  }
`);

const AddCommentReactionMutation = graphql(`
  mutation CommentReactions_addCommentReaction($input: CommentReactionInput!) {
    addCommentReaction(input: $input) {
      id
      ...CommentReactions_Comment
    }
  }
`);

const RemoveCommentReactionMutation = graphql(`
  mutation CommentReactions_removeCommentReaction(
    $input: CommentReactionInput!
  ) {
    removeCommentReaction(input: $input) {
      id
      ...CommentReactions_Comment
    }
  }
`);

type Comment = DocumentType<typeof _CommentFragment>;
type ReactionGroup = Comment["reactions"][number];

/**
 * Whether the current user is allowed to react. Reacting requires the same
 * "review" permission on the project as commenting does.
 */
function useCanReact(): boolean {
  return useProjectPermission(ProjectPermission.Review);
}

/**
 * Shared add/remove reaction mutations for a comment. Both the picker button
 * and the reaction pills mutate the same comment.
 */
function useReactionActions(commentId: string) {
  const [addReaction] = useMutation(AddCommentReactionMutation);
  const [removeReaction] = useMutation(RemoveCommentReactionMutation);

  const react = (emoji: string) => {
    addReaction({
      variables: { input: { commentId, emoji } },
    }).catch((error) => {
      toast.error(getErrorMessage(error));
    });
  };

  const toggle = (group: ReactionGroup) => {
    const mutation = group.reactedByMe ? removeReaction : addReaction;
    mutation({
      variables: { input: { commentId, emoji: group.emoji } },
    }).catch((error) => {
      toast.error(getErrorMessage(error));
    });
  };

  return { react, toggle };
}

/**
 * Build the tooltip text listing who reacted with a given emoji, e.g.
 * "Alice, Bob and 2 others reacted with 👍".
 */
function getReactionTooltip(group: ReactionGroup): string {
  const names = group.users.map((user) => user.name || user.slug);
  if (names.length === 0) {
    return "";
  }
  return `${formatNameListText(names, { max: 3 })} reacted with ${group.emoji}`;
}

/**
 * Picker button that opens the emoji picker to add a reaction to a comment.
 * Rendered in the comment header, next to the actions menu. Hidden when the
 * current user lacks permission to react.
 */
export function CommentAddReactionButton(props: { comment: Comment }) {
  const { comment } = props;
  const canReact = useCanReact();
  const { react } = useReactionActions(comment.id);

  if (!canReact) {
    return null;
  }

  return (
    <EmojiPickerTrigger>
      <Tooltip content="Add reaction">
        <IconButton rounded size="small" aria-label="Add reaction">
          <SmilePlusIcon />
        </IconButton>
      </Tooltip>
      <EmojiPickerPopover
        placement="bottom end"
        onEmojiSelect={({ emoji }) => react(emoji)}
      />
    </EmojiPickerTrigger>
  );
}

/**
 * The list of reaction pills shown in the comment footer. Renders nothing when
 * the comment has no reactions yet.
 */
export function CommentReactionList(props: { comment: Comment }) {
  const { comment } = props;
  const canReact = useCanReact();
  const { toggle } = useReactionActions(comment.id);

  if (comment.reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
      {comment.reactions.map((group) => (
        <Tooltip key={group.emoji} content={getReactionTooltip(group)}>
          <Button
            isDisabled={!canReact}
            onPress={() => toggle(group)}
            className={clsx(
              "flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium transition",
              "cursor-default focus:outline-hidden data-focus-visible:ring-4",
              canReact && "data-hovered:border-hover",
              group.reactedByMe
                ? "border-primary bg-active text-default"
                : "text-low",
            )}
          >
            <span className="text-sm leading-none">{group.emoji}</span>
            <span className="tabular-nums">{group.count}</span>
          </Button>
        </Tooltip>
      ))}
      <CommentAddReactionButton comment={comment} />
    </div>
  );
}
