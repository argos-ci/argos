import { invariant } from "@argos/util/invariant";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { chunk } from "lodash-es";
import pRetry from "p-retry";

import config from "@/config";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { getS3Client } from "@/storage/s3";
import { boom } from "@/util/error";

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

  // DynamoDB BatchGetItem supports max 100 keys per request
  const batchSize = 100;
  const batches = [];
  for (let i = 0; i < hashesArray.length; i += batchSize) {
    batches.push(hashesArray.slice(i, i + batchSize));
  }

  await Promise.all(
    batches.map(async (batch) => {
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
        Key: `content/${hash}`,
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * The files table is shared by every project: a registered hash tells any
 * later deployment, whoever owns it, that its content is stored and need not
 * be uploaded. Check that content not registered yet was actually uploaded
 * before a deployment registers it.
 */
export async function assertContentUploaded(hashes: string[]) {
  const uniqueHashes = new Set(hashes);
  const registered = await getExistingHashes(uniqueHashes);
  const unregistered = Array.from(uniqueHashes).filter(
    (hash) => !registered.has(hash),
  );
  let missingCount = 0;
  for (const batch of chunk(unregistered, HEAD_CONCURRENCY)) {
    const stored = await Promise.all(batch.map(checkContentStored));
    missingCount += stored.filter((isStored) => !isStored).length;
  }
  if (missingCount > 0) {
    throw boom(
      400,
      missingCount === 1
        ? "A file of this deployment was not uploaded. Upload every file in uploadFiles, then finalize the deployment."
        : `${missingCount} files of this deployment were not uploaded. Upload every file in uploadFiles, then finalize the deployment.`,
    );
  }
}
