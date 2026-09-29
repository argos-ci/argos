import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clsx } from "clsx";
import { useAtom, useAtomValue } from "jotai/react";
import { DownloadIcon } from "lucide-react";

import {
  OnionOpacityControl,
  SwipeDivider,
} from "@/containers/Build/BlendControls";
import { BuildDiffHighlighterProvider } from "@/containers/Build/BuildDiffHighlighterContext";
import {
  buildViewModeAtom,
  checkIsBlendViewMode,
  getEffectiveViewMode,
  onionOpacityAtom,
  swipeHandleYAtom,
  swipePositionAtom,
  type ViewMode,
} from "@/containers/Build/BuildViewMode";
import {
  ChangesHighlights,
  ChangesMask,
  ChangesOverlayControls,
} from "@/containers/Build/ChangesOverlay";
import { useCommentTool } from "@/containers/Build/CommentTool";
import { overlayVisibleAtom } from "@/containers/Build/OverlayStyle";
import { getImageScale } from "@/containers/Build/projection";
import {
  ScaleProvider,
  useScaleContext,
} from "@/containers/Build/ScaleContext";
import {
  getCopyImageSubmenu,
  downloadBlob,
  downloadWithToast,
  fetchBlob,
  ImageActionsMenu,
} from "@/containers/Build/ScreenshotActions";
import { CommentToolToggle } from "@/containers/Build/toolbar/CommentToolToggle";
import {
  DetailToolbar,
  DetailToolbarNav,
  DetailToolbarTitle,
} from "@/containers/Build/toolbar/DetailToolbar";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { ViewToggle } from "@/containers/Build/toolbar/ViewToggle";
import { ZoomerSyncProvider, ZoomPane } from "@/containers/Build/Zoomer";
import { MediaVideo, MediaWell } from "@/ui/MediaFrame";
import { MenuItem } from "@/ui/menu-kit";
import { Separator } from "@/ui/Separator";
import { useResizeObserver } from "@/ui/useResizeObserver";

import { MediaCommentLayer } from "./MediaCommentLayer";
import { checkCanCommentOnMedia } from "./permissions";

/** One renderable version of a media. */
type ViewerVersion = {
  fileUrl: string;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  isVideo: boolean;
  sizeBytes: number;
  createdAt: string;
};

/**
 * What the viewer needs. `version` is whichever one is selected, which is not
 * necessarily the newest — the point of keeping the older ones is being able to
 * look at them.
 */
export type ViewerMedia = {
  name: string;
  state?: string | null;
  version: ViewerVersion;
};

/**
 * A computed comparison between the pair's two halves — only ever the one
 * computed from the two versions on screen, so the mask cannot describe other
 * bytes than the ones under it.
 */
export type ViewerDiff = {
  /** The mask: a PNG whose opaque pixels are the ones that changed. */
  url: string;
  /**
   * The mask's own dimensions. It shares the images' pixel grid — both halves
   * are padded to a common canvas from the top left before being compared — so
   * it can be larger than the half it is drawn over, never scaled against it.
   */
  width: number;
  height: number;
};

/**
 * How a pair is looked at — the build's own modes, on the build's own atom.
 *
 * A pair of media and a build's baseline against its changes are the same
 * question, so they are looked at with the same controls and the same
 * preference: someone who works side by side on builds gets side by side here
 * without having to say so twice. `baseline` is the "before" and `changes` is
 * the "after".
 */

/** Wiring for the comment layer drawn over the media's own pane. */
type ViewerComments = Omit<
  React.ComponentProps<typeof MediaCommentLayer>,
  "paneSize" | "imgSize"
>;

/**
 * Moving between the media of one pull request. Null when there is nothing to
 * move between — a media shared on its own has no arrows rather than two dead
 * ones.
 */
