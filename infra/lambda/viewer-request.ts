import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return { status: "400", body: "Bad request" };
  }
  const request = record.cf.request;

  // Prepend the subdomain to the URI so the CloudFront cache key is scoped
  // per alias and targeted invalidation (/<alias>/*) is possible.
  // e.g. host "my-project.dev.argos-ci.live", uri "/page.html" → "/my-project/page.html"
  const host = request.headers["host"]?.[0]?.value ?? "";
  const subdomain = host.split(".")[0];
  if (subdomain) {
    request.uri = `/${subdomain}${request.uri}`;
  }

  return request;
};
