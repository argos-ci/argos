import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  isPointInImage,
  useImageProjection,
  type NormalizedPoint,
  type ScreenPoint,
} from "@/containers/Build/projection";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  type PaneSize,
} from "@/containers/Build/Zoomer";
import { type EditorValue } from "@/ui/Editor/Editor";

import { CommentDraftPopover } from "./CommentDraftPopover";
import { CommentMarker } from "./CommentMarker";
import { CommentPin } from "./CommentPin";
import { CommentThreadPopover } from "./CommentThreadPopover";

/** What the layer reads off a comment — the marker's needs plus an identity. */
type LayerComment = React.ComponentProps<typeof CommentMarker>["comment"] & {
  id: string;
};

/** A point-anchored thread: its comments, and where on the image it points. */
export type PointCommentThread<TComment extends LayerComment = LayerComment> = {
  root: TComment;
  replies: TComment[];
  point: NormalizedPoint;
};

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
 * The floating comment UI drawn over a pannable image: markers on the anchored
 * points, a hover preview per marker, the full thread in a popover on click,
 * and — with `placing` on — a pin cursor that drops a draft where the user
 * clicks.
 *
 * The mechanics are the same wherever an image takes point comments — a
 * build's snapshot or an uploaded media — so this owns them once: what varies
 * (which threads, how a comment is created, what the thread card renders) is
 * injected. The click-capture layer and the draft indicator live inside the
 * `ZoomPane` overlay slot (so they track pan/zoom and clip to the image); the
 * markers and the popovers are portaled and fixed-positioned so they escape
 * the pane's overflow clipping while still following the image.
 */
