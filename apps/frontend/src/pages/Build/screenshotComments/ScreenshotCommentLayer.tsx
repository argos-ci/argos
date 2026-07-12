import {
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useAtom, useAtomValue } from "jotai/react";

import { useAuthTokenPayload } from "@/containers/Auth";
import { CommentsEnabledContext } from "@/containers/Build/CommentsContext";
import {
  commentsVisibleAtom,
  commentToolModeAtom,
  requestedScreenshotCommentIdAtom,
} from "@/containers/Build/CommentTool";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  type PaneSize,
} from "@/containers/Build/Zoomer";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { toast } from "@/ui/Toaster";
import { getMentionUser } from "@/ui/UserCard";
import { getErrorMessage } from "@/util/error";

import { useCanAddToReview } from "../ReviewCommentSubmitButton";
import { getCommentThreads } from "../sidebar/commentThreads";
import { MentionableUsersProvider } from "../sidebar/MentionableUsersContext";
import { CommentDraftPopover } from "./CommentDraftPopover";
import { CommentMarker } from "./CommentMarker";
import { CommentPin } from "./CommentPin";
import { CommentThreadPopover } from "./CommentThreadPopover";
import {
  isPointInImage,
  useScreenshotProjection,
  type NormalizedPoint,
  type ScreenPoint,
} from "./geometry";

