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
 * - "" or "/"  → "index.html"
 * - "about"    → "about/index.html"
 * - "main.js"  → "main.js"
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

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    return notFoundResponse();
  }

  const request = record.cf.request;

  // URI format: /<deploymentId>/<path>
  // parts[0] = "" (before leading slash), parts[1] = deploymentId, parts[2+] = path
  const parts = request.uri.split("/");
  const deploymentId = parts[1] ?? "";
  const rawPath = parts.slice(2).join("/");
  const filePath = normalizePath(rawPath);

  console.log(
    `[deployment] uri=${request.uri} deploymentId=${deploymentId} filePath=${filePath} stage=${STAGE}`,
  );

  if (!deploymentId) {
    console.log("[404] No deploymentId in URI");
    return notFoundResponse();
  }

  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_files"),
      Key: { deployment_id: deploymentId, path: filePath },
      ProjectionExpression: "content_hash",
    }),
  );

  const contentHash = result.Item?.["content_hash"] as string | undefined;
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
