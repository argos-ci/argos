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

  const parts = request.uri.split("/").filter(Boolean);
  const prefix = parts[0] ?? "";
  const deploymentId = parts[1] ?? "";
  const filePath = parts.slice(2).join("/");

  if (prefix !== "deployment" || !deploymentId || !filePath) {
    console.log(`[404] Invalid deployment URI: ${request.uri}`);
    return notFoundResponse();
  }

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
