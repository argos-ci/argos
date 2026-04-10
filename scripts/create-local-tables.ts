#!/usr/bin/env tsx
/**
 * Creates the DynamoDB tables required for Storybook deployments
 * in the local DynamoDB instance.
 *
 * Usage: npx tsx scripts/create-local-tables.ts
 */
import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const ENDPOINT = process.env["DYNAMODB_ENDPOINT"] ?? "http://localhost:8000";
const STAGE = process.env["STAGE"] ?? "development";

const client = new DynamoDBClient({
  region: "eu-west-1",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

const tables = [
  {
    TableName: `${STAGE}_files`,
    KeySchema: [{ AttributeName: "content_hash", KeyType: "HASH" as const }],
    AttributeDefinitions: [
      { AttributeName: "content_hash", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
  },
  {
    TableName: `${STAGE}_deployment_files`,
    KeySchema: [
      { AttributeName: "deployment_id", KeyType: "HASH" as const },
      { AttributeName: "path", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "deployment_id", AttributeType: "S" as const },
      { AttributeName: "path", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
  },
  {
    TableName: `${STAGE}_project_deployments`,
    KeySchema: [
      { AttributeName: "project_slug", KeyType: "HASH" as const },
      { AttributeName: "environment", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "project_slug", AttributeType: "S" as const },
      { AttributeName: "environment", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
  },
];

async function main() {
  const existing = await client.send(new ListTablesCommand({}));
  const existingNames = new Set(existing.TableNames ?? []);

  for (const table of tables) {
    if (existingNames.has(table.TableName)) {
      console.log(`Table ${table.TableName} already exists, skipping.`);
      continue;
    }
    await client.send(new CreateTableCommand(table));
    console.log(`Created table ${table.TableName}`);
  }

  console.log("All DynamoDB tables ready.");
}

main().catch((error) => {
  console.error("Failed to create DynamoDB tables:", error);
  process.exit(1);
});
