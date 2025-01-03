const IMAGEKIT_DOMAIN = "files.argos-ci.com";

export function checkIsImageKitUrl(url: string) {
  return new URL(url).hostname === IMAGEKIT_DOMAIN;
}

export function fetchImage(url: string) {
  return fetch(
    url,
    checkIsImageKitUrl(url)
      ? {}
      : {
          // To work with CORS on S3.
          headers: { "Cache-control": "no-cache" },
        },
  );
}
