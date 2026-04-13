import { invariant } from "@argos/util/invariant";
import { BatchWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { Account, Project } from "@/database/models";
import { Deployment } from "@/database/models/Deployment";
import { DeploymentAlias } from "@/database/models/DeploymentAlias";
import {
  findInternalDeploymentAlias,
  getDeploymentAliases,
} from "@/deployment/alias";
import { postDeploymentCommitStatus } from "@/deployment/github-status";
import { invalidateDeploymentCache } from "@/deployment/invalidate";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { boom } from "@/util/error";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import {
  DeploymentSchema,
  serializeDeployment,
} from "../schema/primitives/deployment";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

/**
 * Fetch all file hashes from the deployment_files table for a given deployment.
 */
async function getDeploymentFileHashes(
  deploymentId: string,
): Promise<{ content_hash: string; content_type: string; path: string }[]> {
  const dynamo = getDynamoDBClient();
  const tableName = getTableName("deployment_files");
  const items: {
    content_hash: string;
    content_type: string;
    path: string;
  }[] = [];

  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "deployment_id = :did",
        ExpressionAttributeValues: { ":did": deploymentId },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(
        item as {
          content_hash: string;
          content_type: string;
          path: string;
        },
      );
    }
    exclusiveStartKey = result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

/**
 * Register file hashes in the files table so future deployments can skip them.
 */
async function registerFileHashes(
  files: { content_hash: string; content_type: string }[],
) {
  const dynamo = getDynamoDBClient();
  const tableName = getTableName("files");

  // Deduplicate by content_hash
  const seen = new Set<string>();
  const unique = files.filter((f) => {
    if (seen.has(f.content_hash)) {
      return false;
    }
    seen.add(f.content_hash);
    return true;
  });

  // DynamoDB BatchWriteItem supports max 25 items per request
  const batchSize = 25;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((file) => ({
            PutRequest: {
              Item: {
                content_hash: file.content_hash,
                s3_key: `content/${file.content_hash}`,
                content_type: file.content_type,
                created_at: new Date().toISOString(),
              },
            },
          })),
        },
      }),
    );
  }
}

/**
 * Update the deployment_aliases table with the current deployment.
 * Returns the aliases.
 */
async function updateDeploymentAliases(input: {
  deployment: Deployment;
  project: Project;
  account: Account;
}): Promise<ReturnType<typeof getDeploymentAliases>> {
  const { deployment, project, account } = input;
  const aliases = getDeploymentAliases({
    accountSlug: account.slug,
    projectName: project.name,
    deployment,
  });
  const internalAlias = findInternalDeploymentAlias(aliases);
  if (internalAlias) {
    throw boom(
      400,
      `Deployment alias "${internalAlias.alias}" is reserved for internal use`,
    );
  }
  const now = new Date().toISOString();
  await DeploymentAlias.query()
    .insert(
      aliases.map((alias) => ({
        alias: alias.alias,
        deploymentId: deployment.id,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflict("alias")
    .merge({
      deploymentId: deployment.id,
      updatedAt: now,
    });

  return aliases;
}

export const finalizeDeploymentOperation = {
  operationId: "finalizeDeployment",
  requestParams: {
    path: z.object({
      deploymentId: z.string().meta({ description: "The deployment ID" }),
    }),
  },
  responses: {
    "200": {
      description: "Deployment finalized",
      content: {
        "application/json": {
          schema: DeploymentSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const finalizeDeployment: CreateAPIHandler = ({ post }) => {
  return post("/deployments/{deploymentId}/finalize", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);
    const { project } = auth;
    const { deploymentId } = req.ctx.params;

    const deployment = await Deployment.query().findById(deploymentId);
    if (!deployment) {
      throw boom(404, "Deployment not found");
    }

    if (deployment.projectId !== auth.project.id) {
      throw boom(401, "Unauthorized");
    }

    if (deployment.status !== "pending") {
      throw boom(400, "Deployment is not in pending status");
    }

    // Get all file hashes from this deployment
    const files = await getDeploymentFileHashes(deploymentId);

    // Register hashes into the files table for deduplication
    await registerFileHashes(files);

    await Promise.all([
      // Update deployment status to ready
      Deployment.query().findById(deploymentId).patch({
        status: "ready",
      }),
      project.$fetchGraph("account"),
    ]);

    const { account } = project;
    invariant(account, "Account relation not fetched");

    // If production, update the project_deployments table
    const aliases = await updateDeploymentAliases({
      deployment,
      project,
      account,
    });

    await Promise.all(
      aliases.map((alias) =>
        invalidateDeploymentCache(alias.alias).catch(() => {
          // Non-blocking — best effort
        }),
      ),
    );

    // Post GitHub commit status
    await postDeploymentCommitStatus({
      project: auth.project,
      deployment: {
        commitSha: deployment.commitSha,
        status: "ready" as const,
        url: deployment.url,
      },
    }).catch(() => {
      // Non-blocking — best effort
    });

    res.send(serializeDeployment(deployment));
  });
};