export type MediaViewerNav = {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

/** Everything a blended (onion/swipe) pane needs beyond its base media. */
type BlendState = {
  mode: "onion" | "swipe";
  /** The other half, drawn as an absolute layer over/under the base. */
  counterpart: ViewerVersion;
  /** Whether the counterpart is the "after" — the layer being faded/revealed. */
  counterpartIsAfter: boolean;
  onionOpacity: number;
  onOnionOpacityChange: (value: number) => void;
  swipe: {
    position: number;
    onPositionChange: (position: number) => void;
    handleY: number;
    onHandleYChange: (handleY: number) => void;
  };
};

/**
 * The share page's viewer: the same pan/zoom pane a build uses — with the same
 * control stack (actions menu, fit, zoom), the same floating comment layer and
 * the same compare tools — so a reviewer can get in close on the pixel they
 * want to talk about.
 *
 * A before/after pair defaults to two panes with **synced** pan and zoom, which
 * is what makes them comparable — zooming into the misaligned button on the
 * "after" moves the "before" to the same spot. The toolbar's other modes blend
 * the two halves into one pane (onion skin, swipe) or show the media alone.
 *
 * When Argos has compared the pair, the changed pixels are marked on the
 * "after" with the same overlay a build draws over its changes — same mask, same
 * controls, same shortcuts.
 *
 * Videos keep the native player. Panning a video is not a thing anyone wants,
 * and the controls would fight the drag gesture. A pair of recordings is still
 * compared with the same toggle — side by side, or either half alone — minus
 * the blends, which need two images.
 */
export function MediaViewer(props: {
  media: ViewerMedia;
  /** The other half of a before/after pair, shown alongside when present. */
  counterpart: ViewerMedia | null;
  /** The comment layer over the media's own pane. */
  comments: ViewerComments;
  /** The pair's computed comparison, once there is a mask to draw. */
  diff: ViewerDiff | null;
  /** Moving through the pull request's media. */
  nav: MediaViewerNav | null;
}) {
  const { media, counterpart, comments, diff, nav } = props;
  const version = media.version;
  const storedMode = useAtomValue(buildViewModeAtom);
  const { mode: commentToolMode } = useCommentTool();
  const [onionOpacity, setOnionOpacity] = useAtom(onionOpacityAtom);
  const [swipePosition, setSwipePosition] = useAtom(swipePositionAtom);
  const [swipeHandleY, setSwipeHandleY] = useAtom(swipeHandleYAtom);

  // Blending lays one half over the other as an image, so it needs two images.
  // A pair is two uploads under one name and nothing stops either of them being
  // a recording.
  const blendEnabled = Boolean(
    counterpart && !version.isVideo && !counterpart.version.isVideo,
  );

  // Every mode but one needs the other half; without it the media stands alone,
  // which is what "changes" means here — this media, on its own.
  const mode: ViewMode = counterpart
    ? getEffectiveViewMode(storedMode, blendEnabled)
    : "changes";

  // Which half is which, whichever one this page is for. A pair is ordered so
  // the "before" is always on the left: one that read right-to-left depending on
  // which link the reviewer clicked would be actively misleading.
  const beforeMedia = media.state === "before" ? media : (counterpart ?? media);
  const afterMedia = media.state === "before" ? counterpart : media;

  // Blended, the pane shows the "after" with the "before" laid over it — the
  // same base the mask goes on, so the two describe the same image.
  const blend: BlendState | null =
    counterpart && checkIsBlendViewMode(mode)
      ? {
          mode,
          counterpart: beforeMedia.version,
          counterpartIsAfter: beforeMedia.state === "after",
          onionOpacity,
          onOnionOpacityChange: setOnionOpacity,
          swipe: {
            position: swipePosition,
            onPositionChange: setSwipePosition,
            handleY: swipeHandleY,
            onHandleYChange: setSwipeHandleY,
          },
        }
      : null;

  // `changes` marks the pane the mask belongs on: the "after", the build's rule
  // and the one that reads right — the overlay says "here is what this half
  // changed". `interactive` marks the pane this page's comments belong to;
  // drawing them on the counterpart would attach feedback to the wrong image.
  const panes = (() => {
    if (!counterpart || !afterMedia) {
      return [{ media, interactive: true, changes: true }];
    }
    switch (mode) {
      case "split":
        return [
          {
            media: beforeMedia,
            interactive: beforeMedia === media,
            changes: false,
          },
          {
            media: afterMedia,
            interactive: afterMedia === media,
            changes: true,
          },
        ];
      case "baseline":
        // The "before" on its own — nothing changed *it*, so no mask.
        return [
          {
            media: beforeMedia,
            interactive: beforeMedia === media,
            changes: false,
          },
        ];
      // The "after" alone, or both halves blended into one pane. Either way the
      // mask describes what is under it.
      default:
        return [
          {
            media: afterMedia,
            interactive: afterMedia === media,
            changes: true,
          },
        ];
    }
  })();

  // Looking at the "before" alone puts the commentable half off screen, and a
  // recording has no still frame to pin to. Either way there is nowhere for a
  // pin to land — the tool has to come back down rather than leave the
  // reviewer clicking at something that cannot take it.
  const commentable = panes.some(
    (pane) => pane.interactive && !pane.media.version.isVideo,
  );

  // What it takes for the comment tool to be worth offering: a half on screen
  // that can take a pin, and a viewer allowed to add to the discussion.
  // `DisarmCommentTool` is given the same value, so the tool can never stay
  // armed once the control that would put it away has gone.
  const canPlacePin = commentable && checkCanCommentOnMedia(comments.media);

  // Where the page stacks (below `lg`), the viewer sizes itself from the
  // media's own shape instead of claiming a fixed slice of the viewport: a
  // wide screenshot on a phone would otherwise sit in a mostly-empty well.
  // On `lg` the page gives the viewer its full column and flex wins.
  //
  // Recordings size themselves there: the player lays out at the video's own
  // shape, which processing never records for a video, so a row of recordings
  // alone takes the players' height rather than a slice of the viewport.
  const sizedByPlayers = panes.every((pane) => pane.media.version.isVideo);
  const stackedAspectRatio =
    !sizedByPlayers && version.width && version.height
      ? (version.width / version.height) * panes.length
      : null;

  return (
    // One zoomer across both panes is what couples their transforms. Scale is
    // the opposite — per pane, because it is per image; see {@link MediaPane}.
    <ZoomerSyncProvider id={`media-${media.name}`}>
      {/* The toolbar's highlight and next/previous buttons act on whichever
          pane registered itself as the highlighter, so both have to be under
          one provider. */}
      <BuildDiffHighlighterProvider>
        <DisarmCommentTool enabled={canPlacePin} />
        <div className="flex h-full min-h-0 flex-col gap-2">
          <MediaViewToolbar
            title={media.name}
            nav={nav}
            compare={
              counterpart ? { blendEnabled, hasChanges: diff !== null } : null
            }
            commentTool={canPlacePin}
          />

          <div
            className={clsx(
              "flex w-full gap-3 lg:min-h-0 lg:flex-1",
              !sizedByPlayers &&
                "max-h-[70dvh] min-h-72 lg:h-auto lg:max-h-none",
              // No known shape to size from: fall back to a viewport slice.
              !sizedByPlayers && stackedAspectRatio === null && "h-[60dvh]",
            )}
            style={
              stackedAspectRatio !== null
                ? { aspectRatio: stackedAspectRatio }
                : undefined
            }
          >
            {panes.map((pane) => {
              const key = pane.media.state ?? "solo";
              // A pair's half names itself beside the other, and still does
              // when shown alone — it is one side of a comparison either way.
              // Not when blended: that pane is both halves at once, and its own
              // controls already name the two layers.
              const labelled =
                panes.length > 1 ||
                Boolean(
                  pane.media.state &&
                  counterpart &&
                  !checkIsBlendViewMode(mode),
                );
              // Only side by side puts two panes on screen, and only then is
              // "which one takes the pin" a question the viewer has to answer.
              // A single pane — alone, or with both halves blended into it —
              // has nowhere else the pin could land.
              const pinState =
                panes.length > 1 && canPlacePin && commentToolMode === "comment"
                  ? pane.interactive
                    ? "target"
                    : "excluded"
                  : null;
              if (pane.media.version.isVideo) {
                // Never the target: a recording is not `commentable`.
                return (
                  <MediaVideoPane
                    key={key}
                    media={pane.media}
                    labelled={labelled}
                    receded={pinState === "excluded"}
                  />
                );
              }
              return (
                <MediaPane
                  key={key}
                  media={pane.media}
                  labelled={labelled}
                  blend={pane.changes ? blend : null}
                  // Comments and the version picker belong to the media whose
                  // page this is. Drawing them on the counterpart would attach
                  // feedback to the wrong image.
                  comments={pane.interactive ? comments : null}
                  diff={pane.changes ? diff : null}
                  pinState={pinState}
                />
              );
            })}
          </div>
        </div>
      </BuildDiffHighlighterProvider>
    </ZoomerSyncProvider>
  );
}

/**
 * Puts the comment tool away when the view has nothing that can take a pin —
 * switching to the "before" alone, whose comments belong to the other half, or
 * moving on to a recording.
 *
 * Renders nothing because there is nothing to say: the tool simply stops being
 * armed, the same as pressing Escape.
 */
function DisarmCommentTool(props: { enabled: boolean }) {
  const { enabled } = props;
  const { mode, activateHand } = useCommentTool();
  useEffect(() => {
    if (!enabled && mode === "comment") {
      activateHand();
    }
  }, [enabled, mode, activateHand]);
  return null;
}

/**
 * The bar over the media, in the build's own layout and built from the build's
 * own components: where to go next on the left, what is on screen in the middle,
 * what can be done to it on the right.
 *
 * Three of the slots are conditional, each on what it would act on: the compare
 * controls on there being a pair, the overlay controls on Argos having found
 * changes to mark, and the comment tool on a half being on screen that can take
 * a pin. A lone recording has none of them. What is left — the name, and the
 * arrows out of it — sits where a screenshot's page puts it, which is what makes
 * the two the same page.
 */
function MediaViewToolbar(props: {
  title: string;
  /** Moving through the pull request's media, when there is more than one. */
  nav: MediaViewerNav | null;
  /** The pair's controls, absent when the media stands alone. */
  compare: {
    /** Whether the two halves can be blended into one pane. */
    blendEnabled: boolean;
    /** Whether there is a mask to draw — the overlay controls act on nothing without one. */
    hasChanges: boolean;
  } | null;
  /**
   * Whether the comment tool belongs on the bar. Not when there is nothing on
   * screen to pin to — a recording, the "before" half alone, or a visitor who
   * may only read.
   */
  commentTool: boolean;
}) {
  const { title, nav, compare, commentTool } = props;
  return (
    // `mb-4` + the viewer column's `gap-2` puts 24px between the toolbar and
    // the panes, level with the sidebar's action strip.
    <div className="mb-4 shrink-0">
      <DetailToolbar>
        {nav ? (
          <DetailToolbarNav>
            <PreviousButton
              hotkeyName="goToPreviousMedia"
              onClick={nav.onPrevious}
              disabled={!nav.hasPrevious}
            />
            <NextButton
              hotkeyName="goToNextMedia"
              onClick={nav.onNext}
              disabled={!nav.hasNext}
            />
          </DetailToolbarNav>
        ) : null}
        {/* Monospace, unlike a snapshot's name: this one is a file name. */}
        <DetailToolbarTitle className="font-mono">{title}</DetailToolbarTitle>
        {/* `ml-auto` so the controls stay on the right even when the row is too
            narrow to hold them and they wrap under the title. */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {compare ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {/* The build's own controls, on the build's own state: which half
                  to look at, or both at once, with the same shortcuts. Only the
                  two names change, because here the baseline is the "before"
                  and the changes are the "after". */}
              <ViewToggle
                blendEnabled={compare.blendEnabled}
                labels={{ baseline: "Before", changes: "After" }}
              />
              {compare.hasChanges ? (
                <>
                  <Separator orientation="vertical" className="mx-1 h-6" />
                  {/* Same again: the same buttons, the same tooltips, the same
                      D / H / J / K shortcuts. */}
                  <ChangesOverlayControls />
                </>
              ) : null}
            </div>
          ) : null}
          {commentTool ? (
            // Last, because it is the one control here that acts on the media
            // rather than on how the media is shown — the order the build's own
            // bar reads in: see the change, then annotate it.
            <CommentToolToggle />
          ) : null}
        </div>
      </DetailToolbar>
    </div>
  );
}

function MediaPane(props: {
  media: ViewerMedia;
  labelled: boolean;
  blend: BlendState | null;
  comments: ViewerComments | null;
  /** The mask to mark this pane's changed pixels with, when it carries one. */
  diff: ViewerDiff | null;
  /**
   * This pane's part in the armed comment tool: the half a pin would land on,
   * or the half it would not. Null while the question doesn't arise — the tool
   * at rest, or one pane on screen. See {@link MediaViewer}.
   */
  pinState: "target" | "excluded" | null;
}) {
  const { media, labelled, blend, comments, diff, pinState } = props;
  const version = media.version;
  // What the browser measured off the bytes, once they are in.
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // A new upload is a different image, so the old measurement stops describing
  // it — dropped during render (the prior-props pattern) so a frame of the
  // wrong shape never paints.
  const [prevFileUrl, setPrevFileUrl] = useState(version.fileUrl);
  if (prevFileUrl !== version.fileUrl) {
    setPrevFileUrl(version.fileUrl);
    setMeasured(null);
  }
  const handleMeasured = useCallback(
    (size: { width: number; height: number }) => {
      setMeasured((prev) =>
        prev && prev.width === size.width && prev.height === size.height
          ? prev
          : size,
      );
    },
    [],
  );

  // The image's own size wins once it is known, and the recorded one only
  // reserves the frame until then. Two reasons, both of which cost the pin
  // layer its whole reason for existing:
  //
  // - Dimensions are read from the file's header at upload and processing
  //   tolerates failing to find them, so a media can render perfectly well with
  //   none recorded. Gating the overlay on them left the tool arming, showing
  //   its crosshair, and dropping every click on the floor.
  // - When the recorded pair disagrees with the bytes, the image letterboxes
  //   inside a box of the recorded shape, and points projected against the
  //   recorded size land somewhere the image isn't.
  const dimensions =
    measured ??
    (version.width && version.height
      ? { width: version.width, height: version.height }
      : undefined);
  return (
    // A scale of its own per pane, like the build gives each of its two columns:
    // the halves of a pair can have different intrinsic sizes, and everything
    // projected over a pane — pins, the swipe divider, the changes circles — is
    // projected against *its* image.
    <ScaleProvider>
      <div
        className="flex min-w-0 flex-1 flex-col"
        data-media-pane=""
        // The pane a pin would land on, while the tool is armed. An attribute
        // rather than a class in the test, so the guard survives restyling the
        // ring.
        {...(pinState === "target" ? { "data-pin-target": "" } : null)}
      >
        {/* The inspection surface: the same ground as the library thumbnails,
            so a white screenshot has a known ground to end on. The pane draws
            no chrome of its own — the well is the chrome. */}
        <MediaWell
          className={clsx(
            "relative flex min-h-0 flex-1 transition-opacity",
            // Both marks appear only with the crosshair, and answer exactly the
            // question it raises: a ring that is always on reads as "selected"
            // and says nothing about where a click goes.
            //
            // Inset so it draws over the pixels rather than in the gap between
            // the panes, which is where the eye is already looking.
            pinState === "target" && "ring-primary-active ring-2 ring-inset",
            // The other half recedes: naming the target is only half the answer
            // if the pane beside it looks just as clickable.
            pinState === "excluded" && "opacity-50",
          )}
        >
          {labelled ? <MediaPaneLabel state={media.state} /> : null}
          <ZoomPane
            surface="bare"
            dimensions={dimensions}
            controls={<MediaActionsMenu media={media} />}
            overlay={
              (comments || blend?.mode === "swipe" || diff) && dimensions
                ? (paneSize) => (
                    <>
                      {comments ? (
                        <MediaCommentLayer
                          {...comments}
                          paneSize={paneSize}
                          imgSize={dimensions}
                        />
                      ) : null}
                      {blend?.mode === "swipe" && paneSize ? (
                        <SwipeDivider
                          paneSize={paneSize}
                          imgSize={dimensions}
                          verticalAlign="center"
                          {...blend.swipe}
                        />
                      ) : null}
                      {diff && paneSize ? (
                        // The circles the highlight and next/previous buttons
                        // draw. Their coordinates are the mask's, which is the
                        // image's pixel grid on a possibly taller canvas —
                        // hence the two sizes.
                        <ChangesHighlights
                          url={diff.url}
                          paneSize={paneSize}
                          imgSize={diff}
                          layoutSize={dimensions}
                          verticalAlign="center"
                        />
                      ) : null}
                    </>
                  )
                : undefined
            }
          >
            <MediaImage
              src={version.fileUrl}
              alt={getMediaAlt(media)}
              dimensions={dimensions}
              blend={blend}
              diff={diff}
              onMeasured={handleMeasured}
            />
          </ZoomPane>
          {blend?.mode === "onion" ? (
            <OnionOpacityControl
              value={blend.onionOpacity}
              onChange={blend.onOnionOpacityChange}
              startLabel="Before"
              endLabel="After"
            />
          ) : null}
        </MediaWell>
      </div>
    </ScaleProvider>
  );
}

/**
 * A recording's pane: the browser's own player, in a well that hugs it.
 *
 * Nothing is drawn over it — no pins, no changes overlay. Both point at the
 * pixels of a still image, which a recording does not have.
 */
function MediaVideoPane(props: {
  media: ViewerMedia;
  labelled: boolean;
  /** Stepping back while the comment tool is armed on the image beside it. */
  receded: boolean;
}) {
  const { media, labelled, receded } = props;
  const version = media.version;
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center justify-center"
      data-media-pane=""
    >
      <MediaWell
        aspectRatio={
          version.width && version.height
            ? { width: version.width, height: version.height }
            : null
        }
        className={clsx(
          "flex max-h-full w-auto max-w-full items-center justify-center transition-opacity",
          receded && "opacity-50",
        )}
      >
        {labelled ? <MediaPaneLabel state={media.state} /> : null}
        <MediaVideo
          src={version.fileUrl}
          poster={version.posterUrl}
          label={getMediaAlt(media)}
          // Where the page stacks, the row takes the player's height, so there
          // is no pane to be capped by — the viewport caps it instead.
          className="max-h-[70dvh] lg:max-h-full"
        />
      </MediaWell>
    </div>
  );
}

