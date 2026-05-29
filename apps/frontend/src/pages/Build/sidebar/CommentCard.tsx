import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { Time } from "@/ui/Time";

const _CommentFragment = graphql(`
  fragment CommentCard_Comment on Comment {
    id
    date
    content
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

export function CommentCard(props: {
  comment: DocumentType<typeof _CommentFragment>;
}) {
  const { comment } = props;
  return (
    <div className="border-thin bg-app -mx-1 rounded-md">
      <div className="flex items-center gap-2 px-3 py-2">
        {comment.user ? (
          <AccountAvatar
            avatar={comment.user.avatar}
            className="size-5 border"
          />
        ) : null}
        <span className="text-default text-xs font-medium">
          {comment.user?.name || comment.user?.slug || "Unknown user"}
        </span>
        <Time date={comment.date} className="text-low text-xs" />
      </div>
      <div className="text-default px-3 pb-2 text-sm">
        <ReadOnlyEditor content={comment.content} />
      </div>
    </div>
  );
}
