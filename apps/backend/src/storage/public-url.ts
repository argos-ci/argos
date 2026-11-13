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

type ImageUrlOptions = {
  /**
   * Serve the image exactly as it was uploaded. ImageKit otherwise picks the
   * format of each response itself, so a small PNG can come back as a JPEG:
   * fine for a browser, wrong for an API client that saves or compares the
   * file.
   */
  original?: boolean;
};

export function getImageKitUrl(key: string, options?: ImageUrlOptions) {
  const url = new URL(key, config.get("s3.publicImageBaseUrl"));
  if (options?.original) {
    url.searchParams.set("tr", "orig-true");
  }
  return url.href;
}

export async function getPublicImageFileUrl(
  file: FileModel,
  options?: ImageUrlOptions,
) {
  if (config.get("s3.publicImageBaseUrl")) {
    const pixels = getPixelsInFile(file);
    if (pixels !== null && pixels < IMAGEKIT_PIXELS_LIMIT) {
      return getImageKitUrl(file.key, options);
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
export async function getPublicFileUrl(
  file: FileModel,
  options?: ImageUrlOptions,
) {
  if (file.isImage()) {
    return getPublicImageFileUrl(file, options);
  }
  return getPublicUrl(file.key, { download: true });
}
