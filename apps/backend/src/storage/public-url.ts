import config from "@/config/index.js";
import { File as FileModel } from "@/database/models/File.js";

import { getS3Client } from "./s3.js";
import { getSignedGetObjectUrl } from "./signed-url.js";

export async function getPublicUrl(key: string) {
  const s3 = getS3Client();
  const url = await getSignedGetObjectUrl({
    s3,
    Bucket: config.get("s3.screenshotsBucket"),
    Key: key,
    expiresIn: 3600,
  });
  return url;
}

const TWIC_PICS_PIXELS_LIMIT = 36_000_000;

function checkIsImageFile(file: FileModel) {
  return file.type === "screenshot" || file.type === "screenshotDiff";
}

function checkIsSizedFile(
  file: FileModel,
): file is FileModel & { width: number; height: number } {
  return Boolean(file.width && file.height);
}

function getPixelsInFile(file: FileModel) {
  if (checkIsImageFile(file) && checkIsSizedFile(file)) {
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
    if (pixels && pixels < TWIC_PICS_PIXELS_LIMIT) {
      return getTwicPicsUrl(file.key);
    }
  }

  return getPublicUrl(file.key);
}
