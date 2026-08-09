import { clsx } from "clsx";

import { ScaleProvider } from "@/containers/Build/ScaleContext";
import { ZoomerSyncProvider, ZoomPane } from "@/containers/Build/Zoomer";
import { MediaVideo, MediaWell } from "@/ui/MediaFrame";

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
        className="flex max-h-[75dvh] min-h-64 w-auto max-w-full items-center justify-center self-center"
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

  return (
    <ScaleProvider>
      {/* One provider across both panes is what couples their transforms. */}
      <ZoomerSyncProvider id={`media-${media.name}`}>
        <div
          className={clsx(
            "flex min-h-64 gap-3",
            panes.length > 1 ? "h-[70dvh]" : "h-[75dvh]",
          )}
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
      <div className="bg-app border-thin min-h-0 flex-1 overflow-hidden rounded-lg">
        <ZoomPane
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
          <img
            src={version.fileUrl}
            // The state is part of the alt text, not only the visible label
            // above: a pair is two images with one name, and a screen reader
            // reading "checkout.png" twice cannot tell the reader which is which.
            alt={media.state ? `${media.name} (${media.state})` : media.name}
            width={version.width ?? undefined}
            height={version.height ?? undefined}
            className="max-w-full"
          />
        </ZoomPane>
      </div>
    </div>
  );
}
