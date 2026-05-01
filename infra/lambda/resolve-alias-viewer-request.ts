import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CloudFrontHeaders,
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
  CloudFrontResultResponse,
} from "aws-lambda";

const API_BASEURL = process.env.API_BASEURL ?? "";
const APP_URL = process.env.APP_URL ?? "";
const BASE_DOMAIN = process.env.BASE_DOMAIN ?? "";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";
const COOKIE_MAX_AGE_SECONDS = 60 * 60;
const AUTH_CALLBACK_PATH = "/__argos/auth";

type ResolvedDeployment = {
  deploymentId: string;
  projectId: string;
  environment: "preview" | "production";
};

function plainResponse(
  status: string,
  statusDescription: string,
  body: string,
): CloudFrontResultResponse {
  return {
    status,
    statusDescription,
    body,
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
    },
  };
}

function notFoundResponse(): CloudFrontResultResponse {
  return plainResponse("404", "Not Found", "Not found");
}

function badRequestResponse(message: string): CloudFrontResultResponse {
  return plainResponse("400", "Bad Request", message);
}

function redirect(
  location: string,
  extraHeaders: CloudFrontHeaders = {},
): CloudFrontResultResponse {
  return {
    status: "302",
    statusDescription: "Found",
    headers: {
      location: [{ key: "Location", value: location }],
      "cache-control": [{ key: "Cache-Control", value: "no-store" }],
      ...extraHeaders,
    },
  };
}

function getCookie(
  headers: CloudFrontHeaders,
  name: string,
): string | undefined {
  const cookies = headers["cookie"];
  if (!cookies) {
    return undefined;
  }
  for (const entry of cookies) {
    for (const part of entry.value.split(";")) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      if (trimmed.slice(0, eq) === name) {
        return trimmed.slice(eq + 1) || undefined;
      }
    }
  }
  return undefined;
}

function base64UrlDecode(input: string): Buffer {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

type DeploymentAccessTokenPayload = {
  projectId: string;
  sub: string;
  iat: number;
  exp: number;
};

function verifyDeploymentAccessToken(
  token: string,
): DeploymentAccessTokenPayload | null {
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is not configured");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf-8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") {
    return null;
  }

  const expected = createHmac("sha256", ACCESS_TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  let received: Buffer;
  try {
    received = base64UrlDecode(encodedSignature);
  } catch {
    return null;
  }
  if (received.length !== expected.length) {
    return null;
  }
  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  let payload: DeploymentAccessTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf-8"));
  } catch {
    return null;
  }
  if (
    typeof payload.projectId !== "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) >= payload.exp) {
    return null;
  }
  return payload;
}

function cookieName(projectId: string): string {
  return `argos_dep_${projectId}`;
}

function buildSetCookie(projectId: string, token: string): string {
  const attrs = [
    `${cookieName(projectId)}=${token}`,
    `Domain=.${BASE_DOMAIN}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];
  return attrs.join("; ");
}

/**
 * Normalize a file path (no leading slash).
 * - "" or "/" → "index.html"
 * - "about"   → "about/index.html"
 * - "main.js" → "main.js"
 */
function normalizePath(filePath: string): string {
  if (filePath === "" || filePath === "/") {
    return "index.html";
  }
  const last = filePath.split("/").pop() ?? "";
  if (!last.includes(".")) {
    return filePath.endsWith("/")
      ? `${filePath}index.html`
      : `${filePath}/index.html`;
  }
  return filePath;
}

async function resolveAlias(
  domain: string,
): Promise<ResolvedDeployment | null> {
  if (!API_BASEURL) {
    throw new Error("API_BASEURL is not configured");
  }

  const response = await fetch(
    `${API_BASEURL}/v2/deployments/resolve/${encodeURIComponent(domain)}`,
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Failed to resolve deployment domain "${domain}" (${response.status})`,
    );
  }

  const body = (await response.json()) as Partial<ResolvedDeployment>;
  if (
    typeof body.deploymentId !== "string" ||
    !body.deploymentId ||
    typeof body.projectId !== "string" ||
    !body.projectId ||
    (body.environment !== "preview" && body.environment !== "production")
  ) {
    throw new Error(`Invalid deployment payload for domain "${domain}"`);
  }
  return {
    deploymentId: body.deploymentId,
    projectId: body.projectId,
    environment: body.environment,
  };
}

function isSafeReturnTo(value: string): boolean {
  // Only allow same-host relative paths to prevent open-redirect via the
  // callback. Must start with "/" but not "//" (protocol-relative).
  return value.startsWith("/") && !value.startsWith("//");
}

function handleAuthCallback(
  request: CloudFrontRequestEvent["Records"][0]["cf"]["request"],
): CloudFrontResultResponse {
  const queryString = request.querystring;
  const params = new URLSearchParams(queryString);
  const token = params.get("token");
  const returnTo = params.get("return_to") ?? "/";

  if (!token || !isSafeReturnTo(returnTo)) {
    return badRequestResponse("Invalid auth callback");
  }

  const payload = verifyDeploymentAccessToken(token);
  if (!payload) {
    return badRequestResponse("Invalid or expired token");
  }

  return redirect(returnTo, {
    "set-cookie": [
      { key: "Set-Cookie", value: buildSetCookie(payload.projectId, token) },
    ],
  });
}

function buildAccessRedirect(host: string, uri: string, querystring: string) {
  if (!APP_URL) {
    throw new Error("APP_URL is not configured");
  }
  const fullUrl = `https://${host}${uri}${querystring ? `?${querystring}` : ""}`;
  const accessUrl = new URL("/auth/deployments", APP_URL);
  accessUrl.searchParams.set("return_to", fullUrl);
  return redirect(accessUrl.toString());
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return notFoundResponse();
  }
  const request = record.cf.request;

  // Auth callback: set cookie + redirect to the original path.
  if (request.uri === AUTH_CALLBACK_PATH) {
    return handleAuthCallback(request);
  }

  const host = request.headers["host"]?.[0]?.value ?? "";
  const alias = host.split(".")[0] ?? "";
  if (!alias) {
    console.log("[404] No alias in host");
    return notFoundResponse();
  }

  console.log(`[request] alias=${alias} path=${request.uri}`);

  const deployment = await resolveAlias(host);
  if (!deployment) {
    console.log(`[404] alias not found: ${alias}`);
    return notFoundResponse();
  }

  if (deployment.environment === "production") {
    const cookieValue = getCookie(
      request.headers,
      cookieName(deployment.projectId),
    );
    const payload = cookieValue
      ? verifyDeploymentAccessToken(cookieValue)
      : null;
    if (!payload || payload.projectId !== deployment.projectId) {
      console.log(
        `[302] no valid access token for project ${deployment.projectId}`,
      );
      return buildAccessRedirect(host, request.uri, request.querystring);
    }
  }

  const filePath = normalizePath(request.uri.slice(1));
  request.uri = `/deployment/${deployment.deploymentId}/${filePath}`;

  return request;
};
