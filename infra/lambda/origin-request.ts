import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const STAGE = process.env.STAGE ?? "development";

// Reuse the DynamoDB client across invocations
const DEFAULT_REGION = "us-east-1";
const REPLICA_REGIONS = new Set(["us-east-1", "eu-west-1"]);
const execRegion = process.env["AWS_REGION"] ?? DEFAULT_REGION;
const dynamoRegion = REPLICA_REGIONS.has(execRegion)
  ? execRegion
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
        environment: "production",
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
    return notFoundResponse();
  }
  const request = record.cf.request;
  const host = request.headers["host"]?.[0]?.value ?? "";

  // Extract subdomain from host (e.g. "abc123" from "abc123.argos-ci.live")
  const dotIndex = host.indexOf(".");
  if (dotIndex === -1) {
    return notFoundResponse();
  }
  const subdomain = host.substring(0, dotIndex);

  // Normalize the URI
  const normalizedPath = normalizePath(request.uri);
  // Strip leading slash for DynamoDB path lookup
  const filePath = normalizedPath.startsWith("/")
    ? normalizedPath.slice(1)
    : normalizedPath;

  let deploymentId: string;

  if (isDeploymentId(subdomain)) {
    // Subdomain is a deployment ID — look up directly
    deploymentId = subdomain;
  } else {
    // Subdomain is an alias — resolve to the current production deployment
    const resolved = await resolveProjectDeploymentId(subdomain);
    if (!resolved) {
      return notFoundResponse();
    }
    deploymentId = resolved;
  }

  // Look up the file's content hash
  const contentHash = await lookupDeploymentFile(deploymentId, filePath);
  if (!contentHash) {
    return notFoundResponse();
  }

  // Rewrite the request URI to the content-addressed S3 path
  request.uri = `/content/${contentHash}`;

  return request;
};