/**
 * Which half of a pair a pane shows. Floating over the pixels rather than above
 * the frame, so the two halves stay named while panning, zooming, or leaning in
 * close. Near-opaque with a hairline edge: readable over any pixels, light or
 * dark, without hiding much of what it sits on.
 */
function MediaPaneLabel(props: { state: ViewerMedia["state"] }) {
  return (
    <div className="text-xxs pointer-events-none absolute top-2 left-2 z-10 rounded bg-(--gray-12)/70 px-1.5 py-0.5 font-semibold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur-sm dark:bg-(--gray-1)/70">
      {props.state}
    </div>
  );
}

/**
 * A media's text alternative. The state is part of it, not only the visible
 * label: a pair is two uploads with one name, and a screen reader reading
 * "checkout.png" twice cannot tell the reader which is which.
 */
function getMediaAlt(media: { name: string; state?: string | null }): string {
  return media.state ? `${media.name} (${media.state})` : media.name;
}

/**
 * The pane's floating actions, mirroring the build's snapshot menu: copy the
 * image's stable CDN link or its Markdown embed, or download the bytes under
 * the media's own name. Download is a direct action — a media has exactly one
 * thing to save, where a build's snapshot offers mask and composite variants.
 * Each pane of a pair acts on its own half — the Share panel owns what
 * concerns the pair as a whole.
 */
