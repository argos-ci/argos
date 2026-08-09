import { startTransition, useCallback, useEffect, useRef } from "react";
import { clsx } from "clsx";

import { getImageScale } from "@/containers/Build/projection";
import {
  ScaleProvider,
  useScaleContext,
} from "@/containers/Build/ScaleContext";
import { ZoomerSyncProvider, ZoomPane } from "@/containers/Build/Zoomer";
import { MediaVideo, MediaWell } from "@/ui/MediaFrame";
import { useResizeObserver } from "@/ui/useResizeObserver";

import {
  MediaCommentPins,
  type MediaPin,
  type MediaPoint,
} from "./MediaCommentPins";

/** One renderable version of a media. */
type ViewerVersion = {
  fileUrl: string;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  isVideo: boolean;
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
 * The share page's viewer: the same pan/zoom pane a build uses, so a reviewer can
 * get in close on the pixel they want to talk about.
 *
 * A before/after pair renders as two panes with **synced** pan and zoom, which is
 * what makes them comparable — zooming into the misaligned button on the "after"
 * moves the "before" to the same spot, so the reader is always looking at the same
 * region of both. That sync is the whole reason to reuse Argos's viewer here rather
 * than show two independent images.
 *
 * Videos keep the native player. Panning a video is not a thing anyone wants, and
 * the controls would fight the drag gesture.
 */
export function MediaViewer(props: {
  media: ViewerMedia;
  /** The other half of a before/after pair, shown alongside when present. */
  counterpart: ViewerMedia | null;
  pins: MediaPin[];
  selectedCommentId: string | null;
  onSelect: (commentId: string) => void;
  draftPoint: MediaPoint | null;
  placing: boolean;
  onPlace: (point: MediaPoint) => void;
}) {
  const { media, counterpart, ...pinProps } = props;
  const version = media.version;

  if (version.isVideo) {
    return (
      <MediaWell
        aspectRatio={
          version.width && version.height
            ? { width: version.width, height: version.height }
            : null
        }
        className="flex max-h-[70dvh] min-h-64 w-auto max-w-full items-center justify-center self-center lg:max-h-full"
      >
        <MediaVideo src={version.fileUrl} poster={version.posterUrl} />
      </MediaWell>
    );
  }

  // Ordered so "before" is always on the left, whichever half was opened. A pair
  // that read right-to-left depending on which link the reviewer clicked would be
  // actively misleading.
  const panes =
    counterpart && media.state
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
  // On `lg` the page gives the viewer its full column and `h-full` wins.
  const stackedAspectRatio =
    version.width && version.height
      ? (version.width / version.height) * panes.length
      : null;

  return (
    <ScaleProvider>
      {/* One provider across both panes is what couples their transforms. */}
      <ZoomerSyncProvider id={`media-${media.name}`}>
        <div
          className={clsx(
            "flex max-h-[70dvh] min-h-64 w-full gap-3 lg:h-full lg:max-h-none",
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
              labelled={panes.length > 1}
              // Pins and placing belong to the media whose page this is. Drawing
              // them on the counterpart would attach feedback to the wrong image.
              pinProps={pane.interactive ? pinProps : null}
            />
          ))}
        </div>
      </ZoomerSyncProvider>
    </ScaleProvider>
  );
}

function MediaPane(props: {
  media: ViewerMedia;
  labelled: boolean;
  pinProps: Omit<
    React.ComponentProps<typeof MediaCommentPins>,
    "paneSize" | "imgSize"
  > | null;
}) {
  const { media, labelled, pinProps } = props;
  const version = media.version;
  const dimensions =
    version.width && version.height
      ? { width: version.width, height: version.height }
      : undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {labelled ? (
        <div className="text-low text-xxs font-medium tracking-wide uppercase">
          {media.state}
        </div>
      ) : null}
      {/* The inspection surface: the same dark checkerboard as the library
          thumbnails, so a white screenshot has a known ground to end on. The
          pane draws no chrome of its own — the well is the chrome. */}
      <MediaWell className="flex min-h-0 flex-1">
        <ZoomPane
          surface="bare"
          dimensions={dimensions}
          overlay={
            pinProps && dimensions
              ? (paneSize) => (
                  <MediaCommentPins
                    {...pinProps}
                    paneSize={paneSize}
                    imgSize={dimensions}
                  />
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
            // Only the pinned pane drives the shared scale: the pins are
            // projected against *its* image, and a pair's halves can have
            // different intrinsic sizes.
            trackScale={pinProps != null}
          />
        </ZoomPane>
      </MediaWell>
    </div>
  );
}

/**
 * The image, contain-fitted the way the build's snapshots are: a container
 * carrying the aspect ratio shrinks to the pane while the flex stretch that
 * would distort a bare `img` hits the container instead.
 *
 * The pinned pane also reports its rendered scale to `ScaleContext` — the
 * pin projection multiplies by it, so without this a pin on any image larger
 * than the pane would drift off the pixel it marks.
 */
function MediaImage(props: {
  src: string;
  alt: string;
  dimensions: { width: number; height: number } | undefined;
  trackScale: boolean;
}) {
  const { src, alt, dimensions, trackScale } = props;
  const [, setImgScale] = useScaleContext();
  const imageRef = useRef<HTMLImageElement>(null);

  const updateScale = useCallback(() => {
    if (!trackScale) {
      return;
    }
    const img = imageRef.current;
    if (img && img.complete) {
      const imgScale = getImageScale(img);
      startTransition(() => {
        setImgScale(imgScale);
      });
    }
  }, [trackScale, setImgScale]);

  const ref = useResizeObserver(() => updateScale(), imageRef);

  // Update scale when the image is loaded, and reset it on unmount so the next
  // media starts from a clean slate.
  useEffect(() => {
    updateScale();
  }, [updateScale]);
  useEffect(() => {
    if (!trackScale) {
      return undefined;
    }
    return () => setImgScale(1);
  }, [trackScale, setImgScale]);

  return (
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
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={dimensions?.width}
        height={dimensions?.height}
        onLoad={updateScale}
        className="size-full"
      />
    </div>
  );
}
