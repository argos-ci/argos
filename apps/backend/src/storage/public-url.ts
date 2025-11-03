import config from "@/config";
import { File as FileModel } from "@/database/models/File";

import { getS3Client } from "./s3";
import { getSignedObjectUrl } from "./signed-url";

export async function getPublicUrl(key: string) {
  const s3 = getS3Client();
  const url = await getSignedObjectUrl({
    s3,
    Bucket: config.get("s3.screenshotsBucket"),
    Key: key,
    expiresIn: 3600,
    method: "GET",
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
