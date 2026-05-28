import config from "@/config";
import { File as FileModel } from "@/database/models/File";

import { getS3Client } from "./s3";
import { getSignedObjectUrl } from "./signed-url";

export async function getPublicUrl(
  key: string,
  options?: {
    /**
     * Serve the file as a neutralized download: forces a `text/plain` content
     * type and an `attachment` disposition so attacker-controlled content
     * (e.g. HTML) cannot be rendered as active content on the storage origin.
     */
    download?: boolean;
  },
) {
  const s3 = getS3Client();
  const url = await getSignedObjectUrl({
    s3,
    Bucket: config.get("s3.screenshotsBucket"),
    Key: key,
    expiresIn: 3600,
    method: "GET",
    ...(options?.download
      ? {
          responseContentType: "text/plain; charset=utf-8",
          responseContentDisposition: "attachment",
        }
      : {}),
  });
  return url;
}

const IMAGEKIT_PIXELS_LIMIT = 100_000_000;

function getPixelsInFile(file: FileModel) {
  if (file.isSizedImage()) {
    return file.width * file.height;
  }
  return null;
}

export function getTwicPicsUrl(key: string) {
  return new URL(key, config.get("s3.publicImageBaseUrl")).href;
}

export async function getPublicImageFileUrl(file: FileModel) {
  if (config.get("s3.publicImageBaseUrl")) {
    const pixels = getPixelsInFile(file);
    if (pixels !== null && pixels < IMAGEKIT_PIXELS_LIMIT) {
      return getTwicPicsUrl(file.key);
    }
  }

  return getPublicUrl(file.key);
}

/**
 * Get the public URL used to serve a file to a browser.
 *
 * Images are served inline (optionally through the image CDN). Non-image files
 * (e.g. text snapshots) are served as neutralized downloads so that
 * attacker-controlled content cannot be rendered as active content on the
 * storage origin.
 */
export async function getPublicFileUrl(file: FileModel) {
  if (file.isImage()) {
    return getPublicImageFileUrl(file);
  }
  return getPublicUrl(file.key, { download: true });
}
