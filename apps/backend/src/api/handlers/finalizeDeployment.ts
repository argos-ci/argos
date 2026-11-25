import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { Account, Project } from "@/database/models";
import { Deployment } from "@/database/models/Deployment";
import { DeploymentAlias } from "@/database/models/DeploymentAlias";
import { ProjectDomain } from "@/database/models/ProjectDomain";
import {
  checkLabelHeldByAnotherProject,
  ensureProductionInternalProjectDomain,
} from "@/database/services/project-domain";
import { pushDeploymentNotification } from "@/deployment-notification";
import { getDeploymentAliases } from "@/deployment/alias";
import { registerDeploymentContent } from "@/deployment/content";
import { invalidateDeploymentCache } from "@/deployment/invalidate";
import { trySendProjectEvent } from "@/event/send";
import { githubDeploymentJob } from "@/github-deployment/job";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { boom } from "@/util/error";

import { assertAuthCanDeploy } from "../auth/deployment";
import { assertAuthAttributes, findAuthProject } from "../auth/project";
import {
  DeploymentSchema,
  serializeDeployment,
} from "../schema/primitives/deployment";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { projectTokenAuth } from "../security";
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
 * Point the aliases of the deployment at it. Returns the aliases, and the
 * deployments that held them before.
 */
async function updateDeploymentAliases(input: {
  deployment: Deployment;
  project: Project;
  account: Account;
  projectDomains: ProjectDomain[];
}): Promise<{
  aliases: ReturnType<typeof getDeploymentAliases>;
  previousDeploymentIds: string[];
}> {
  const { deployment, project, account, projectDomains } = input;
  const candidates = getDeploymentAliases({
    accountSlug: account.slug,
    projectName: project.name,
    deployment,
    projectDomains,
  });
  // Branch aliases are built from names and cut to a length, so two projects
  // can derive the same one: the project that holds a hostname keeps it.
  // Domain aliases come from `project_domains`, which owns them already.
  const held = await Promise.all(
    candidates.map(
      (alias) =>
        alias.type === "branch" &&
        checkLabelHeldByAnotherProject({
          label: alias.alias,
          projectId: project.id,
        }),
    ),
  );
  const aliases = candidates.filter((_alias, index) => !held[index]);
  if (aliases.length === 0) {
    return { aliases, previousDeploymentIds: [] };
  }
  const previousAliases = await DeploymentAlias.query()
    .distinct("deploymentId")
    .whereIn(
      "alias",
      aliases.map((alias) => alias.alias),
    )
    .whereNot("deploymentId", deployment.id);
  const now = new Date().toISOString();
  await DeploymentAlias.query()
    .insert(
      aliases.map((alias) => ({
        alias: alias.alias,
        deploymentId: deployment.id,
        type: alias.type,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflict("alias")
    .merge({
      deploymentId: deployment.id,
      type: DeploymentAlias.raw(`excluded.type`),
      updatedAt: now,
    })
    // Another project may have taken a branch alias since the check above.
    .where((builder) =>
      builder
        .where(DeploymentAlias.raw(`excluded.type`), "domain")
        .orWhereExists(
          Deployment.query()
            .whereColumn("deployments.id", "deployment_aliases.deploymentId")
            .where("deployments.projectId", project.id),
        ),
    );

  return {
    aliases,
    previousDeploymentIds: previousAliases.map((alias) => alias.deploymentId),
  };
}

export const finalizeDeploymentOperation = {
  operationId: "finalizeDeployment",
  summary: "Finalize a deployment",
  description:
    "Mark a deployment as ready once all of its files have been uploaded. Argos assigns the deployment's aliases and starts serving it.",
  tags: ["Deployments"],
  security: projectTokenAuth(["deployments:write"]),
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
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const finalizeDeployment: CreateAPIHandler = ({ post }) => {
  return post("/deployments/{deploymentId}/finalize", async (req, res) => {
    const { deploymentId } = req.ctx.params;
    const [auth, initialDeployment] = await Promise.all([
      req.ctx.auth(),
      Deployment.query().findById(deploymentId),
    ]);
    let deployment = initialDeployment;
    if (!deployment) {
      throw boom(404, "Deployment not found");
    }

    const project = findAuthProject(auth, deployment.projectId);
    if (!project) {
      throw boom(401, "Unauthorized");
    }

    assertAuthAttributes(auth, { sha: deployment.commitSha });
    await assertAuthCanDeploy(auth, {
      project,
      environment: deployment.environment,
      branch: deployment.branch,
    });

    if (deployment.status !== "pending") {
      throw boom(400, "Deployment is not in pending status");
    }

    // Get all file hashes from this deployment
    const files = await getDeploymentFileHashes(deploymentId);

    await registerDeploymentContent(files);

    const [readyDeployment, projectWithAccount] = await Promise.all([
      // Update deployment status to ready
      deployment.$query().patchAndFetch({
        status: "ready",
      }),
      project.$fetchGraph("account"),
    ]);
    deployment = readyDeployment;

    const { account } = projectWithAccount;

    const isProduction = deployment.environment === "production";

    const projectDomains = isProduction
      ? await ensureProductionInternalProjectDomain({
          projectId: project.id,
          projectName: project.name,
        }).then(() =>
          ProjectDomain.query().where({
            projectId: project.id,
            environment: "production",
          }),
        )
      : [];

    const { aliases, previousDeploymentIds } = await updateDeploymentAliases({
      deployment,
      project,
      account,
      projectDomains,
    });

    await Promise.all([
      ...aliases.map((alias) =>
        invalidateDeploymentCache(alias.alias).catch(() => {
          // Non-blocking — best effort
        }),
      ),
      pushDeploymentNotification({
        deploymentId: deployment.id,
        type: "success",
      }),
      githubDeploymentJob.push(...previousDeploymentIds),
      trySendProjectEvent({
        name: "deployment.ready",
        deployment,
        project: projectWithAccount,
      }),
    ]);

    res.send(serializeDeployment(deployment));
  });
};
