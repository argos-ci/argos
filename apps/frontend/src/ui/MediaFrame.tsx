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
 * A video in its frame, with the browser's own controls.
 */
export function MediaVideo(props: {
  src: string;
  poster: string | null;
  className?: string;
}) {
  return (
    <video
      src={props.src}
      poster={props.poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      className={clsx(
        "block h-auto max-h-full w-auto max-w-full object-contain",
        props.className,
      )}
    />
  );
}
