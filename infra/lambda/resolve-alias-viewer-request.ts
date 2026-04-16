import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const API_BASEURL = process.env.API_BASEURL ?? "";

function notFoundResponse(): CloudFrontRequestResult {
  return {
    status: "404",
    statusDescription: "Not Found",
    body: "Not found",
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
    },
  };
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

async function resolveAlias(domain: string): Promise<string | null> {
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

  const body = (await response.json()) as { deploymentId?: unknown };
  if (typeof body.deploymentId !== "string" || !body.deploymentId) {
    throw new Error(`"deploymentId" not found for domain "${domain}"`);
  }
  return body.deploymentId;
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return notFoundResponse();
  }
  const request = record.cf.request;

  const host = request.headers["host"]?.[0]?.value ?? "";
  const alias = host.split(".")[0] ?? "";
  if (!alias) {
    console.log("[404] No alias in host");
    return notFoundResponse();
  }

  console.log(`[request] alias=${alias} path=${request.uri}`);

  const deploymentId = await resolveAlias(host);
  if (!deploymentId) {
    console.log(`[404] alias not found: ${alias}`);
    return notFoundResponse();
  }

  const filePath = normalizePath(request.uri.slice(1));
  request.uri = `/deployment/${deploymentId}/${filePath}`;

  return request;
};
