import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const STAGE = process.env.STAGE ?? "development";

// Reuse the DynamoDB client across invocations
const DEFAULT_REGION = "us-east-1";
const execRegion = process.env["AWS_REGION"] ?? DEFAULT_REGION;
const dynamoRegion = execRegion.startsWith("eu-")
  ? "eu-west-1"
  : DEFAULT_REGION;
const baseClient = new DynamoDBClient({ region: dynamoRegion });
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
    body: "File not found",
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
    },
  };
}

/**
 * Check if a subdomain looks like a deployment ID (numeric, from bigIncrements).
 */
function isDeploymentId(subdomain: string): boolean {
  try {
    BigInt(subdomain);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize the request path.
 * Rewrites `/` and empty paths to `/index.html`.
 * Appends `/index.html` to directory-like paths (no extension).
 */
function normalizePath(uri: string): string {
  if (uri === "/" || uri === "") {
    return "/index.html";
  }
  // If the path has no file extension, treat it as a directory
  const lastSegment = uri.split("/").pop() ?? "";
  if (!lastSegment.includes(".")) {
    return uri.endsWith("/") ? `${uri}index.html` : `${uri}/index.html`;
  }
  return uri;
}

/**
 * Look up a file in the deployment_files table.
 */
async function lookupDeploymentFile(
  deploymentId: string,
  path: string,
): Promise<string | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_files"),
      Key: {
        deployment_id: deploymentId,
        path,
      },
      ProjectionExpression: "content_hash",
    }),
  );
  return (result.Item?.["content_hash"] as string) ?? null;
}

/**
 * Resolve a project slug to its current production deployment ID.
 */
async function resolveProjectDeploymentId(
  alias: string,
): Promise<string | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_aliases"),
      Key: {
        alias,
      },
      ProjectionExpression: "deployment_id",
    }),
  );
  return (result.Item?.["deployment_id"] as string) ?? null;
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records[0];
  if (!record) {
    console.log("[404] No CloudFront record in event");
    return notFoundResponse();
  }
  const request = record.cf.request;
  const host = request.headers["host"]?.[0]?.value ?? "";
  console.log(
    `[request] host=${host} uri=${request.uri} stage=${STAGE} dynamoRegion=${dynamoRegion}`,
  );

  // Extract subdomain from host (e.g. "abc123" from "abc123.argos-ci.live")
  const dotIndex = host.indexOf(".");
  if (dotIndex === -1) {
    console.log(`[404] No dot in host: ${host}`);
    return notFoundResponse();
  }
  const subdomain = host.substring(0, dotIndex);

  // Normalize the URI
  const normalizedPath = normalizePath(request.uri);
  // Strip leading slash for DynamoDB path lookup
  const filePath = normalizedPath.startsWith("/")
    ? normalizedPath.slice(1)
    : normalizedPath;

  console.log(`[lookup] subdomain=${subdomain} filePath=${filePath}`);

  let deploymentId: string;

  if (isDeploymentId(subdomain)) {
    deploymentId = subdomain;
    console.log(`[lookup] subdomain is deploymentId=${deploymentId}`);
  } else {
    console.log(
      `[lookup] resolving alias=${subdomain} from table=${tableName("deployment_aliases")}`,
    );
    const resolved = await resolveProjectDeploymentId(subdomain);
    if (!resolved) {
      console.log(`[404] alias not found: ${subdomain}`);
      return notFoundResponse();
    }
    deploymentId = resolved;
    console.log(`[lookup] resolved deploymentId=${deploymentId}`);
  }

  console.log(
    `[lookup] looking up file table=${tableName("deployment_files")} deploymentId=${deploymentId} path=${filePath}`,
  );
  const contentHash = await lookupDeploymentFile(deploymentId, filePath);
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
