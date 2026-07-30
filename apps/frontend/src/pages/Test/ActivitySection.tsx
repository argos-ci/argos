import { useCallback, useEffect, useMemo } from "react";
import type { Reference } from "@apollo/client";
import { useApolloClient, useSubscription } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { BellIcon, BellOffIcon, FileUpIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";

import { CommentCard } from "@/containers/Comment/CommentCard";
import { getCommentThreads } from "@/containers/Comment/commentThreads";
import { MentionableUsersProvider } from "@/containers/Comment/MentionableUsersContext";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { CommentChangeType, ProjectPermission } from "@/gql/graphql";
import { Activity, ActivityItem } from "@/ui/Activity";
import type { EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { IconButton } from "@/ui/IconButton";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { useLiveRef } from "@/ui/useLiveRef";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { useProjectParams } from "../Project/ProjectParams";

const _TestFragment = graphql(`
  fragment TestActivity_Test on Test {
    id
    createdAt
    subscribed
    members {
      ...UserCard_user
    }
    comments {
      ...CommentCard_Comment
    }
  }
`);

type Test = DocumentType<typeof _TestFragment>;
type Comment = Test["comments"][number];

const AddTestCommentMutation = graphql(`
  mutation TestActivity_addTestComment(
    $input: AddTestCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addTestComment(input: $input) {
      id
      subscribed
      comments {
        ...CommentCard_Comment
      }
    }
  }
`);

const SubscribeToTestMutation = graphql(`
  mutation TestActivity_subscribeToTest($input: SubscribeToTestInput!) {
    subscribeToTest(input: $input) {
      id
      subscribed
    }
  }
`);

const UnsubscribeFromTestMutation = graphql(`
  mutation TestActivity_unsubscribeFromTest($input: UnsubscribeFromTestInput!) {
    unsubscribeFromTest(input: $input) {
      id
      subscribed
    }
  }
`);

const TestCommentChangedSubscription = graphql(`
  subscription TestActivity_testCommentChanged(
    $testId: ID!
    $accountSlug: String!
    $projectName: String!
  ) {
    testCommentChanged(testId: $testId) {
      type
      comment {
        id
        threadId
        ...CommentCard_Comment
      }
    }
  }
`);

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

/**
 * The test's activity feed: when it was created, then its comment threads,
 * oldest first, with a composer to start a new thread. Mirrors the build's
 * review activity, minus everything that only exists on a build (reviews,
 * snapshot references, draft comments).
 */
export function ActivitySection(props: { test: Test }) {
  const { test } = props;
  const params = useProjectParams();
  invariant(params, "Can't be used outside of a project route");
  const { accountSlug, projectName } = params;
  const client = useApolloClient();
  // Keep the feed live. Added comments are appended to the test's comment list
  // and deleted ones are evicted; updates (edits, reactions, resolve/reopen)
  // need no handling here — the normalized cache merges the changed fields in
  // place by comment id.
  useSubscription(TestCommentChangedSubscription, {
    variables: { testId: test.id, accountSlug, projectName },
    onData: ({ client, data }) => {
      const event = data.data?.testCommentChanged;
      if (!event) {
        return;
      }
      const { comment } = event;
      switch (event.type) {
        case CommentChangeType.Added: {
          client.cache.modify({
            id: client.cache.identify({ __typename: "Test", id: test.id }),
            fields: {
              comments(
                existingRefs: readonly Reference[] = [],
                { readField, toReference },
              ) {
                const ref = toReference(comment);
                if (
                  !ref ||
                  existingRefs.some(
                    (existing) => readField("id", existing) === comment.id,
                  )
                ) {
                  return existingRefs;
                }
                return [...existingRefs, ref];
              },
            },
          });
          break;
        }
        case CommentChangeType.Deleted: {
          // Evicting the comment drops it from the test's list (the dangling
          // ref is garbage-collected), so `AnimatePresence` plays its exit
          // animation — matching a local delete.
          const cacheId = client.cache.identify({
            __typename: "Comment",
            id: comment.id,
          });
          if (cacheId) {
            client.cache.evict({ id: cacheId });
            client.cache.gc();
          }
          break;
        }
        // CommentChangeType.Updated needs no manual cache work.
      }
    },
  });

  const canComment = useProjectPermission(ProjectPermission.Review);
  const threads = getCommentThreads(test.comments);
  const highlightedCommentId = useHighlightedCommentId(
    test.comments.map((comment) => comment.id),
  );
  const mentionableUsers = useMemo(
    () => test.members.map(getMentionUser),
    [test.members],
  );

  const postComment = async (input: {
    threadId?: string;
    body: EditorValue;
  }) => {
    await client.mutate({
      mutation: AddTestCommentMutation,
      variables: {
        input: { testId: test.id, ...input },
        accountSlug,
        projectName,
      },
    });
  };

  const handleSubmit = async (body: EditorValue) => {
    try {
      await postComment({ body });
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };

  return (
    <MentionableUsersProvider value={mentionableUsers}>
      <Panel>
        <PanelHeader>
          <PanelTitle>Activity</PanelTitle>
          <SubscribeToggleButton test={test} />
        </PanelHeader>
        <div className="px-3 select-none">
          <Activity gap={false}>
            <ActivityItem icon={<FileUpIcon className="size-3.5" />}>
              Test created · <Time date={test.createdAt} />
            </ActivityItem>
            <AnimatePresence initial={false}>
              {threads.map((thread) => (
                <CommentRow
                  key={`comment-${thread.root.id}`}
                  comment={thread.root}
                  replies={thread.replies}
                  highlightedCommentId={highlightedCommentId}
                  canReply={canComment}
                  testId={test.id}
                  onReply={(body) =>
                    postComment({ threadId: thread.root.id, body })
                  }
                />
              ))}
            </AnimatePresence>
          </Activity>
          {canComment ? (
            <div className="-mx-1.5 mt-3 -mb-1.5">
              <StandaloneEditor
                onSubmit={handleSubmit}
                draftKey={`test.${test.id}.comment`}
                mentions={mentionableUsers}
                placeholder="Leave a comment…"
                submitLabel="Submit the comment"
                emptyMessage={{
                  title: "Comment required",
                  description: "Please add a comment before submitting.",
                }}
                aria-label="Add a comment"
              />
            </div>
          ) : null}
        </div>
      </Panel>
    </MentionableUsersProvider>
  );
}

/**
 * Follow or unfollow the test's comments. Commenting subscribes you already, so
 * this is mostly how you opt out — or opt in without saying anything.
 */
function SubscribeToggleButton(props: { test: Test }) {
  const { test } = props;
  const client = useApolloClient();
  const subscribeToTest = () =>
    client.mutate({
      mutation: SubscribeToTestMutation,
      variables: { input: { testId: test.id } },
      optimisticResponse: {
        subscribeToTest: {
          __typename: "Test",
          id: test.id,
          subscribed: true,
        },
      },
    });
  const unsubscribeFromTest = () =>
    client.mutate({
      mutation: UnsubscribeFromTestMutation,
      variables: { input: { testId: test.id } },
      optimisticResponse: {
        unsubscribeFromTest: {
          __typename: "Test",
          id: test.id,
          subscribed: false,
        },
      },
    });
  const { subscribed } = test;
  const label = subscribed ? "Unsubscribe" : "Subscribe";
  const toastId = `test-subscription:${test.id}`;
  const handlePress = () => {
    if (subscribed) {
      unsubscribeFromTest()
        .then(() => {
          toast.success(
            "You will no longer receive notifications for this test.",
            { id: toastId },
          );
        })
        .catch((error: unknown) => {
          toast.error(getErrorMessage(error), { id: toastId });
        });
    } else {
      subscribeToTest()
        .then(() => {
          toast.success("You will receive notifications for this test.", {
            id: toastId,
          });
        })
        .catch((error: unknown) => {
          toast.error(getErrorMessage(error), { id: toastId });
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

/**
 * A thread in the feed. Carries its own top spacing (rather than relying on a
 * `space-y` gap) so a collapsing comment can shrink that spacing away as part of
 * its own height, keeping the delete animation smooth.
 */
function CommentRow(props: {
  comment: Comment;
  replies: Comment[];
  highlightedCommentId: string | null;
  canReply: boolean;
  testId: string;
  onReply: (body: EditorValue) => Promise<void>;
}) {
  const { comment, replies, highlightedCommentId, canReply, testId, onReply } =
    props;
  return (
    <motion.div
      className="pt-4 pb-px"
      style={{ overflowY: "clip" }}
      exit={{ height: 0, paddingTop: 0, opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.15 },
      }}
    >
      <CommentCard
        comment={comment}
        replies={replies}
        highlightedCommentId={highlightedCommentId}
        canReply={canReply}
        onReply={onReply}
        draftKeyPrefix={`test.${testId}`}
      />
    </motion.div>
  );
}
