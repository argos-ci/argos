import clsx from "clsx";

import { MediaWell, VideoPoster } from "@/ui/MediaFrame";

/**
 * A version's thumbnail in a small well: the image itself, or a video's poster
 * frame.
 *
 * Contained, not cropped: what a thumbnail this size is for is telling one
 * version from another at a glance, and a square crop out of the middle of a
 * wide screenshot shows the same patch of background for every one of them.
 * The well's ground is the letterbox.
 */
export function MediaVersionThumbnail(props: {
  version: { fileUrl: string; posterUrl: string | null; isVideo: boolean };
  className: string;
}) {
  const { version, className } = props;
  return (
    <MediaWell
      className={clsx("flex shrink-0 items-center justify-center", className)}
    >
      {version.isVideo ? (
        <VideoPoster
          src={version.posterUrl}
          alt=""
          iconClassName="size-1/2"
          className="size-full object-contain"
        />
      ) : (
        <img
          src={version.fileUrl}
          alt=""
          className="size-full object-contain"
        />
      )}
    </MediaWell>
  );
}
