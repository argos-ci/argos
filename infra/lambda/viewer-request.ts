import type { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0]!.cf.request;

  // Copy the viewer Host header into x-original-host so the ORIGIN_REQUEST
  // Lambda can read the original hostname (at ORIGIN_REQUEST the Host header
  // is replaced by the S3 origin host).
  const host = request.headers["host"]?.[0]?.value;
  if (host) {
    request.headers["x-original-host"] = [{ key: "x-original-host", value: host }];
  }

  return request;
};
