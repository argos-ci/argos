import clsx from "clsx";

/**
 * The surface a media is inspected on.
 *
 * Always dark, whatever the viewer's theme: a light surround shifts how you read
 * an image's own values, and every tool built for looking at pixels — Preview,
 * Quick Look, Photoshop — is dark for that reason. It is a material, not a mood,
 * which is why it doesn't follow the theme the way the page around it does.
 *
 * Under the media sits a transparency checkerboard. Screenshots routinely have
 * alpha or white edges, and without a known ground you cannot tell where the
 * image stops and the page starts. It is the universal mark for "these are the
 * actual pixels, nothing added", and it carries across from the share page to the
 * library thumbnails so the feature reads as one thing.
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
        // A hairline, not a shadow: a shadow reads as "content in a layout",
        // and this is an asset under inspection.
        "relative overflow-hidden rounded-md ring-1 ring-white/10",
        className,
      )}
      style={{
        ...(aspectRatio
          ? { aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}` }
          : null),
        backgroundColor: "#16161a",
        // Two offset gradients make the classic two-tone grid. Drawn in CSS so
        // there is no asset to load before the media has a ground.
        backgroundImage: `
          linear-gradient(45deg, rgba(255, 255, 255, 0.045) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.045) 75%),
          linear-gradient(45deg, rgba(255, 255, 255, 0.045) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.045) 75%)
        `,
        backgroundSize: `${checkerSize * 2}px ${checkerSize * 2}px`,
        backgroundPosition: `0 0, ${checkerSize}px ${checkerSize}px`,
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
