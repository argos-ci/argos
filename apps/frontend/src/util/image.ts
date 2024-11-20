const TWIC_PICS_DOMAIN = "argos.twic.pics";

export function checkIsTwicPicsUrl(url: string) {
  return new URL(url).hostname === TWIC_PICS_DOMAIN;
}

export function fetchImage(url: string) {
  return fetch(
    url,
    checkIsTwicPicsUrl(url)
      ? {}
      : {
          // To work with CORS on S3.
          headers: { "Cache-control": "no-cache" },
        },
  );
}
