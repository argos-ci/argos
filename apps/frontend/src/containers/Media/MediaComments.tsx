import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { clsx } from "clsx";
import { FileUpIcon, MapPinPenIcon, UploadIcon, XIcon } from "lucide-react";
import { Button as RACButton } from "react-aria-components";
import { useLocation } from "react-router";

import { useAuth } from "@/containers/Auth";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { CommentCard } from "@/containers/Comment/CommentCard";
import {
  getCommentThreads,
  type CommentThread,
} from "@/containers/Comment/commentThreads";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { useHighlightedCommentId } from "@/containers/Comment/useHighlightedCommentId";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { Activity, ActivityItem } from "@/ui/Activity";
import { Button } from "@/ui/Button";
import type { EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Link } from "@/ui/Link";
import { MediaWell } from "@/ui/MediaFrame";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { createHandleMediaCommentsPrompt } from "./MediaCommentsPrompt";

const _MediaCommentsFragment = graphql(`
  fragment MediaComments_Media on Media {
    id
    url
    createdAt
    permissions
    versions {
      id
      number
      createdAt
      fileUrl
      posterUrl
      isVideo
    }
    comments {
      id
      threadId
      mediaVersionId
      anchor {
        __typename
        ... on CommentPointAnchor {
          x
          y
        }
      }
      ...CommentCard_Comment
    }
  }
`);

type Media = DocumentType<typeof _MediaCommentsFragment>;
type Comment = Media["comments"][number];

const AddMediaCommentMutation = graphql(`
  mutation MediaComments_addMediaComment(
    $input: AddMediaCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addMediaComment(input: $input) {
      id
      unresolvedCommentCount
      comments {
        id
        threadId
        anchor {
          __typename
          ... on CommentPointAnchor {
            x
            y
          }
        }
        ...CommentCard_Comment
      }
    }
  }
`);

type ActivityEntry =
  | { kind: "created"; date: string }
  | { kind: "version"; date: string; version: Media["versions"][number] }
  | { kind: "comment"; date: string; thread: CommentThread<Comment> };

/**
 * Everything that happened to the media, oldest first: its creation, each
 * re-upload, and the comment threads — the same flow the build sidebar tells.
 */
