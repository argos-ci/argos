import { invariant } from "@argos/util/invariant";
import { BatchGetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import pRetry from "p-retry";

import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { chunk } from "@/util/chunk";
import { boom } from "@/util/error";

/**
 * The key of content in the deployments bucket, shared by every deployment
 * whose files hash to it.
 */
export function getDeploymentContentKey(hash: string): string {
  return `content/${hash}`;
}

/**
 * Batch check which hashes already exist in the files table.
 */
export async function getExistingHashes(
  hashes: Set<string>,
): Promise<Set<string>> {
  const hashesArray = Array.from(hashes);
  const dynamo = getDynamoDBClient();
  const tableName = getTableName("files");
  const existing = new Set<string>();

  await Promise.all(
    // DynamoDB BatchGetItem supports max 100 keys per request
    chunk(hashesArray, 100).map(async (batch) => {
      try {
        await pRetry(
          async () => {
            const request = batch.map((hash) => ({ content_hash: hash }));
            const result = await dynamo.send(
              new BatchGetCommand({
                RequestItems: {
                  [tableName]: {
                    Keys: request,
                    ProjectionExpression: "content_hash",
                  },
                },
              }),
            );

            for (const item of result.Responses?.[tableName] ?? []) {
              existing.add(item["content_hash"] as string);
            }

            const unprocessedKeys =
              result.UnprocessedKeys?.[tableName]?.Keys ?? [];
            if (unprocessedKeys.length > 0) {
              batch = unprocessedKeys.map((key) => {
                const contentHash = key["content_hash"];
                invariant(
                  typeof contentHash === "string",
                  "Invalid content hash",
                );
                return contentHash;
              });
              throw new Error(
                `DynamoDB returned ${unprocessedKeys.length} unprocessed file keys`,
              );
            }
          },
          {
            retries: 5,
          },
        );
      } catch {
        throw boom(
          500,
          `Failed to read existing file hashes after retries (${batch.length} unprocessed keys remain)`,
        );
      }
    }),
  );

  return existing;
}

/**
 * Register a deployment's content in the files table so future deployments
 * skip uploading it. Hashes already registered are left as they are.
 */
export async function registerDeploymentContent(
  files: { content_hash: string; content_type: string }[],
) {
  const contentTypes = new Map(
    files.map((file) => [file.content_hash, file.content_type]),
  );
  const registered = await getExistingHashes(new Set(contentTypes.keys()));
  const unregistered = Array.from(contentTypes.keys()).filter(
    (hash) => !registered.has(hash),
  );

  const dynamo = getDynamoDBClient();
  const tableName = getTableName("files");
  // DynamoDB BatchWriteItem supports max 25 items per request
  for (const batch of chunk(unregistered, 25)) {
    let requests = batch.map((hash) => ({
      PutRequest: {
        Item: {
          content_hash: hash,
          s3_key: getDeploymentContentKey(hash),
          content_type: contentTypes.get(hash),
          created_at: new Date().toISOString(),
        },
      },
    }));

    try {
      await pRetry(
        async () => {
          const result = await dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [tableName]: requests,
              },
            }),
          );

          requests =
            (result.UnprocessedItems?.[tableName] as
              | typeof requests
              | undefined) ?? [];
          if (requests.length > 0) {
            throw new Error(
              `DynamoDB returned ${requests.length} unprocessed file hashes`,
            );
          }
        },
        {
          retries: 5,
        },
      );
    } catch {
      throw boom(
        500,
        `Failed to register file hashes after retries (${requests.length} unprocessed items remain)`,
      );
    }
  }
}
