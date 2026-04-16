import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const INTERNAL_AUTH_HEADER_NAME =
  process.env.INTERNAL_AUTH_HEADER_NAME ?? "x-argos-internal-auth";
const INTERNAL_AUTH_HEADER_VALUE = process.env.INTERNAL_AUTH_HEADER_VALUE ?? "";

function forbiddenResponse(): CloudFrontRequestResult {
  return {
    status: "403",
    statusDescription: "Forbidden",
    body: "Forbidden",
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
    },
  };
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return forbiddenResponse();
  }

  const request = record.cf.request;
  const authHeader = request.headers[INTERNAL_AUTH_HEADER_NAME]?.[0]?.value;

  if (!authHeader || authHeader !== INTERNAL_AUTH_HEADER_VALUE) {
    console.log("[403] Missing or invalid internal auth header");
    return forbiddenResponse();
  }

  return request;
};
