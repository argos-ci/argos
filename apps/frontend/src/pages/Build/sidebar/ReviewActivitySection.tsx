import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import clsx from "clsx";
import {
  BanIcon,
  BellIcon,
  BellOffIcon,
  FileUpIcon,
  MailCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { Activity, ActivityItem } from "@/ui/Activity";
import { IconButton } from "@/ui/IconButton";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { buildReviewDescriptors } from "@/util/build-review";
import { getErrorMessage } from "@/util/error";
import { useNonNullable } from "@/util/useNonNullable";

import { AddCommentForm } from "./AddCommentForm";
import { CommentCard } from "./CommentCard";

const _BuildFragment = graphql(`
  fragment ReviewActivitySection_Build on Build {
    id
    createdAt
    concludedAt
    subscribed
    ...AddCommentForm_Build
    reviews {
      id
      date
      state
      dismissedAt
      dismissedBy {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
    comments {
      ...CommentCard_Comment
    }
  }
`);

const SubscribeToBuildMutation = graphql(`
  mutation ReviewActivitySection_subscribeToBuild(
    $input: SubscribeToBuildInput!
  ) {
    subscribeToBuild(input: $input) {
      id
      subscribed
    }
  }
`);

const UnsubscribeFromBuildMutation = graphql(`
  mutation ReviewActivitySection_unsubscribeFromBuild(
    $input: UnsubscribeFromBuildInput!
  ) {
    unsubscribeFromBuild(input: $input) {
      id
      subscribed
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

type ActivityEntry =
  | { kind: "created"; date: string }
  | { kind: "ready"; date: string }
  | { kind: "review"; date: string; review: Build["reviews"][number] }
  | {
      kind: "review-dismissed";
      date: string;
      review: Build["reviews"][number];
    }
  | { kind: "comment"; date: string; comment: Build["comments"][number] };

function getActivityEntries(build: Build): ActivityEntry[] {
  const entries: ActivityEntry[] = [{ kind: "created", date: build.createdAt }];
  if (build.concludedAt) {
    entries.push({ kind: "ready", date: build.concludedAt });
  }
  for (const review of build.reviews) {
    entries.push({ kind: "review", date: review.date, review });
    if (review.dismissedAt) {
      entries.push({
        kind: "review-dismissed",
        date: review.dismissedAt,
        review,
      });
    }
  }
  for (const comment of build.comments) {
    entries.push({ kind: "comment", date: comment.date, comment });
  }
  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/**
 * Reads a `#comment-…` hash from the URL and, when it matches a loaded comment,
 * returns its id so the comment can be highlighted. The highlight clears on the
 * next click anywhere.
 */
function useHighlightedCommentId(commentIds: string[]): string | null {
  const [hashId, setHashId] = useState<string | null>(() => {
    const hash = window.location.hash.slice(1);
    return hash || null;
  });
  const matchedId = hashId && commentIds.includes(hashId) ? hashId : null;
  useEffect(() => {
    if (!matchedId) {
      return;
    }
    const clear = () => setHashId(null);
    document.addEventListener("click", clear, { once: true, capture: true });
    return () => {
      document.removeEventListener("click", clear, { capture: true });
    };
  }, [matchedId]);
  return matchedId;
}

export function ReviewActivitySection(props: { build: Build }) {
  const { build } = props;
  const permissions = useNonNullable(ProjectPermissionsContext);
  const canComment = permissions.includes(ProjectPermission.Review);
  const entries = getActivityEntries(build);
  const highlightedCommentId = useHighlightedCommentId(
    build.comments.map((comment) => comment.id),
  );
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Activity</SidebarHeading>
        <SubscribeToggleButton build={build} />
      </SidebarHeader>
      <div className="px-3">
        <Activity>
          {entries.map((entry, index) => (
            <ActivityEntryRow
              key={index}
              entry={entry}
              highlightedCommentId={highlightedCommentId}
            />
          ))}
        </Activity>
        {canComment ? (
          <div className="mt-3">
            <AddCommentForm build={build} />
          </div>
        ) : null}
      </div>
    </SidebarSection>
  );
}

function SubscribeToggleButton(props: { build: Build }) {
  const { build } = props;
  const [subscribeToBuild] = useMutation(SubscribeToBuildMutation, {
    variables: { input: { buildId: build.id } },
    optimisticResponse: {
      subscribeToBuild: {
        __typename: "Build",
        id: build.id,
        subscribed: true,
      },
    },
  });
  const [unsubscribeFromBuild] = useMutation(UnsubscribeFromBuildMutation, {
    variables: { input: { buildId: build.id } },
    optimisticResponse: {
      unsubscribeFromBuild: {
        __typename: "Build",
        id: build.id,
        subscribed: false,
      },
    },
  });
  const subscribed = build.subscribed;
  const label = subscribed ? "Unsubscribe" : "Subscribe";
  const handlePress = () => {
    if (subscribed) {
      unsubscribeFromBuild()
        .then(() => {
          toast.success(
            "You will no longer receive notifications for this build.",
          );
        })
        .catch((error) => {
          toast.error(getErrorMessage(error));
        });
    } else {
      subscribeToBuild()
        .then(() => {
          toast.success("You will receive notifications for this build.");
        })
        .catch((error) => {
          toast.error(getErrorMessage(error));
        });
    }
  };
  return (
    <Tooltip content={label}>
      <IconButton rounded size="small" aria-label={label} onPress={handlePress}>
        {subscribed ? <BellIcon /> : <BellOffIcon />}
      </IconButton>
    </Tooltip>
  );
}

function ActivityEntryRow(props: {
  entry: ActivityEntry;
  highlightedCommentId: string | null;
}) {
  const { entry } = props;
  switch (entry.kind) {
    case "created":
      return (
        <ActivityItem icon={<FileUpIcon className="size-3.5" />}>
          Build created · <Time date={entry.date} />
        </ActivityItem>
      );
    case "ready":
      return (
        <ActivityItem icon={<MailCheckIcon className="size-3.5" />}>
          Build ready · <Time date={entry.date} />
        </ActivityItem>
      );
    case "review": {
      const { review } = entry;
      const descriptor = buildReviewDescriptors[review.state];
      const Icon = descriptor.icon;
      return (
        <ActivityItem
          icon={<Icon className={clsx("size-3.5", descriptor.textColor)} />}
        >
          <span className="font-medium">{descriptor.label}</span>
          {review.user && (
            <>
              {" by "}
              <span className="text-default font-medium">
                {review.user.name || review.user.slug}
              </span>
            </>
          )}
          {" · "}
          <Time date={entry.date} />
        </ActivityItem>
      );
    }
    case "review-dismissed": {
      const { review } = entry;
      return (
        <ActivityItem icon={<BanIcon className="text-low size-3.5" />}>
          <span className="font-medium">Review dismissed</span>
          {review.dismissedBy ? (
            <>
              {" by "}
              <span className="text-default font-medium">
                {review.dismissedBy.name || review.dismissedBy.slug}
              </span>
            </>
          ) : null}
          {review.user ? (
            <>
              {" for "}
              <span className="text-default font-medium">
                {review.user.name || review.user.slug}
              </span>
            </>
          ) : null}
          {" · "}
          <Time date={entry.date} />
        </ActivityItem>
      );
    }
    case "comment":
      return (
        <CommentCard
          comment={entry.comment}
          highlighted={entry.comment.id === props.highlightedCommentId}
        />
      );
  }
}