function getActivityEntries(media: Media): ActivityEntry[] {
  const entries: ActivityEntry[] = [{ kind: "created", date: media.createdAt }];
  for (const version of media.versions) {
    // The first upload *is* the creation; an entry for it would say the same
    // thing twice with the same timestamp.
    if (version.number > 1) {
      entries.push({ kind: "version", date: version.createdAt, version });
    }
  }
  for (const thread of getCommentThreads(media.comments)) {
    entries.push({ kind: "comment", date: thread.root.date, thread });
  }
  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function getActivityEntryKey(entry: ActivityEntry): string {
  switch (entry.kind) {
    case "created":
      return "created";
    case "version":
      return `version-${entry.version.id}`;
    case "comment":
      return `comment-${entry.thread.root.id}`;
  }
}

/**
 * The activity panel of the share page: the media's timeline and its comment
 * threads, with a composer.
 *
 * The same panel the build sidebar renders — shared {@link CommentCard} rows in
 * the shared {@link Activity} flow — so the two surfaces cannot drift apart.
 * Threads pinned to a point also live as markers on the image itself (see
 * `MediaCommentLayer`); the panel is the complete record, including pins on
 * other versions and resolved threads.
 */
export function MediaComments(props: {
  media: Media;
  /** The version on screen — what a new comment will be recorded against. */
  viewedVersionId: string;
  placing: boolean;
  onPlacingChange: (placing: boolean) => void;
  /** Open a pinned thread on the image, switching to its version if needed. */
  onOpenPinned: (comment: {
    id: string;
    mediaVersionId: string | null;
  }) => void;
}) {
  const { media, viewedVersionId, placing, onPlacingChange, onOpenPinned } =
    props;
  const client = useApolloClient();
  const roleScope = useCommentRoleScope();
  const [replyPending, setReplyPending] = useState(false);

  const canComment = media.permissions.includes(MediaPermission.Comment);
  const entries = getActivityEntries(media);
  const highlightedCommentId = useHighlightedCommentId(
    media.comments.map((comment) => comment.id),
  );

  const postComment = async (input: {
    body: EditorValue;
    threadId?: string;
  }) => {
    await client.mutate({
      mutation: AddMediaCommentMutation,
      variables: {
        input: { mediaId: media.id, mediaVersionId: viewedVersionId, ...input },
        ...roleScope,
      },
    });
  };

  const handleSubmit = async (body: EditorValue) => {
    try {
      await postComment({ body });
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrown so the editor keeps the content and the author can retry.
      throw error;
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Activity</PanelTitle>
        {canComment ? (
          <PinCommentToggle
            placing={placing}
            onPlacingChange={onPlacingChange}
          />
        ) : null}
      </PanelHeader>

      <div className="px-3">
        {placing ? (
          <p className="text-low bg-ui mb-3 rounded-md px-3 py-2 text-xs">
            Click the spot on the image you want to comment on.
          </p>
        ) : null}

        <Activity gap={false}>
          {entries.map((entry, index) => (
            <ActivityEntryRow
              key={getActivityEntryKey(entry)}
              entry={entry}
              isFirst={index === 0}
              media={media}
              viewedVersionId={viewedVersionId}
              highlightedCommentId={highlightedCommentId}
              canReply={canComment}
              onOpenPinned={onOpenPinned}
              onReply={async (thread, body) => {
                setReplyPending(true);
                try {
                  await postComment({ body, threadId: thread.root.id });
                } finally {
                  setReplyPending(false);
                }
              }}
            />
          ))}
        </Activity>

        {canComment ? (
          // The build sidebar's composer inset, between the cards' edge and
          // the column's.
          <div className="-mx-1.5 mt-3 -mb-1.5">
            <StandaloneEditor
              onSubmit={handleSubmit}
              draftKey={`media.${media.id}.comment`}
              placeholder="Leave a comment on this media…"
              submitLabel="Submit the comment"
              disabled={replyPending}
              emptyMessage={{
                title: "Comment required",
                description: "Please add a comment before submitting.",
              }}
              aria-label="Add a comment"
            />
          </div>
        ) : (
          <ReadOnlyNotice />
        )}
      </div>
    </Panel>
  );
}

/**
 * Arm or put away the pin tool — an icon so the panel header stays one line,
 * with the shortcut on its tooltip. Escape also puts the tool away, which is
 * what the cancel state advertises.
 */
function PinCommentToggle(props: {
  placing: boolean;
  onPlacingChange: (placing: boolean) => void;
}) {
  const { placing, onPlacingChange } = props;
  const hotkey = useBuildHotkey(
    "toggleCommentTool",
    () => onPlacingChange(!placing),
    { preventDefault: true },
  );
  return placing ? (
    <HotkeyTooltip description="Cancel" keys={["Esc"]}>
      <Button
        variant="primary"
        size="small"
        iconOnly
        aria-label="Cancel"
        onPress={() => onPlacingChange(false)}
      >
        <XIcon />
      </Button>
    </HotkeyTooltip>
  ) : (
    <HotkeyTooltip description="Pin a comment" keys={hotkey.displayKeys}>
      <Button
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Pin a comment"
        onPress={() => onPlacingChange(true)}
      >
        <MapPinPenIcon />
      </Button>
    </HotkeyTooltip>
  );
}

function ActivityEntryRow(props: {
  entry: ActivityEntry;
  isFirst: boolean;
  media: Media;
  viewedVersionId: string;
  highlightedCommentId: string | null;
  canReply: boolean;
  onOpenPinned: (comment: {
    id: string;
    mediaVersionId: string | null;
  }) => void;
  onReply: (thread: CommentThread<Comment>, body: EditorValue) => Promise<void>;
}) {
  const {
    entry,
    isFirst,
    media,
    viewedVersionId,
    highlightedCommentId,
    canReply,
    onOpenPinned,
    onReply,
  } = props;
  // Each row carries its own top spacing so the timeline reads as one flow,
  // matching the build sidebar's activity rhythm.
  const spacing = isFirst ? undefined : "pt-4";

  switch (entry.kind) {
    case "created":
      return (
        <div className={spacing}>
          <ActivityItem icon={<FileUpIcon className="size-3.5" />}>
            Media created · <Time date={entry.date} />
          </ActivityItem>
        </div>
      );
    case "version":
      return (
        <div className={spacing}>
          <ActivityItem icon={<UploadIcon className="size-3.5" />}>
            <span className="font-medium">v{entry.version.number}</span>{" "}
            uploaded · <Time date={entry.date} />
          </ActivityItem>
        </div>
      );
    case "comment": {
      const { thread } = entry;
      const pinned = thread.root.anchor?.__typename === "CommentPointAnchor";
      return (
        <div className={clsx("pb-px", spacing)}>
          <CommentCard
            comment={thread.root}
            replies={thread.replies}
            highlightedCommentId={highlightedCommentId}
            canReply={canReply}
            // The build sidebar's exact geometry: wider than the column on
            // purpose, flirting with the panel's edge.
            className="-mx-2.5"
            onReply={(body) => onReply(thread, body)}
            draftKeyPrefix={`media.${media.id}`}
            threadPrompt={createHandleMediaCommentsPrompt({
              shareUrl: media.url,
              threadId: thread.root.id,
            })}
            screenshotReference={
              pinned
                ? {
                    node: (
                      <MediaPinnedReference
                        media={media}
                        mediaVersionId={thread.root.mediaVersionId ?? null}
                        viewedVersionId={viewedVersionId}
                        onNavigate={() =>
                          onOpenPinned({
                            id: thread.root.id,
                            mediaVersionId: thread.root.mediaVersionId ?? null,
                          })
                        }
                      />
                    ),
                    onNavigate: () =>
                      onOpenPinned({
                        id: thread.root.id,
                        mediaVersionId: thread.root.mediaVersionId ?? null,
                      }),
                  }
                : null
            }
          />
        </div>
      );
    }
  }
}

/**
 * The composer's stand-in for a viewer who cannot comment: an anonymous visitor
 * gets the fix (logging in). A signed-in visitor without the permission gets
 * nothing — the timeline above speaks for itself.
 */
function ReadOnlyNotice() {
  const auth = useAuth();
  const { pathname } = useLocation();

  if (auth.status === "anonymous") {
    return (
      <p className="text-low mt-3 text-sm">
        <Link href={`/login?r=${encodeURIComponent(pathname)}`}>Login</Link> to
        comment on this media.
      </p>
    );
  }

  return null;
}

/**
 * A quote of where a pinned thread points — the media page's counterpart of
 * the build's snapshot reference header, so the card reads as clickable the
 * same way. Clicking it (or the card, which shares the navigation) opens the
 * thread's marker on the image, switching the picker to the version the pin
 * was dropped on when needed.
 */
function MediaPinnedReference(props: {
  media: Media;
  mediaVersionId: string | null;
  viewedVersionId: string;
  onNavigate: () => void;
}) {
  const { media, mediaVersionId, viewedVersionId, onNavigate } = props;
  const version =
    media.versions.find((candidate) => candidate.id === mediaVersionId) ?? null;
  const thumbnailUrl = version
    ? version.isVideo
      ? version.posterUrl
      : version.fileUrl
    : null;
  const label =
    mediaVersionId === viewedVersionId
      ? "Pinned on the image"
      : version
        ? `Pinned on v${version.number}`
        : "Pinned on another version";
  return (
    <RACButton
      onPress={onNavigate}
      aria-label="Go to the pinned comment"
      // No hover style or default cursor of its own: the surrounding card
      // shares this button's navigation and carries the hover affordance.
      className="text-low rac-focus flex w-full cursor-pointer items-center gap-2 rounded-t-md px-2 py-1.5 text-left text-xs select-none"
    >
      {thumbnailUrl ? (
        <MediaWell checkerSize={3} className="size-6 shrink-0">
          {/* Contained rather than cropped, like the version rows: a crop out
              of a wide screenshot's middle identifies nothing. */}
          <img src={thumbnailUrl} alt="" className="size-full object-contain" />
        </MediaWell>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <MapPinPenIcon aria-hidden="true" className="size-3.5 shrink-0" />
    </RACButton>
  );
}
