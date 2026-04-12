import type { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0]!.cf.request;

  // Prepend the subdomain to the URI so CloudFront's cache key is scoped
  // per-subdomain via the path alone. This allows targeted cache invalidation
  // with /{subdomain}/* without affecting other deployments.
  //
  // e.g. "test.dev.argos-ci.live/index.html" → URI becomes "/test/index.html"
  const host = request.headers["host"]?.[0]?.value ?? "";
  const subdomain = host.split(".")[0];
  if (subdomain) {
    request.uri = `/${subdomain}${request.uri}`;
  }

  return request;
};
