import { useCallback, useEffect, useMemo } from "react";
import { useMutation } from "@apollo/client/react";
import clsx from "clsx";
import {
  BanIcon,
  BellIcon,
  BellOffIcon,
  FileUpIcon,
  MailCheckIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { Activity, ActivityItem } from "@/ui/Activity";
import type { MentionUser } from "@/ui/Editor/mention";
import { IconButton } from "@/ui/IconButton";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useLiveRef } from "@/ui/useLiveRef";
import { getMentionUser, getUserCardData, UserHoverCard } from "@/ui/UserCard";
import { buildReviewDescriptors } from "@/util/build-review";
import { getErrorMessage } from "@/util/error";
import { useNonNullable } from "@/util/useNonNullable";

import { AddCommentForm } from "./AddCommentForm";
import { CommentCard } from "./CommentCard";
import { MentionableUsersProvider } from "./MentionableUsersContext";

const _BuildFragment = graphql(`
  fragment ReviewActivitySection_Build on Build {
    id
    createdAt
    concludedAt
    subscribed
    ...AddCommentForm_Build
    members {
      ...UserCard_user
    }
    reviews {
      id
      date
      state
      dismissedAt
      dismissedBy {
        ...UserCard_user
      }
      user {
        ...UserCard_user
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
type Comment = Build["comments"][number];
type CommentThread = { root: Comment; replies: Comment[] };
type ReviewUser = NonNullable<Build["reviews"][number]["user"]>;

/**
 * A reviewer's name in the activity flow, with a hover card showing their
 * avatar and slug — the same card used for comment mentions.
 */
function ReviewUserName(props: { user: ReviewUser }) {
  const { user } = props;
  return (
    <UserHoverCard user={getUserCardData(user)}>
      <span tabIndex={0} className="text-default font-medium">
        {user.name || user.slug}
      </span>
    </UserHoverCard>
  );
}

type ActivityEntry =
  | { kind: "created"; date: string }
  | { kind: "ready"; date: string }
  | { kind: "review"; date: string; review: Build["reviews"][number] }
  | {
      kind: "review-dismissed";
      date: string;
      review: Build["reviews"][number];
    }
  | { kind: "comment"; date: string; thread: CommentThread };

function getCommentThreads(comments: Comment[]): CommentThread[] {
  const commentsById = new Map(
    comments.map((comment) => [comment.id, comment]),
  );
  const repliesByThreadId = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  for (const comment of comments) {
    if (!comment.threadId) {
      roots.push(comment);
      continue;
    }
    if (!commentsById.has(comment.threadId)) {
      continue;
    }
    const replies = repliesByThreadId.get(comment.threadId);
    if (replies) {
      replies.push(comment);
    } else {
      repliesByThreadId.set(comment.threadId, [comment]);
    }
  }

  return roots.map((root) => ({
    root,
    replies: repliesByThreadId.get(root.id) ?? [],
  }));
}

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
  for (const thread of getCommentThreads(build.comments)) {
    entries.push({ kind: "comment", date: thread.root.date, thread });
  }
  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/**
 * Stable key per activity entry so React keeps each row's component instance
 * tied to its data. Index keys would let a removed comment's state (e.g. its
 * delete animation) bleed onto the next row.
 */
function getActivityEntryKey(entry: ActivityEntry): string {
  switch (entry.kind) {
    case "created":
    case "ready":
      return entry.kind;
    case "review":
      return `review-${entry.review.id}`;
    case "review-dismissed":
      return `review-dismissed-${entry.review.id}`;
    case "comment":
      return `comment-${entry.thread.root.id}`;
  }
}

/**
 * Reads a `#comment-…` hash from the URL and, when it matches a loaded comment,
 * returns its id so the comment can be highlighted. The highlight clears on the
 * next click anywhere, after 3 seconds, or when the component unmounts.
 */
function useHighlightedCommentId(commentIds: string[]): string | null {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const hashId = hash.slice(1);
  const matchedId = hashId && commentIds.includes(hashId) ? hashId : null;
  const matchedIdRef = useLiveRef(matchedId);
  const clear = useCallback(() => {
    if (matchedIdRef.current) {
      navigate({ hash: "" }, { replace: true });
    }
  }, [navigate, matchedIdRef]);
  // Clear when we click outside.
  useEffect(() => {
    if (!matchedId) {
      return;
    }
    document.addEventListener("click", clear, { once: true, capture: true });
    return () => {
      document.removeEventListener("click", clear, { capture: true });
    };
  }, [matchedId, clear]);
  // Clear after 3s.
  useEffect(() => {
    if (!matchedId) {
      return;
    }
    const id = window.setTimeout(clear, 3000);
    return () => window.clearTimeout(id);
  }, [matchedId, clear]);
  // Clear at unmount.
  useEffect(() => clear, [clear]);
  return matchedId;
}

function toMentionUsers(members: Build["members"]): MentionUser[] {
  return members.map(getMentionUser);
}

export function ReviewActivitySection(props: { build: Build }) {
  const { build } = props;
  const permissions = useNonNullable(ProjectPermissionsContext);
  const canComment = permissions.includes(ProjectPermission.Review);
  const entries = getActivityEntries(build);
  const highlightedCommentId = useHighlightedCommentId(
    build.comments.map((comment) => comment.id),
  );
  const mentionableUsers = useMemo(
    () => toMentionUsers(build.members),
    [build.members],
  );
  return (
    <MentionableUsersProvider value={mentionableUsers}>
      <SidebarSection>
        <SidebarHeader>
          <SidebarHeading>Activity</SidebarHeading>
          <SubscribeToggleButton build={build} />
        </SidebarHeader>
        <div className="px-3 select-none">
          <Activity gap={false}>
            <AnimatePresence initial={false}>
              {entries.map((entry, index) => (
                <ActivityEntryRow
                  key={getActivityEntryKey(entry)}
                  entry={entry}
                  highlightedCommentId={highlightedCommentId}
                  isFirst={index === 0}
                  buildId={build.id}
                  canReply={canComment}
                />
              ))}
            </AnimatePresence>
          </Activity>
          {canComment ? (
            <div className="-mx-1.5 mt-3 -mb-1.5">
              <AddCommentForm build={build} />
            </div>
          ) : null}
        </div>
      </SidebarSection>
    </MentionableUsersProvider>
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
        {subscribed ? <BellOffIcon /> : <BellIcon />}
      </IconButton>
    </Tooltip>
  );
}

function ActivityEntryRow(props: {
  entry: ActivityEntry;
  highlightedCommentId: string | null;
  isFirst: boolean;
  buildId: string;
  canReply: boolean;
}) {
  const { entry, highlightedCommentId, isFirst, buildId, canReply } = props;
  // Each row carries its own top spacing (rather than relying on a `space-y`
  // gap) so a collapsing comment can shrink that spacing away as part of its
  // own height, keeping the delete animation smooth.
  const spacing = isFirst ? undefined : "pt-4";

  if (entry.kind === "comment") {
    return (
      <motion.div
        className={spacing}
        style={{ overflowY: "clip" }}
        exit={{ height: 0, paddingTop: 0, opacity: 0 }}
        transition={{
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1],
          opacity: { duration: 0.15 },
        }}
      >
        <CommentCard
          buildId={buildId}
          comment={entry.thread.root}
          replies={entry.thread.replies}
          highlightedCommentId={highlightedCommentId}
          canReply={canReply}
        />
      </motion.div>
    );
  }

  const content = (() => {
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
                <ReviewUserName user={review.user} />
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
                <ReviewUserName user={review.dismissedBy} />
              </>
            ) : null}
            {review.user ? (
              <>
                {" for "}
                <ReviewUserName user={review.user} />
              </>
            ) : null}
            {" · "}
            <Time date={entry.date} />
          </ActivityItem>
        );
      }
    }
  })();

  return <div className={spacing}>{content}</div>;
}
