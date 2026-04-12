import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const STAGE = process.env.STAGE ?? "development";

const baseClient = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: { removeUndefinedValues: true },
});

function tableName(name: string): string {
  return `${STAGE}_${name}`;
}

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

async function resolveAlias(alias: string): Promise<string | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_aliases"),
      Key: { alias },
      ProjectionExpression: "deployment_id",
    }),
  );
  if (!result.Item) {
    return null;
  }
  if (
    typeof result.Item["deployment_id"] !== "string" ||
    !result.Item["deployment_id"]
  ) {
    throw new Error(`"deployment_id" not found on alias ${alias}`);
  }
  return result.Item["deployment_id"];
}

async function lookupFile(
  deploymentId: string,
  filePath: string,
): Promise<string | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_files"),
      Key: { deployment_id: deploymentId, path: filePath },
      ProjectionExpression: "content_hash",
    }),
  );
  if (!result.Item) {
    return null;
  }
  if (
    typeof result.Item["content_hash"] !== "string" ||
    !result.Item["content_hash"]
  ) {
    throw new Error(
      `"content_hash" not found on entry deployment:${deploymentId}${filePath}`,
    );
  }
  return result.Item["content_hash"];
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return notFoundResponse();
  }

  const request = record.cf.request;

  // The viewer-request Lambda prefixed the URI with the alias subdomain:
  // "/<alias>/path/to/file" — extract both parts.
  const parts = request.uri.split("/").filter(Boolean);
  const alias = parts[0] ?? "";
  const remainingPath = "/" + parts.slice(1).join("/");

  if (!alias) {
    console.log("[404] No alias in URI");
    return notFoundResponse();
  }

  console.log(`[request] alias=${alias} path=${remainingPath} stage=${STAGE}`);

  const deploymentId = await resolveAlias(alias);
  if (!deploymentId) {
    console.log(`[404] alias not found: ${alias}`);
    return notFoundResponse();
  }

  const filePath = normalizePath(remainingPath.slice(1)); // strip leading /
  console.log(`[lookup] deploymentId=${deploymentId} filePath=${filePath}`);

  const contentHash = await lookupFile(deploymentId, filePath);
  if (!contentHash) {
    console.log(
      `[404] file not found: deploymentId=${deploymentId} path=${filePath}`,
    );
    return notFoundResponse();
  }

  console.log(`[hit] rewriting uri to /content/${contentHash}`);
  request.uri = `/content/${contentHash}`;
  return request;
};
