import clsx from "clsx";

/**
 * The transparency ground drawn under inspected pixels: the classic two-tone
 * checkerboard, made of two offset gradients in CSS so there is no asset to
 * load before the content has a ground. Shared by `MediaWell` and the build's
 * `ZoomPane`, so a screenshot sits on the same ground wherever it is inspected.
 *
 * It follows the viewer's theme (`--checkerboard-*`), rather than staying dark
 * under a light page. The point of the ground is being *known* — screenshots
 * routinely have alpha or white edges, and without one you cannot tell where
 * the image stops and the page starts — and a slab of near-black under a light
 * UI is read as part of the picture, which is the same confusion by the other
 * door.
 */
export function getCheckerboardStyle(checkerSize = 8): React.CSSProperties {
  const square = "var(--checkerboard-square)";
  return {
    backgroundColor: "var(--checkerboard-base)",
    backgroundImage: `
      linear-gradient(45deg, ${square} 25%, transparent 25%, transparent 75%, ${square} 75%),
      linear-gradient(45deg, ${square} 25%, transparent 25%, transparent 75%, ${square} 75%)
    `,
    backgroundSize: `${checkerSize * 2}px ${checkerSize * 2}px`,
    backgroundPosition: `0 0, ${checkerSize}px ${checkerSize}px`,
  };
}

/**
 * The surface a media is inspected on: the checkerboard ground (see
 * {@link getCheckerboardStyle}) under the build pane's hairline-and-shadow
 * chrome, so the image zone reads identically on both pages. Screenshots
 * routinely have alpha or white edges, and without a known ground you cannot
 * tell where the image stops and the page starts. It carries across from the
 * share page to the library thumbnails so the feature reads as one thing.
 */
export function MediaWell(props: {
  children: React.ReactNode;
  className?: string;
  /** Checker square size in pixels. Smaller for thumbnails. */
  checkerSize?: number;
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
  const { children, className, checkerSize = 8, aspectRatio } = props;
  return (
    <div
      className={clsx(
        "border-thin relative overflow-hidden rounded-md shadow-xs",
        className,
      )}
      style={{
        ...(aspectRatio
          ? { aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}` }
          : null),
        ...getCheckerboardStyle(checkerSize),
      }}
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
