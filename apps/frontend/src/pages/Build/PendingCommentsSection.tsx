import { MessageSquareIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Chip } from "@/ui/Chip";

export const PendingCommentsSection_Build = graphql(`
  fragment PendingCommentsSection_Build on Build {
    comments {
      id
      pending
    }
  }
`);

/**
 * Compact status chip summarizing how many comments are drafted into the
 * pending review, without expanding their content. Used in the lightweight
 * review popover where the full list would be too heavy.
 */
export function PendingCommentChip(props: {
  build: DocumentType<typeof PendingCommentsSection_Build>;
}) {
  const count = props.build.comments.filter(
    (comment) => comment.pending,
  ).length;
  return (
    <Chip
      scale="sm"
      color="neutral"
      icon={count > 0 ? MessageSquareIcon : undefined}
    >
      {count === 0
        ? "No pending comments"
        : `${count} pending comment${count > 1 ? "s" : ""}`}
    </Chip>
  );
}
