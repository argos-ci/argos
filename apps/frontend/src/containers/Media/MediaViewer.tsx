import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clsx } from "clsx";
import { useAtom } from "jotai/react";
import { atomWithStorage } from "jotai/utils";
import { DownloadIcon } from "lucide-react";

import {
  OnionOpacityControl,
  SwipeDivider,
} from "@/containers/Build/BlendControls";
import { getImageScale } from "@/containers/Build/projection";
import {
  ScaleProvider,
  useScaleContext,
} from "@/containers/Build/ScaleContext";
import {
  CopyImageSubmenu,
  downloadBlob,
  downloadWithToast,
  fetchBlob,
  ImageActionsMenu,
} from "@/containers/Build/ScreenshotActions";
import { ZoomerSyncProvider, ZoomPane } from "@/containers/Build/Zoomer";
import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { MediaVideo, MediaWell } from "@/ui/MediaFrame";
import { MenuItem, MenuItemIcon } from "@/ui/Menu";
import { useResizeObserver } from "@/ui/useResizeObserver";

import { MediaCommentLayer } from "./MediaCommentLayer";

/** One renderable version of a media. */
type ViewerVersion = {
  fileUrl: string;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  isVideo: boolean;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string | null;
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
 * How a before/after pair is looked at. `split` and `single` mirror the build's
 * side-by-side and one-image views; `onion` and `swipe` blend the two halves
 * into one pane, exactly like the build's diff viewer.
 */
type MediaViewMode = "single" | "split" | "onion" | "swipe";

const mediaViewModeAtom = atomWithStorage<MediaViewMode>(
  "preferences.mediaViewMode",
  "split",
);

/** Wiring for the comment layer drawn over the media's own pane. */
type ViewerComments = Omit<
  React.ComponentProps<typeof MediaCommentLayer>,
  "paneSize" | "imgSize"
>;

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
 * Videos keep the native player. Panning a video is not a thing anyone wants,
 * and the controls would fight the drag gesture.
 */
export function MediaViewer(props: {
  media: ViewerMedia;
  /** The other half of a before/after pair, shown alongside when present. */
  counterpart: ViewerMedia | null;
  /** The comment layer over the media's own pane. */
  comments: ViewerComments;
}) {
  const { media, counterpart, comments } = props;
  const version = media.version;
  const [storedMode, setMode] = useAtom(mediaViewModeAtom);
  const [onionOpacity, setOnionOpacity] = useState(0.5);
  const [swipePosition, setSwipePosition] = useState(0.5);
  const [swipeHandleY, setSwipeHandleY] = useState(0.5);

  if (version.isVideo) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1.5">
        <MediaWell
          aspectRatio={
            version.width && version.height
              ? { width: version.width, height: version.height }
              : null
          }
          className="flex max-h-[70dvh] min-h-64 w-auto max-w-full items-center justify-center lg:max-h-full lg:min-h-0"
        >
          <MediaVideo src={version.fileUrl} poster={version.posterUrl} />
        </MediaWell>
      </div>
    );
  }

  // The compare modes need the other half; without one the media stands alone.
  const mode: MediaViewMode = counterpart ? storedMode : "single";

  const blend: BlendState | null =
    counterpart && (mode === "onion" || mode === "swipe")
      ? {
          mode,
          counterpart: counterpart.version,
          counterpartIsAfter: counterpart.state === "after",
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

  // Ordered so "before" is always on the left, whichever half was opened. A pair
  // that read right-to-left depending on which link the reviewer clicked would be
  // actively misleading.
  const panes =
    counterpart && mode === "split"
      ? media.state === "before"
        ? [
            { media, interactive: true },
            { media: counterpart, interactive: false },
          ]
        : [
            { media: counterpart, interactive: false },
            { media, interactive: true },
          ]
      : [{ media, interactive: true }];

  // Where the page stacks (below `lg`), the viewer sizes itself from the
  // media's own shape instead of claiming a fixed slice of the viewport: a
  // wide screenshot on a phone would otherwise sit in a mostly-empty well.
  // On `lg` the page gives the viewer its full column and flex wins.
  const stackedAspectRatio =
    version.width && version.height
      ? (version.width / version.height) * panes.length
      : null;

  return (
    <ScaleProvider>
      {/* One provider across both panes is what couples their transforms. */}
      <ZoomerSyncProvider id={`media-${media.name}`}>
        <div className="flex h-full min-h-0 flex-col gap-2">
          {counterpart ? (
            <MediaViewToolbar mode={mode} onModeChange={setMode} />
          ) : null}
          <div
            className={clsx(
              "flex max-h-[70dvh] min-h-72 w-full gap-3 lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1",
              // No known shape to size from: fall back to a viewport slice.
              stackedAspectRatio === null && "h-[60dvh]",
            )}
            style={
              stackedAspectRatio !== null
                ? { aspectRatio: stackedAspectRatio }
                : undefined
            }
          >
            {panes.map((pane) => (
              <MediaPane
                key={pane.media.state ?? "solo"}
                media={pane.media}
                // A pair's half also names itself when shown alone — "single"
                // is still one side of a comparison. Blended panes show both
                // halves, and their controls already name the two layers.
                labelled={
                  panes.length > 1 ||
                  Boolean(mode === "single" && pane.media.state && counterpart)
                }
                blend={pane.interactive ? blend : null}
                // Comments and the version picker belong to the media whose page
                // this is. Drawing them on the counterpart would attach feedback
                // to the wrong image.
                comments={pane.interactive ? comments : null}
                // Only side by side puts two panes on screen, and only then is
                // "which one takes the pin" a question the viewer has to answer.
                // A single pane — alone, or with both halves blended into it —
                // has nowhere else the pin could land.
                pinState={
                  panes.length > 1 && comments.placing
                    ? pane.interactive
                      ? "target"
                      : "excluded"
                    : null
                }
              />
            ))}
          </div>
        </div>
      </ZoomerSyncProvider>
    </ScaleProvider>
  );
}

