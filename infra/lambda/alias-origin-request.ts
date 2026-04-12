import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";

const STAGE = process.env.STAGE ?? "development";

// Domain of the deployment CDN — injected at build time by esbuild define.
// e.g. "deploy.dev.argos-ci.live"
const DEPLOYMENT_DOMAIN = process.env.DEPLOYMENT_DOMAIN ?? "";

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
    body: "Not found",
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
    },
  };
}

/**
 * Numeric subdomains are direct deployment IDs (bigIncrements).
 */
function isDeploymentId(subdomain: string): boolean {
  try {
    BigInt(subdomain);
    return true;
  } catch {
    return false;
  }
}

async function resolveAlias(alias: string): Promise<string | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName("deployment_aliases"),
      Key: { alias },
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

  // The viewer-request Lambda prefixed the URI with the subdomain:
  // "/<alias>/path/to/file" — extract both parts.
  const parts = request.uri.split("/").filter(Boolean);
  const alias = parts[0] ?? "";
  const remainingPath = "/" + parts.slice(1).join("/");

  console.log(
    `[alias] uri=${request.uri} alias=${alias} stage=${STAGE} dynamoRegion=${dynamoRegion}`,
  );

  if (!alias) {
    console.log("[404] No alias in URI");
    return notFoundResponse();
  }

  let deploymentId: string;

  if (isDeploymentId(alias)) {
    deploymentId = alias;
    console.log(`[alias] direct deploymentId=${deploymentId}`);
  } else {
    const resolved = await resolveAlias(alias);
    if (!resolved) {
      console.log(`[404] alias not found: ${alias}`);
      return notFoundResponse();
    }
    deploymentId = resolved;
    console.log(`[alias] resolved ${alias} → deploymentId=${deploymentId}`);
  }

  // Rewrite URI to /<deploymentId>/<path> and forward to the deployment CDN.
  request.uri = `/${deploymentId}${remainingPath}`;
  request.origin = {
    custom: {
      domainName: DEPLOYMENT_DOMAIN,
      port: 443,
      protocol: "https",
      path: "",
      sslProtocols: ["TLSv1.2"],
      readTimeout: 30,
      keepaliveTimeout: 5,
      customHeaders: {},
    },
  };
  request.headers["host"] = [{ key: "Host", value: DEPLOYMENT_DOMAIN }];

  console.log(`[alias] forwarding to ${DEPLOYMENT_DOMAIN}${request.uri}`);

  return request;
};
