import { useState } from "react";
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
 * An image on the inspection surface.
 *
 * Fades in over 150ms as it decodes: a multi-megabyte screenshot otherwise snaps
 * into place, which on a page whose whole job is that one image reads as a
 * glitch. Skipped entirely under `prefers-reduced-motion`.
 */
export function MediaImage(props: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={props.src}
      alt={props.alt}
      onLoad={() => setLoaded(true)}
      className={clsx(
        "block h-auto max-h-full w-auto max-w-full object-contain",
        "motion-safe:transition-opacity motion-safe:duration-150",
        loaded ? "opacity-100" : "motion-safe:opacity-0",
        props.className,
      )}
    />
  );
}

/**
 * A video on the inspection surface, with the browser's own controls.
 *
 * Native controls on purpose: a custom player is a lot of surface to get wrong
 * (keyboard, captions, fullscreen, scrubbing) for no gain on a page somebody
 * opened to watch one clip, and the native ones are the controls they already
 * know.
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