function MediaActionsMenu(props: { media: ViewerMedia }) {
  const { media } = props;
  return (
    <ImageActionsMenu tooltip="Media actions" ariaLabel="Media actions">
      {getCopyImageSubmenu({
        publicUrl: media.version.fileUrl,
        alt: getMediaAlt(media),
      })}
      <MenuItem
        icon={<DownloadIcon />}
        onAction={() => {
          downloadWithToast(
            fetchBlob(media.version.fileUrl).then((blob) => {
              downloadBlob(blob, getMediaDownloadName(media));
            }),
          );
        }}
      >
        Download
      </MenuItem>
    </ImageActionsMenu>
  );
}

/**
 * The file name a download saves under: the media's own name, with the pair
 * half spliced in before the extension — `checkout.png` becomes
 * `checkout (before).png` — so the two halves don't overwrite each other in
 * the downloads folder.
 */
export function getMediaDownloadName(media: {
  name: string;
  state?: string | null;
}): string {
  if (!media.state) {
    return media.name;
  }
  const dotIndex = media.name.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${media.name} (${media.state})`;
  }
  return `${media.name.slice(0, dotIndex)} (${media.state})${media.name.slice(dotIndex)}`;
}

/**
 * The image, contain-fitted the way the build's snapshots are: a container
 * carrying the aspect ratio shrinks to the pane while the flex stretch that
 * would distort a bare `img` hits the container instead. Rendered at its
 * natural size when it fits, shrunk to fit when it doesn't, and centered
 * either way — which `MediaCommentLayer` accounts for when projecting pins.
 *
 * In a blended pane the other half of the pair is layered inside the same
 * box, exactly like the build stacks baseline and changes: the "after" side
 * fades (onion) or is revealed from the divider (swipe) over the "before".
 *
 * When Argos has compared the pair, its mask goes on top — the changed pixels,
 * painted in the reviewer's overlay colour, exactly as on a build. The mask
 * shares the image's pixel grid on a canvas the size of the two halves' union,
 * so it is placed at the top left and sized in proportion to the box rather
 * than fitted into it: fitting it would slide every marked pixel off the one it
 * marks whenever the two halves differ in height.
 *
 * The pane also reports its image's rendered scale to its own `ScaleContext` —
 * the pin and circle projections multiply by it, so without this a marker on
 * any image larger than the pane would drift off the pixel it marks — and its
 * intrinsic size to the pane, which is the only source for a media whose
 * dimensions processing never recorded.
 */
function MediaImage(props: {
  src: string;
  alt: string;
  dimensions: { width: number; height: number } | undefined;
  blend: BlendState | null;
  diff: ViewerDiff | null;
  /** Reports the image's intrinsic size, once the bytes are in. */
  onMeasured: (size: { width: number; height: number }) => void;
}) {
  const { src, alt, dimensions, blend, diff, onMeasured } = props;
  const [, setImgScale] = useScaleContext();
  const overlayVisible = useAtomValue(overlayVisibleAtom);
  const imageRef = useRef<HTMLImageElement>(null);

  const measure = useCallback(() => {
    const img = imageRef.current;
    // A broken image is `complete` too, with a zero natural size — nothing
    // measured, and nothing worth reporting.
    if (!img?.complete || !img.naturalWidth || !img.naturalHeight) {
      return;
    }
    onMeasured({ width: img.naturalWidth, height: img.naturalHeight });
    const imgScale = getImageScale(img);
    if (imgScale !== null) {
      startTransition(() => {
        setImgScale(imgScale);
      });
    }
  }, [setImgScale, onMeasured]);

  const ref = useResizeObserver(() => measure(), imageRef);

  // Measure when the image is loaded, and reset the scale on unmount so the
  // next media starts from a clean slate.
  useEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => {
    return () => setImgScale(1);
  }, [setImgScale]);

  // The pixels the mask sits on step back while it is on, the way the build's
  // changes screenshot does: a mask painted over a busy screenshot at full
  // brightness is hard to read as an answer.
  const dimmed = diff !== null && overlayVisible;

  // The other half, placed on the base's pixel grid rather than fitted to its
  // box: the two are compared pixel for pixel from the top left, which is also
  // where the mask marks them. Fitting a 720-tall "before" into a 1024-tall
  // "after" would scale and centre it, so every pixel the mask marks would sit
  // over a different pixel of the layer underneath.
  const counterpartLayer =
    blend && dimensions && blend.counterpart.width && blend.counterpart.height
      ? {
          width: `${(blend.counterpart.width / dimensions.width) * 100}%`,
          height: `${(blend.counterpart.height / dimensions.height) * 100}%`,
        }
      : null;
  /** How wide that layer is, as a multiple of the base — 1 when it is not placed. */
  const counterpartScaleX =
    counterpartLayer && dimensions && blend?.counterpart.width
      ? blend.counterpart.width / dimensions.width
      : 1;

  // The style fading (onion) or revealing (swipe) the pair's "after" side,
  // applied to whichever layer that is. In onion the dimming is folded into the
  // opacity rather than left to the class, which an inline opacity would win
  // against.
  const afterStyle: React.CSSProperties | undefined = blend
    ? blend.mode === "onion"
      ? {
          opacity: dimmed
            ? `calc(${blend.onionOpacity} * var(--opacity-disabled))`
            : blend.onionOpacity,
        }
      : { clipPath: `inset(0 0 0 ${blend.swipe.position * 100}%)` }
    : undefined;

  return (
    <div className="flex h-full min-w-0 items-center justify-center">
      <div
        className="relative max-h-full min-h-0 max-w-full min-w-0"
        style={
          dimensions
            ? {
                aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                height: dimensions.height,
              }
            : undefined
        }
      >
        {blend ? (
          <img
            src={blend.counterpart.fileUrl}
            alt=""
            draggable={false}
            className={clsx(
              "absolute top-0 left-0 object-contain",
              // Without a known size, all this layer can do is fit the box.
              // A pair's halves need not share an aspect ratio, so `contain`
              // rather than `size-full`: stretching would compare two
              // differently-shaped renderings of the same pixels.
              !counterpartLayer && "inset-0 size-full",
              // The "after" paints on top of the base; z-10 clears the base's
              // own stacking position.
              blend.counterpartIsAfter && "z-10",
              dimmed && "opacity-disabled",
            )}
            style={{
              ...counterpartLayer,
              ...(blend.counterpartIsAfter ? afterStyle : undefined),
              // The divider is a fraction of the base image; this layer can be
              // a different width, so the clip is restated in its own box.
              ...(blend.counterpartIsAfter &&
              blend.mode === "swipe" &&
              counterpartScaleX !== 1
                ? {
                    clipPath: `inset(0 0 0 ${
                      (blend.swipe.position / counterpartScaleX) * 100
                    }%)`,
                  }
                : null),
            }}
          />
        ) : null}
        <img
          ref={ref}
          src={src}
          alt={alt}
          width={dimensions?.width}
          height={dimensions?.height}
          onLoad={measure}
          // `object-contain` is the guarantee, not the layout: the box already
          // carries the image's own ratio, but a media whose recorded
          // dimensions disagree with its bytes — or one with none recorded at
          // all — must letterbox rather than stretch. A distorted screenshot is
          // worse than a small one: it is a picture of something that never
          // rendered.
          className={clsx(
            "relative size-full object-contain",
            dimmed && "opacity-disabled",
          )}
          style={blend && !blend.counterpartIsAfter ? afterStyle : undefined}
        />
        {diff && dimensions ? (
          <ChangesMask
            url={diff.url}
            // Above both halves, and never in the way of a pin: it is paint,
            // not a target.
            className="pointer-events-none absolute top-0 left-0 z-20"
            style={{
              // The mask's canvas is the union of the two halves, anchored at
              // the top left where the engine padded them. Stated relative to
              // this box so it scales with the image instead of being fitted
              // into it.
              width: `${(diff.width / dimensions.width) * 100}%`,
              height: `${(diff.height / dimensions.height) * 100}%`,
              // Swiping reveals the "after" from the divider, so the marks
              // belong on that side of it only — the build clips its overlay the
              // same way. The divider's position is a fraction of the *image*,
              // restated here as a fraction of the mask's wider canvas.
              ...(blend?.mode === "swipe"
                ? {
                    clipPath: `inset(0 0 0 ${
                      ((blend.swipe.position * dimensions.width) / diff.width) *
                      100
                    }%)`,
                  }
                : null),
              // An explicit 0 beats the overlay's own opacity; leaving it out
              // when visible keeps whatever the reviewer set.
              ...(overlayVisible ? null : { opacity: 0 }),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
