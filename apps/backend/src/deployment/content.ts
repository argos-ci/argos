import { invariant } from "@argos/util/invariant";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { BatchGetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import pRetry from "p-retry";

import config from "@/config";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { checkIsS3NotFoundError, getS3Client } from "@/storage/s3";
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
 * Concurrent HEAD requests when checking a deployment's new files: a first
 * deploy of a large Storybook holds thousands of them.
 */
const HEAD_CONCURRENCY = 50;

async function checkContentStored(hash: string): Promise<boolean> {
  try {
    await getS3Client("us-east-1").send(
      new HeadObjectCommand({
        Bucket: config.get("deployments.bucketName"),
        Key: getDeploymentContentKey(hash),
      }),
    );
    return true;
  } catch (error) {
    if (checkIsS3NotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

async function countMissingContent(hashes: string[]): Promise<number> {
  const queue = [...hashes];
  let missing = 0;
  const worker = async () => {
    for (let hash = queue.pop(); hash !== undefined; hash = queue.pop()) {
      if (!(await checkContentStored(hash))) {
        missing += 1;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(HEAD_CONCURRENCY, hashes.length) }, worker),
  );
  return missing;
}

/**
 * Register a deployment's content in the files table so future deployments
 * skip uploading it. The table is shared by every project: a registered hash
 * tells any later deployment, whoever owns it, that its content is stored. So
 * content not registered yet is checked to have been uploaded first.
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

  const missingCount = await countMissingContent(unregistered);
  if (missingCount > 0) {
    const subject =
      missingCount === 1
        ? "A file of this deployment was"
        : `${missingCount} files of this deployment were`;
    throw boom(
      400,
      `${subject} not uploaded. Upload every file in uploadFiles, then finalize the deployment.`,
    );
  }

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
