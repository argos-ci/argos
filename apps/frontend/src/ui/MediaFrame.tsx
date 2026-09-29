import clsx from "clsx";

/**
 * The surface a media is inspected on: the flat `--media-ground` under the
 * build pane's hairline-and-shadow chrome, so the image zone reads identically
 * on both pages. Screenshots routinely have alpha or white edges, and without a
 * known ground you cannot tell where the image stops and the page starts. It
 * carries across from the share page to the library thumbnails so the feature
 * reads as one thing.
 *
 * The ground follows the viewer's theme rather than staying dark under a light
 * page: a slab of near-black under a light UI is read as part of the picture,
 * which is the same confusion the ground exists to remove.
 */
export function MediaWell(props: {
  children: React.ReactNode;
  className?: string;
  /**
   * Intrinsic dimensions of the media, when known.
   *
   * Reserves the well's shape before the bytes arrive, so a large screenshot
   * doesn't reflow the page as it decodes — and so a media that fails to load,
   * or one whose dimensions processing hasn't recorded yet, still occupies a
   * frame instead of collapsing to a hairline.
   */
  aspectRatio?: { width: number; height: number } | null;
}) {
  const { children, className, aspectRatio } = props;
  return (
    <div
      className={clsx(
        "border-thin relative overflow-hidden rounded-md bg-(--media-ground) shadow-xs",
        className,
      )}
      style={
        aspectRatio
          ? { aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}` }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * A video in its frame, with the browser's own controls. Held to the frame's
 * width; the caller caps its height, because what a height can be measured
 * against depends on the layout around it.
 */
export function MediaVideo(props: {
  src: string;
  poster: string | null;
  /** The recording's accessible name — a `<video>` has no alt text. */
  label: string;
  className?: string;
}) {
  return (
    <video
      src={props.src}
      poster={props.poster ?? undefined}
      aria-label={props.label}
      controls
      playsInline
      preload="metadata"
      className={clsx(
        "block h-auto w-auto max-w-full object-contain",
        props.className,
      )}
    />
  );
}