const _BuildFragment = graphql(`
  fragment ScreenshotCommentLayer_Build on Build {
    id
    members {
      id
      ...UserCard_user
    }
    comments {
      ...CommentCard_Comment
    }
    ...ReviewCommentSubmitButton_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

const AddBuildCommentMutation = graphql(`
  mutation ScreenshotCommentLayer_addBuildComment(
    $input: AddBuildCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addBuildComment(input: $input) {
      id
      comments {
        ...CommentCard_Comment
      }
    }
  }
`);

/** How close pointerdown and click must be to count as a click, not a pan. */
const CLICK_MOVE_THRESHOLD = 4;

// A comment-bubble cursor with the same silhouette as the pin: a rounded body
// with a sharp bottom-left tip (matching `rounded-full rounded-bl-none`), a dark
// outline and a soft drop shadow so it reads over any image. It's smaller than
// the marker. The hotspot is the bottom-left tip, where the comment is dropped.
const PIN_CURSOR_PATH =
  "M2 19 L2 10 A9 9 0 0 1 11 1 A9 9 0 0 1 20 10 A9 9 0 0 1 11 19 Z";
// A double inset border: each stroke is clipped to the shape, so only its inner
// half shows. The dark 4px stroke leaves a 2px inner band; the white 2px stroke
// on top covers the outer 1px of that — yielding 1px white at the edge, then 1px
// dark, then the white fill. The shadow lives on the wrapping group, which isn't
// clipped, so it still spreads outside.
const PIN_CURSOR_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>" +
  "<defs>" +
  `<clipPath id='c'><path d='${PIN_CURSOR_PATH}'/></clipPath>` +
  "<filter id='s' x='-40%' y='-40%' width='180%' height='180%'>" +
  "<feDropShadow dx='0' dy='1' stdDeviation='0.9' flood-color='black' flood-opacity='0.3'/>" +
  "</filter>" +
  "</defs>" +
  "<g filter='url(#s)'>" +
  `<path d='${PIN_CURSOR_PATH}' fill='white' stroke='#3f3f46' stroke-width='4' stroke-linejoin='round' clip-path='url(#c)'/>` +
  `<path d='${PIN_CURSOR_PATH}' fill='none' stroke='white' stroke-width='2' stroke-linejoin='round' clip-path='url(#c)'/>` +
  "</g>" +
  "</svg>";
const PIN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(PIN_CURSOR_SVG)}") 2 19, crosshair`;

/**
 * Draws point-anchored comments on the changes image and, with the comment tool
 * active, lets the user click a point to leave a new one. The click-capture
 * layer and the draft indicator live inside the `ZoomPane` overlay slot (so they
 * track pan/zoom and clip to the image); the comment markers and the draft
 * prompt are portaled and fixed-positioned so they escape the pane's overflow
 * clipping while still following the image.
 */
export function ScreenshotCommentLayer(props: {
  build: Build;
  screenshotDiffId: string;
  imgSize: { width: number; height: number };
  paneSize: PaneSize | null;
}) {
  const { build, screenshotDiffId, imgSize, paneSize } = props;
  const commentsEnabled = use(CommentsEnabledContext);
  const mode = useAtomValue(commentToolModeAtom);
  const visible = useAtomValue(commentsVisibleAtom);
  const canReview = useProjectPermission(ProjectPermission.Review);
  const canComment = commentsEnabled && canReview;
  const canAddToReview = useCanAddToReview(build);
  const { accountSlug, projectName } = useProjectParams() ?? {};
  invariant(accountSlug && projectName, "Missing project route params");
  const accountId = useAuthTokenPayload()?.account.id;
  const client = useApolloClient();

  const { toScreen, toNormalized, ready } = useScreenshotProjection({
    paneSize,
    imgSize,
  });

  const [draft, setDraft] = useState<NormalizedPoint | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  // Threads anchored to a point on this diff. Resolved threads drop off the
  // image (they remain in the sidebar).
  const threads = useMemo(
    () =>
      getCommentThreads(build.comments).filter(
        (thread) =>
          thread.root.screenshotDiff?.id === screenshotDiffId &&
          thread.root.anchor?.__typename === "CommentPointAnchor" &&
          !thread.root.resolvedAt,
      ),
    [build.comments, screenshotDiffId],
  );

  const openThread = useMemo(
    () => threads.find((thread) => thread.root.id === openThreadId) ?? null,
    [threads, openThreadId],
  );

  // Honor a request to open a specific thread, set when jumping to a comment
  // from outside the viewer (the sidebar's "Go to this snapshot"). Once the
  // requested comment is one of this diff's threads — which happens after
  // navigating to its diff — open it and clear the request. Any in-progress
  // draft is dropped so the thread, not a half-placed pin, is shown.
  const [requestedCommentId, setRequestedCommentId] = useAtom(
    requestedScreenshotCommentIdAtom,
  );
  useEffect(() => {
    if (!requestedCommentId) {
      return;
    }
    const requested = threads.find(
      (thread) => thread.root.id === requestedCommentId,
    );
    if (requested) {
      setRequestedCommentId(null);
      // Move the external open request into this layer's local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(null);
      setOpenThreadId(requestedCommentId);
    }
  }, [requestedCommentId, threads, setRequestedCommentId]);

  const mentionUsers = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );

  const currentAvatar = useMemo(() => {
    if (!accountId) {
      return null;
    }
    return (
      build.members.find((member) => member.id === accountId)?.avatar ?? null
    );
  }, [accountId, build.members]);

  // What's shown is derived from the tool state (no effects resetting state):
  // `useCommentTool` keeps mode/visibility consistent — the comment tool implies
  // comments are visible, and hiding them drops back to the hand tool.
  const draftShown = mode === "comment" && draft !== null;
  const threadShown = visible && openThread !== null;
  const hasMarkers = visible && threads.length > 0;

  // The portaled markers/prompt are fixed-positioned at the pane's viewport
  // origin plus the in-pane point. The origin only moves on scroll/resize (not
  // on pan/zoom, which moves the image inside the pane), so it's measured in a
  // layout effect and kept fresh with listeners — never read from a ref during
  // render.
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldProject = hasMarkers || draftShown;
  const [origin, setOrigin] = useState<ScreenPoint | null>(null);
  useLayoutEffect(() => {
    if (!shouldProject) {
      return;
    }
    const measure = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) {
        setOrigin({ left: rect.left, top: rect.top });
      }
    };
    measure();
    window.addEventListener("scroll", measure, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [shouldProject, paneSize]);

  // Map an in-pane point to the viewport for the portaled elements.
  const toViewport = (point: ScreenPoint): ScreenPoint =>
    origin
      ? { left: origin.left + point.left, top: origin.top + point.top }
      : point;

  // Whether an in-pane point is within the visible pane (used to clip markers
  // panned out of view, mirroring the pane's `overflow-hidden`).
  const isInPane = (point: ScreenPoint): boolean =>
    paneSize != null &&
    point.left >= 0 &&
    point.left <= paneSize.width &&
    point.top >= 0 &&
    point.top <= paneSize.height;

  // Close the prompt/thread when clicking outside it, or on Escape. A click is
  // "outside" only when it lands inside the app root but not on an overlay
  // element — clicks in portaled menus, the emoji picker, dialogs and our own
  // popovers (all rendered outside `#root`) don't close it, which is what lets
  // the thread's actions menu work.
  const hasActivePopover = draftShown || threadShown;
  useEffect(() => {
    if (!hasActivePopover) {
      return;
    }
    const close = () => {
      setDraft(null);
      setOpenThreadId(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest(`.${ZOOMER_OVERLAY_INTERACTIVE_CLASS}`)) {
        return;
      }
      const root = document.getElementById("root");
      if (root && !root.contains(target)) {
        return;
      }
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    // Bubble phase so the editor handles Escape first (e.g. dismissing a mention
    // popup or collapsing a selection); it only reaches us when unhandled.
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hasActivePopover]);

  // Distinguish a click (place a comment) from a drag (pan the image).
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const handlePlacementPointerDown = (event: React.PointerEvent) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };
  const handlePlacementClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (
      start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) >
        CLICK_MOVE_THRESHOLD
    ) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const point = toNormalized(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    setOpenThreadId(null);
    setDraft(point && isPointInImage(point) ? point : null);
  };

  const handleCreate = useCallback(
    async (body: EditorValue, options: { addToReview: boolean }) => {
      if (!draft) {
        return;
      }
      const priorIds = new Set(build.comments.map((comment) => comment.id));
      try {
        const result = await client.mutate({
          mutation: AddBuildCommentMutation,
          variables: {
            input: {
              buildId: build.id,
              screenshotDiffId,
              anchor: { point: { x: draft.x, y: draft.y } },
              body,
              addToReview: options.addToReview,
            },
            accountSlug,
            projectName,
          },
        });
        const created = result.data?.addBuildComment.comments.find(
          (comment) => !priorIds.has(comment.id) && !comment.threadId,
        );
        setDraft(null);
        if (created) {
          setOpenThreadId(created.id);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        // Rethrow so the editor keeps the content and the user can retry.
        throw error;
      }
    },
    [
      client,
      build.comments,
      build.id,
      draft,
      screenshotDiffId,
      accountSlug,
      projectName,
    ],
  );

  if (!ready || !commentsEnabled) {
    return null;
  }

  return (
    <MentionableUsersProvider value={mentionUsers}>
      <div ref={rootRef} className="pointer-events-none absolute inset-0">
        {mode === "comment" && canComment ? (
          <div
            role="presentation"
            className="pointer-events-auto absolute inset-0"
            style={{ cursor: PIN_CURSOR }}
            onPointerDown={handlePlacementPointerDown}
            onClick={handlePlacementClick}
          />
        ) : null}
        {/* The comment being drafted gets an immediate indicator at its point. */}
        {mode === "comment" && draft ? (
          <CommentPin point={toScreen(draft)} avatar={currentAvatar} />
        ) : null}
      </div>
      {visible
        ? threads.map((thread) => {
            const { root } = thread;
            if (root.anchor?.__typename !== "CommentPointAnchor") {
              return null;
            }
            const open = root.id === openThreadId;
            const point = toScreen({ x: root.anchor.x, y: root.anchor.y });
            if (!open && !isInPane(point)) {
              return null;
            }
            return (
              <CommentMarker
                key={root.id}
                point={toViewport(point)}
                comment={root}
                open={open}
                onOpen={() => {
                  setDraft(null);
                  setOpenThreadId(root.id);
                }}
              />
            );
          })
        : null}
      {/* The open thread is a separate popover beside its pin. */}
      {threadShown &&
      openThread &&
      openThread.root.anchor?.__typename === "CommentPointAnchor" ? (
        <CommentThreadPopover
          // Remount per thread so the reply composer re-runs its autofocus and
          // reads its own draft when switching directly between markers (the
          // popover stays mounted across that switch).
          key={openThread.root.id}
          point={toViewport(
            toScreen({
              x: openThread.root.anchor.x,
              y: openThread.root.anchor.y,
            }),
          )}
          comment={openThread.root}
          replies={openThread.replies}
          canReply={canComment}
          buildId={build.id}
        />
      ) : null}
      {draftShown ? (
        <CommentDraftPopover
          point={toViewport(toScreen(draft))}
          canAddToReview={canAddToReview}
          onSubmit={handleCreate}
        />
      ) : null}
    </MentionableUsersProvider>
  );
}
