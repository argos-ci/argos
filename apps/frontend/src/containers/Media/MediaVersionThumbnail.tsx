import { useState } from "react";
import clsx from "clsx";
import { FilmIcon } from "lucide-react";

import { MediaWell } from "@/ui/MediaFrame";

/**
 * A version's thumbnail in a small well: the image itself, or a video's poster
 * frame.
 *
 * Contained, not cropped: what a thumbnail this size is for is telling one
 * version from another at a glance, and a square crop out of the middle of a
 * wide screenshot shows the same patch of background for every one of them.
 * The well's ground is the letterbox.
 *
 * A video whose poster does not load shows the film icon the library's
 * filmstrip falls back to, rather than a broken image.
 */
export function MediaVersionThumbnail(props: {
  version: { fileUrl: string; posterUrl: string | null; isVideo: boolean };
  className: string;
}) {
  const { version, className } = props;
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);
  const { posterUrl } = version;
  return (
    <MediaWell
      className={clsx("flex shrink-0 items-center justify-center", className)}
    >
      {!version.isVideo ? (
        <img
          src={version.fileUrl}
          alt=""
          className="size-full object-contain"
        />
      ) : posterUrl && posterUrl !== failedPosterUrl ? (
        <img
          src={posterUrl}
          alt=""
          onError={() => setFailedPosterUrl(posterUrl)}
          className="size-full object-contain"
        />
      ) : (
        <FilmIcon aria-hidden="true" className="text-low size-1/2" />
      )}
    </MediaWell>
  );
}
