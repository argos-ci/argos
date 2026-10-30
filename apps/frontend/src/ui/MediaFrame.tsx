import { useEffect, useState } from "react";
import clsx from "clsx";
import { FilmIcon } from "lucide-react";

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
  const poster = useLoadedImageUrl(props.poster);
  return (
    <video
      src={props.src}
      poster={poster ?? undefined}
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

/**
 * A recording's poster frame, or the film icon when it has none or it fails to
 * load: the icon says what it is, where a broken image would only say that
 * something went wrong with a thumbnail nobody asked about.
 *
 * A plain `img`: the poster comes out of the CDN already transformed — it is a
 * frame taken from the video — and `ImageKitPicture` would append a second set
 * of transformations to a URL that has one.
 */
export function VideoPoster(
  props: Omit<React.ComponentProps<"img">, "src" | "onError"> & {
    src: string | null;
    iconClassName: string;
  },
) {
  const { src, iconClassName, ...imgProps } = props;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return (
      <FilmIcon
        aria-hidden="true"
        className={clsx("text-low", iconClassName)}
      />
    );
  }
  return <img src={src} onError={() => setFailedSrc(src)} {...imgProps} />;
}

/**
 * `url` once it has loaded as an image, and `null` until then or if it fails.
 *
 * A video showing its poster takes its size from the poster, and Chrome sizes
 * one that is still loading or failed to load at 0×0 — so a poster the CDN is
 * slow to produce collapsed a playable recording to its border. Given only a
 * poster that already loaded, the player lays out from the video's own
 * metadata in the meantime, and shows its first frame.
 */
function useLoadedImageUrl(url: string | null): string | null {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!url) {
      return undefined;
    }
    const image = new Image();
    image.onload = () => setLoadedUrl(url);
    image.src = url;
    return () => {
      image.onload = null;
    };
  }, [url]);
  return loadedUrl === url ? url : null;
}
