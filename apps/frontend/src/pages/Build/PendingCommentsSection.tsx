import { ImageIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { Label } from "@/ui/Label";

export const PendingCommentsSection_Build = graphql(`
  fragment PendingCommentsSection_Build on Build {
    comments {
      id
      pending
      content
      screenshotDiff {
        id
        name
      }
    }
  }
`);

/**
 * Lists the comments the current user has drafted into their pending review,
 * shown in the submit-review surfaces so they can see exactly what will become
 * visible when they submit. Renders nothing when there are no pending comments.
 */
export function PendingCommentsSection(props: {
  build: DocumentType<typeof PendingCommentsSection_Build>;
}) {
  const pending = props.build.comments.filter((comment) => comment.pending);
  if (pending.length === 0) {
    return null;
  }
  return (
    <div>
      <Label>
        Pending comment{pending.length > 1 ? "s" : ""} ({pending.length})
      </Label>
      <div className="border-thin max-h-48 divide-y overflow-y-auto rounded-md">
        {pending.map((comment) => (
          <div key={comment.id} className="px-2.5 py-2">
            {comment.screenshotDiff ? (
              <div className="text-low mb-1 flex items-center gap-1 text-xs">
                <ImageIcon className="size-3 shrink-0" />
                <span className="min-w-0 truncate">
                  {comment.screenshotDiff.name}
                </span>
              </div>
            ) : null}
            <ReadOnlyEditor content={comment.content} className="text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