export function PointCommentLayer<TComment extends LayerComment>(props: {
  paneSize: PaneSize | null;
  imgSize: { width: number; height: number };
  /**
   * Vertical placement of the image in the pane, which must match the CSS —
   * the build's snapshots are top-aligned, a media is centered.
   */
  verticalAlign?: "top" | "center";
  /** The point-anchored threads to draw. */
  threads: PointCommentThread<TComment>[];
  /** Placement mode: the image takes the pin cursor and a click drops a draft. */
  placing: boolean;
  /** Avatar shown on the draft pin — the current user's. */
  draftAvatar: React.ComponentProps<typeof CommentPin>["avatar"];
  /** Whether submitting can attach the comment to a pending review. */
  canAddToReview: boolean;
  /**
   * Create the comment for a confirmed draft. Resolves to the created thread's
   * id — opened in place of the draft — or null when it can't be known.
   */
  onCreate: (
    body: EditorValue,
    options: { addToReview: boolean },
    point: NormalizedPoint,
  ) => Promise<string | null>;
  /** The full thread, rendered inside the popover once a marker is opened. */
  renderThreadCard: (thread: PointCommentThread<TComment>) => React.ReactNode;
  /**
   * A thread the surroundings ask to open — e.g. jumping to a comment from a
   * sidebar. Honored (and reported consumed) once it names one of `threads`.
   */
  requestedThreadId?: string | null;
  onRequestedThreadConsumed?: () => void;
  /**
   * Escape pressed with nothing left to dismiss: the caller can drop out of
   * placement mode. A first Escape closes an open draft or thread; only the
   * next one reaches this.
   */
  onPlacingDismiss?: () => void;
}) {
  const {
    paneSize,
    imgSize,
    verticalAlign = "top",
    threads,
    placing,
    draftAvatar,
    canAddToReview,
    onCreate,
    renderThreadCard,
    requestedThreadId = null,
    onRequestedThreadConsumed,
    onPlacingDismiss,
  } = props;

  const { toScreen, toNormalized, ready } = useImageProjection({
    paneSize,
    imgSize,
    verticalAlign,
  });

  const [draft, setDraft] = useState<NormalizedPoint | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const openThread =
    threads.find((thread) => thread.root.id === openThreadId) ?? null;

  // A thread that leaves the layer — resolved, deleted, filtered out — closes
  // with its marker instead of lingering as a stale id that would reopen the
  // popover if the thread ever came back (a resolved thread the reviewer
  // expands again does). Adjusted during render, like `placing` below.
  if (openThreadId !== null && !openThread) {
    setOpenThreadId(null);
  }

  // Honor a request to open a specific thread, set when jumping to a comment
  // from outside the viewer. Once the requested comment is one of this image's
  // threads, open it and report the request consumed. Any in-progress draft is
  // dropped so the thread, not a half-placed pin, is shown.
  useEffect(() => {
    if (!requestedThreadId) {
      return;
    }
    const requested = threads.find(
      (thread) => thread.root.id === requestedThreadId,
    );
    if (requested) {
      onRequestedThreadConsumed?.();
      // oxlint-disable-next-line react/react-compiler
      setDraft(null);
      setOpenThreadId(requestedThreadId);
    }
  }, [requestedThreadId, threads, onRequestedThreadConsumed]);

  // Toggling placement mode abandons the half-placed pin with it — adjusted
  // during render (the prior-props pattern) rather than in an effect, so the
  // stale pin never paints.
  const [prevPlacing, setPrevPlacing] = useState(placing);
  if (prevPlacing !== placing) {
    setPrevPlacing(placing);
    setDraft(null);
  }

  const draftShown = placing && draft !== null;
  const threadShown = openThread !== null;
  const hasMarkers = threads.length > 0;

  // The portaled markers/popovers are fixed-positioned at the pane's viewport
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

  // Close the prompt/thread when clicking outside it, or on Escape — and once
  // nothing is left to close, Escape drops out of placement mode. A click is
  // "outside" only when it lands inside the app root but not on an overlay
  // element — clicks in portaled menus, the emoji picker, dialogs and our own
  // popovers (all rendered outside `#root`) don't close it, which is what lets
  // the thread's actions menu work.
  const hasActivePopover = draftShown || threadShown;
  const canDismissPlacing = placing && onPlacingDismiss != null;
  useEffect(() => {
    if (!hasActivePopover && !canDismissPlacing) {
      return;
    }
    const close = () => {
      setDraft(null);
      setOpenThreadId(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!hasActivePopover) {
        return;
      }
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
      if (event.key !== "Escape") {
        return;
      }
      if (hasActivePopover) {
        close();
        return;
      }
      onPlacingDismiss?.();
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
  }, [hasActivePopover, canDismissPlacing, onPlacingDismiss]);

  // Distinguish a click (place a comment) from a drag (pan the image).
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const handlePlacementPointerDown = (event: React.PointerEvent) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };
  const placeAt = (paneX: number, paneY: number) => {
    const point = toNormalized(paneX, paneY);
    setOpenThreadId(null);
    setDraft(point && isPointInImage(point) ? point : null);
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
    placeAt(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handleCreate = useCallback(
    async (body: EditorValue, options: { addToReview: boolean }) => {
      if (!draft) {
        return;
      }
      const createdId = await onCreate(body, options, draft);
      setDraft(null);
      if (createdId) {
        setOpenThreadId(createdId);
      }
    },
    [draft, onCreate],
  );

  if (!ready) {
    return null;
  }

  return (
    <>
      <div ref={rootRef} className="pointer-events-none absolute inset-0">
        {placing ? (
          // A key press carries no coordinates, so it places the pin at the
          // center — a working path to a pinned comment without a mouse.
          <div
            role="button"
            tabIndex={0}
            aria-label="Pick the spot to comment on"
            className="pointer-events-auto absolute inset-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            style={{ cursor: PIN_CURSOR }}
            onPointerDown={handlePlacementPointerDown}
            onClick={handlePlacementClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (paneSize) {
                  placeAt(paneSize.width / 2, paneSize.height / 2);
                }
              }
            }}
          />
        ) : null}
        {/* The comment being drafted gets an immediate indicator at its point. */}
        {draftShown && draft ? (
          <CommentPin point={toScreen(draft)} avatar={draftAvatar} />
        ) : null}
      </div>
      {threads.map((thread) => {
        const open = thread.root.id === openThreadId;
        const point = toScreen(thread.point);
        if (!open && !isInPane(point)) {
          return null;
        }
        return (
          <CommentMarker
            key={thread.root.id}
            point={toViewport(point)}
            comment={thread.root}
            open={open}
            onOpen={() => {
              setDraft(null);
              setOpenThreadId(thread.root.id);
            }}
          />
        );
      })}
      {/* The open thread is a separate popover beside its pin. */}
      {openThread ? (
        <CommentThreadPopover
          // Remount per thread so the reply composer re-runs its autofocus and
          // reads its own draft when switching directly between markers (the
          // popover stays mounted across that switch).
          key={openThread.root.id}
          point={toViewport(toScreen(openThread.point))}
          authorName={
            openThread.root.user?.name ||
            openThread.root.user?.slug ||
            "Unknown user"
          }
        >
          {renderThreadCard(openThread)}
        </CommentThreadPopover>
      ) : null}
      {draftShown && draft ? (
        <CommentDraftPopover
          point={toViewport(toScreen(draft))}
          canAddToReview={canAddToReview}
          onSubmit={handleCreate}
        />
      ) : null}
    </>
  );
}
