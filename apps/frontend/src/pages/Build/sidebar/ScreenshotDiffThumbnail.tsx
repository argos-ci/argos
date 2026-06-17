import { clsx } from "clsx";
import { FileIcon, ImageIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { checkIsImageContentType } from "@/util/content-type";

const _ScreenshotDiffFragment = graphql(`
  fragment ScreenshotDiffThumbnail_ScreenshotDiff on ScreenshotDiff {
    compareScreenshot {
      id
      url
      contentType
    }
    baseScreenshot {
      id
      url
      contentType
    }
  }
`);

/**
 * A small preview of a screenshot diff: the image itself when the snapshot is
 * an image, or a file icon otherwise (e.g. a Markdown or other non-image file
 * uploaded as a snapshot, which would not render as a picture).
 */
export function ScreenshotDiffThumbnail(props: {
  screenshotDiff: DocumentType<typeof _ScreenshotDiffFragment>;
  /** Size class for the thumbnail box. */
  className?: string;
  /** Size class for the fallback icon; defaults to `className`. */
  iconClassName?: string;
  /** How the image fills the box. */
  fit?: "contain" | "cover";
}) {
  const {
    screenshotDiff,
    className,
    iconClassName = className,
    fit = "contain",
  } = props;
  const screenshot =
    screenshotDiff.compareScreenshot ?? screenshotDiff.baseScreenshot ?? null;
  const thumbnailUrl = screenshot?.url ?? null;
  const isImage = screenshot
    ? checkIsImageContentType(screenshot.contentType)
    : false;

  if (isImage && thumbnailUrl) {
    return (
      <span
        className={clsx(
          "block shrink-0 overflow-hidden rounded-sm border bg-white",
          className,
        )}
      >
        <ImageKitPicture
          src={thumbnailUrl}
          transformations={["w-32", "h-32", "c-at_max"]}
          className={clsx(
            "size-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
          alt=""
        />
      </span>
    );
  }

  const Icon = isImage ? ImageIcon : FileIcon;
  return <Icon className={clsx("text-low shrink-0", iconClassName)} />;
}
