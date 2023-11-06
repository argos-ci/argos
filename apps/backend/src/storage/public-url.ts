import config from "@/config/index.js";
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

export async function getPublicImageUrl(key: string) {
  if (config.get("s3.publicImageBaseUrl")) {
    return new URL(key, config.get("s3.publicImageBaseUrl")).href;
  }

  return getPublicUrl(key);
}
