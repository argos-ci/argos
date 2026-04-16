import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import config from "@/config";

let client: DynamoDBDocumentClient;

/**
 * Get the DynamoDB Document client instance.
 */
export function getDynamoDBClient(): DynamoDBDocumentClient {
  if (!client) {
    const endpoint = config.get("dynamodb.endpoint");
    const baseClient = new DynamoDBClient({
      region: "us-east-1",
      ...(endpoint ? { endpoint } : {}),
    });
    client = DynamoDBDocumentClient.from(baseClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return client;
}

/**
 * Get the DynamoDB table name with the stage prefix.
 */
export function getTableName(name: string): string {
  const stage = config.get("dynamodb.stage");
  return `${stage}_${name}`;
}
