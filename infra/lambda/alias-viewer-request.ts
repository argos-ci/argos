import type { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0]!.cf.request;

  // Prepend the subdomain to the URI so the ORIGIN_REQUEST Lambda can extract
  // it (at ORIGIN_REQUEST the Host header is replaced by the origin's host).
  // Also scopes the CloudFront cache key per alias, enabling targeted
  // invalidation with /<alias>/*.
  //
  // e.g. host "test.dev.argos-ci.live", uri "/page.html" → "/test/page.html"
  const host = request.headers["host"]?.[0]?.value ?? "";
  const subdomain = host.split(".")[0];
  if (subdomain) {
    request.uri = `/${subdomain}${request.uri}`;
  }

  return request;
};
