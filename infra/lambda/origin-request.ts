import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const STAGE = process.env.STAGE ?? "development";

// Reuse the DynamoDB client across invocations.
// For production, tables are replicated to eu-west-1 — use the closest replica.
// For development, tables only exist in us-east-1 (no replication).
const PRODUCTION_REPLICA_REGIONS = new Set(["us-east-1", "eu-west-1"]);
const execRegion = process.env["AWS_REGION"] ?? "us-east-1";
const dynamoRegion =
  STAGE === "production" && PRODUCTION_REPLICA_REGIONS.has(execRegion)
    ? execRegion
    : "us-east-1";
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

  // The viewer-request Lambda prefixes the URI with the subdomain:
  // "/{subdomain}/path/to/file" — extract both parts here.
  const parts = request.uri.split("/").filter(Boolean);
  const subdomain = parts[0] ?? "";
  const remainingPath = "/" + parts.slice(1).join("/");

  console.log(
    `[request] uri=${request.uri} subdomain=${subdomain} stage=${STAGE} dynamoRegion=${dynamoRegion}`,
  );

  if (!subdomain) {
    console.log(`[404] No subdomain in URI: ${request.uri}`);
    return notFoundResponse();
  }

  // Normalize the remaining path
  const normalizedPath = normalizePath(remainingPath);
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
