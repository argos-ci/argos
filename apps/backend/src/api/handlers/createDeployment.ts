import {
  DeploymentEnvironmentSchema,
  type DeploymentEnvironment,
} from "@argos/schemas/deployment";
import { invariant } from "@argos/util/invariant";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import pRetry from "p-retry";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import config from "@/config";
import type { Project } from "@/database/models";
import { Deployment } from "@/database/models/Deployment";
import { pushDeploymentNotification } from "@/deployment-notification";
import {
  getDeploymentContentKey,
  getExistingHashes,
} from "@/deployment/content";
import { generateDeploymentSlug } from "@/deployment/slug";
import { trySendProjectEvent } from "@/event/send";
import { getOrCreatePullRequest } from "@/github-pull-request/create";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { getS3Client } from "@/storage/s3";
import { boom } from "@/util/error";

import { assertAuthCanDeploy } from "../auth/deployment";
import { assertAuthPrHeadCommit } from "../auth/pr-head-commit";
import { assertAuthAttributes, resolveAuthProject } from "../auth/project";
import { GitBranchSchema, GitPRNumberSchema } from "../schema/primitives/git";
import { TokenProjectPath } from "../schema/primitives/project";
import { Sha1HashSchema, Sha256HashSchema } from "../schema/primitives/sha";
import {
  forbidden,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { projectTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const FileEntrySchema = z.object({
  path: z.string().min(1),
  hash: Sha256HashSchema,
  size: z.number().int().positive(),
  contentType: z.string().min(1),
});

const RequestBodySchema = z.object({
  project: TokenProjectPath,
  commit: Sha1HashSchema.meta({ description: "The commit SHA" }),
  branch: GitBranchSchema.meta({ description: "The branch name" }),
  prNumber: GitPRNumberSchema.nullish().meta({
    description: "The pull request number",
  }),
  prHeadCommit: Sha1HashSchema.nullish().meta({
    description:
      "The head commit of the pull request. When `commit` is a merge commit built for the pull request, such as the test-merge commit GitHub Actions checks out, the deployment status is reported on this commit, where the pull request shows it.",
  }),
  environment: DeploymentEnvironmentSchema.optional().meta({
    description:
      "The deployment environment. When omitted, it is inferred from `branch`: branches matching the configured production-branch glob are treated as `production`; all others default to `preview`.",
  }),
  files: z.array(FileEntrySchema).min(1).optional().meta({
    description:
      "The files Argos hosts and serves. Required unless `url` is set.",
  }),
  url: z.httpUrl({ normalize: true }).max(2048).optional().meta({
    description:
      "The URL of a deployment hosted elsewhere, such as a Vercel or Netlify preview. The deployment is created `ready`, and the builds of the same commit link their screenshots to it. Required unless `files` is set.",
  }),
});

const UploadFileSchema = z.object({
  path: z.string(),
  hash: z.string(),
  uploadUrl: z.url(),
});

const ResponseSchema = z.object({
  deploymentId: z.string(),
  uploadFiles: z.array(UploadFileSchema),
});

export const createDeploymentOperation = {
  operationId: "createDeployment",
  summary: "Create a deployment",
  description:
    "Create a deployment hosted by Argos, or report one hosted elsewhere.\n\nWith `files`, Argos returns signed upload URLs for the files it doesn't already store. Files already present (matched by content hash) are reused and omitted from `uploadFiles`. Finalize the deployment once they are uploaded.\n\nWith `url`, the deployment is ready at once and `uploadFiles` is empty.\n\nThe environment is inferred from the branch when omitted.",
  tags: ["Deployments"],
  security: projectTokenAuth(["deployments:write"]),
  requestBody: {
    content: {
      "application/json": {
        schema: RequestBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Deployment created",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

/**
 * Write file entries to the deployment_files DynamoDB table.
 */
async function writeDeploymentFiles(
  deploymentId: string,
  files: z.infer<typeof FileEntrySchema>[],
) {
  const dynamo = getDynamoDBClient();
  const tableName = getTableName("deployment_files");

  // DynamoDB BatchWriteItem supports max 25 items per request
  const batchSize = 25;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    let requests = batch.map((file) => ({
      PutRequest: {
        Item: {
          deployment_id: deploymentId,
          path: file.path,
          content_hash: file.hash,
          content_type: file.contentType,
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
              `DynamoDB returned ${requests.length} unprocessed deployment files`,
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
        `Failed to persist deployment files after retries (${requests.length} unprocessed items remain)`,
      );
    }
  }
}

export const createDeployment: CreateAPIHandler = ({ post }) => {
  return post("/deployments", async (req, res) => {
    const body = req.ctx.body;

    if (!body) {
      throw boom(400, "Request body is required");
    }

    const { files, url } = body;

    if (files && url) {
      throw boom(
        400,
        "`files` and `url` can't be used together. Send `files` to deploy on Argos, or `url` for a deployment hosted elsewhere.",
      );
    }

    if (!files && !url) {
      throw boom(
        400,
        "`files` or `url` is required. Send `files` to deploy on Argos, or `url` for a deployment hosted elsewhere.",
      );
    }

    const auth = await req.ctx.auth();
    assertAuthAttributes(auth, { sha: body.commit });

    const project = await resolveAuthProject(auth, body.project);
    await assertAuthPrHeadCommit(auth, {
      project,
      prHeadCommit: body.prHeadCommit,
    });

    const branch = body.branch;
    const environment =
      body.environment ??
      (await getEnvironmentFromBranch({
        project,
        branch,
      }));

    await assertAuthCanDeploy(auth, { project, environment, branch });

    const [pullRequest, projectWithAccount] = await Promise.all([
      body.prNumber && project.githubRepositoryId
        ? await getOrCreatePullRequest({
            githubRepositoryId: project.githubRepositoryId,
            number: body.prNumber,
          })
        : null,
      project.$fetchGraph("account"),
    ]);

    const deploymentData = {
      projectId: project.id,
      environment,
      branch,
      commitSha: body.commit,
      prHeadCommit: body.prHeadCommit ?? null,
      githubPullRequestId: pullRequest?.id ?? null,
      authSource: auth.source,
    };

    if (url) {
      const deployment = await Deployment.query().insertAndFetch({
        ...deploymentData,
        status: "ready",
        externalUrl: url,
        slug: null,
      });

      await Promise.all([
        pushDeploymentNotification({
          deploymentId: deployment.id,
          type: "success",
        }),
        trySendProjectEvent({
          name: "deployment.created",
          deployment,
          project: projectWithAccount,
        }).then(() =>
          trySendProjectEvent({
            name: "deployment.ready",
            deployment,
            project: projectWithAccount,
          }),
        ),
      ]);

      res.status(201).send({ deploymentId: deployment.id, uploadFiles: [] });
      return;
    }

    invariant(files, "`files` is set when `url` is not");

    // Create the deployment row in PostgreSQL
    const deployment = await Deployment.query().insertAndFetch({
      ...deploymentData,
      status: "pending",
      slug: generateDeploymentSlug({
        accountSlug: projectWithAccount.account.slug,
        projectName: project.name,
      }),
      externalUrl: null,
    });

    await Promise.all([
      // Mark the deployment as in progress
      pushDeploymentNotification({
        deploymentId: deployment.id,
        type: "progress",
      }),
      trySendProjectEvent({
        name: "deployment.created",
        deployment,
        project: projectWithAccount,
      }),
      // Insert all files into DynamoDB deployment_files table
      writeDeploymentFiles(deployment.id, files),
    ]);

    // Check which files already exist in the files table
    const uniqueHashes = new Set(files.map((f) => f.hash));
    const existingHashes = await getExistingHashes(uniqueHashes);

    // Deduplicate by hash for upload URLs
    const seenHashes = new Set<string>();
    const filesToUpload = files.filter((f) => {
      if (existingHashes.has(f.hash)) {
        return false;
      }
      if (seenHashes.has(f.hash)) {
        return false;
      }
      seenHashes.add(f.hash);
      return true;
    });

    const s3 = getS3Client("us-east-1");
    const bucketName = config.get("deployments.bucketName");

    const uploadFiles = await Promise.all(
      filesToUpload.map(async (file) => {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: getDeploymentContentKey(file.hash),
          ContentType: file.contentType,
        });
        const uploadUrl = await getSignedUrl(s3, command, {
          expiresIn: 1800, // 30 minutes
        });
        return {
          path: file.path,
          hash: file.hash,
          uploadUrl,
        };
      }),
    );

    res.status(201).send({
      deploymentId: deployment.id,
      uploadFiles,
    });
  });
};

/**
 * Get the default environment from the branch.
 */
async function getEnvironmentFromBranch(args: {
  project: Project;
  branch: string;
}): Promise<DeploymentEnvironment> {
  const { project, branch } = args;
  const isProductionBranch =
    await project.$getDeploymentProductionBranchMatcher();
  return isProductionBranch(branch) ? "production" : "preview";
}
