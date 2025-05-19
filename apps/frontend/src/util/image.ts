import pRetry from "p-retry";

const IMAGEKIT_DOMAIN = "files.argos-ci.com";

export function checkIsImageKitUrl(url: string) {
  return new URL(url).hostname === IMAGEKIT_DOMAIN;
}

/**
 * Fetches an image from a URL.
 * Retries the request if it fails.
 */
export function fetchImage(url: string) {
  return pRetry(
    async () =>
      fetch(
        url,
        checkIsImageKitUrl(url)
          ? {}
          : {
              // To work with CORS on S3.
              headers: { "Cache-control": "no-cache" },
            },
      ),
    { retries: 3 },
  );
}