/**
 * The compare toolbar over a pair, in the build toolbar's grammar: whether to
 * compare at all, and — when comparing — the build's own three ways to do it.
 */
function MediaViewToolbar(props: {
  mode: MediaViewMode;
  onModeChange: (mode: MediaViewMode) => void;
}) {
  const { mode, onModeChange } = props;
  const comparing = mode !== "single";
  return (
    // `mb-4` + the viewer column's `gap-2` puts 24px between the toolbar and
    // the panes, level with the sidebar's action strip.
    <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
      <ButtonGroup>
        <Button
          variant="secondary"
          aria-pressed={!comparing}
          onPress={() => onModeChange("single")}
        >
          Single
        </Button>
        <Button
          variant="secondary"
          aria-pressed={comparing}
          onPress={() => onModeChange("split")}
        >
          Compare
        </Button>
      </ButtonGroup>
      {comparing ? (
        <ButtonGroup>
          {(
            [
              ["split", "Side by side"],
              ["onion", "Onion"],
              ["swipe", "Swipe"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant="secondary"
              aria-pressed={mode === value}
              onPress={() => onModeChange(value)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      ) : null}
    </div>
  );
}

function MediaPane(props: {
  media: ViewerMedia;
  labelled: boolean;
  blend: BlendState | null;
  comments: ViewerComments | null;
  /**
   * This pane's part in the armed comment tool: the half a pin would land on,
   * or the half it would not. Null while the question doesn't arise — the tool
   * at rest, or one pane on screen. See {@link MediaViewer}.
   */
  pinState: "target" | "excluded" | null;
}) {
  const { media, labelled, blend, comments, pinState } = props;
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
    <div
      className="flex min-w-0 flex-1 flex-col"
      data-media-pane=""
      // The pane a pin would land on, while the tool is armed. An attribute
      // rather than a class in the test, so the guard survives restyling the
      // ring.
      {...(pinState === "target" ? { "data-pin-target": "" } : null)}
    >
      {/* The inspection surface: the same ground as the library thumbnails, so
          a white screenshot has a known ground to end on. The pane draws no
          chrome of its own — the well is the chrome. */}
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
        {labelled ? (
          // Floating over the pixels rather than above the frame, so the two
          // halves stay named while panning, zooming, or leaning in close.
          // Near-opaque with a hairline edge: readable over any pixels,
          // light or dark, without hiding much of what it sits on.
          <div className="text-xxs pointer-events-none absolute top-2 left-2 z-10 rounded bg-(--gray-12)/70 px-1.5 py-0.5 font-semibold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur-sm dark:bg-(--gray-1)/70">
            {media.state}
          </div>
        ) : null}
        <ZoomPane
          surface="bare"
          dimensions={dimensions}
          controls={<MediaActionsMenu media={media} />}
          overlay={
            (comments || blend?.mode === "swipe") && dimensions
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
                  </>
                )
              : undefined
          }
        >
          <MediaImage
            src={version.fileUrl}
            // The state is part of the alt text, not only the visible label
            // above: a pair is two images with one name, and a screen reader
            // reading "checkout.png" twice cannot tell the reader which is which.
            alt={media.state ? `${media.name} (${media.state})` : media.name}
            dimensions={dimensions}
            blend={blend}
            // Only the pinned pane drives the shared scale: the markers are
            // projected against *its* image, and a pair's halves can have
            // different intrinsic sizes.
            trackScale={comments != null}
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
  );
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
  const alt = media.state ? `${media.name} (${media.state})` : media.name;
  return (
    <ImageActionsMenu tooltip="Media actions" ariaLabel="Media actions">
      <CopyImageSubmenu publicUrl={media.version.fileUrl} alt={alt} />
      <MenuItem
        onAction={() => {
          downloadWithToast(
            fetchBlob(media.version.fileUrl).then((blob) => {
              downloadBlob(blob, getMediaDownloadName(media));
            }),
          );
        }}
      >
        <MenuItemIcon>
          <DownloadIcon />
        </MenuItemIcon>
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
 * The pinned pane also reports its rendered scale to `ScaleContext` — the
 * pin projection multiplies by it, so without this a pin on any image larger
 * than the pane would drift off the pixel it marks — and its intrinsic size to
 * the pane, which is the only source for a media whose dimensions processing
 * never recorded.
 */
function MediaImage(props: {
  src: string;
  alt: string;
  dimensions: { width: number; height: number } | undefined;
  blend: BlendState | null;
  trackScale: boolean;
  /** Reports the image's intrinsic size, once the bytes are in. */
  onMeasured: (size: { width: number; height: number }) => void;
}) {
  const { src, alt, dimensions, blend, trackScale, onMeasured } = props;
  const [, setImgScale] = useScaleContext();
  const imageRef = useRef<HTMLImageElement>(null);

  const measure = useCallback(() => {
    const img = imageRef.current;
    // A broken image is `complete` too, with a zero natural size — nothing
    // measured, and nothing worth reporting.
    if (!img?.complete || !img.naturalWidth || !img.naturalHeight) {
      return;
    }
    onMeasured({ width: img.naturalWidth, height: img.naturalHeight });
    if (!trackScale) {
      return;
    }
    const imgScale = getImageScale(img);
    if (imgScale !== null) {
      startTransition(() => {
        setImgScale(imgScale);
      });
    }
  }, [trackScale, setImgScale, onMeasured]);

  const ref = useResizeObserver(() => measure(), imageRef);

  // Measure when the image is loaded, and reset the scale on unmount so the
  // next media starts from a clean slate.
  useEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => {
    if (!trackScale) {
      return undefined;
    }
    return () => setImgScale(1);
  }, [trackScale, setImgScale]);

  // The style fading (onion) or revealing (swipe) the pair's "after" side,
  // applied to whichever layer that is.
  const afterStyle: React.CSSProperties | undefined = blend
    ? blend.mode === "onion"
      ? { opacity: blend.onionOpacity }
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
              // `object-contain`, because the box carries the *base* half's
              // aspect ratio and a pair's halves need not share one — a
              // 16:9 "before" against a 4:3 "after" would otherwise be
              // stretched to fit, comparing two differently-shaped renderings
              // of the same pixels.
              "absolute inset-0 size-full object-contain",
              // The "after" paints on top of the base; z-10 clears the base's
              // own stacking position.
              blend.counterpartIsAfter && "z-10",
            )}
            style={blend.counterpartIsAfter ? afterStyle : undefined}
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
          className="relative size-full object-contain"
          style={blend && !blend.counterpartIsAfter ? afterStyle : undefined}
        />
      </div>
    </div>
  );
}
