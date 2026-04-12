import { invariant } from "@argos/util/invariant";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import config from "@/config";
import { Deployment } from "@/database/models/Deployment";
import { generateDeploymentSlug } from "@/deployment/slug";
import { getOrCreatePullRequest } from "@/github-pull-request/create";
import { getDynamoDBClient, getTableName } from "@/storage/dynamodb";
import { getS3Client } from "@/storage/s3";
import { boom } from "@/util/error";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import { GitBranchSchema, GitPRNumberSchema } from "../schema/primitives/git";
import { Sha1HashSchema, Sha256HashSchema } from "../schema/primitives/sha";
import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const FileEntrySchema = z.object({
  path: z.string().min(1),
  hash: Sha256HashSchema,
  size: z.number().int().positive(),
  contentType: z.string().min(1),
});

const RequestBodySchema = z.object({
  commit: Sha1HashSchema.meta({ description: "The commit SHA" }),
  branch: GitBranchSchema.meta({ description: "The branch name" }),
  prNumber: GitPRNumberSchema.nullish().meta({
    description: "The pull request number",
  }),
  environment: z
    .enum(["preview", "production"])
    .default("preview")
    .meta({ description: "The deployment environment" }),
  files: z
    .array(FileEntrySchema)
    .min(1)
    .meta({ description: "List of files to deploy" }),
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
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

/**
 * Batch check which hashes already exist in the files table.
 */
async function getExistingHashes(hashes: Set<string>): Promise<Set<string>> {
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

  const results = await Promise.all(
    batches.map((batch) =>
      dynamo.send(
        new BatchGetCommand({
          RequestItems: {
            [tableName]: {
              Keys: batch.map((hash) => ({ content_hash: hash })),
              ProjectionExpression: "content_hash",
            },
          },
        }),
      ),
    ),
  );

  for (const result of results) {
    const responses = result.Responses?.[tableName] ?? [];
    for (const item of responses) {
      existing.add(item["content_hash"] as string);
    }
  }

  return existing;
}

/**
 * Write file entries to the deployment_files DynamoDB table.
 */
async function writeDeploymentFiles(
  deploymentId: string,
  files: z.infer<typeof FileEntrySchema>[],
) {
  const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  const dynamo = getDynamoDBClient();
  const tableName = getTableName("deployment_files");

  // DynamoDB BatchWriteItem supports max 25 items per request
  const batchSize = 25;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((file) => ({
            PutRequest: {
              Item: {
                deployment_id: deploymentId,
                path: file.path,
                content_hash: file.hash,
                content_type: file.contentType,
              },
            },
          })),
        },
      }),
    );
  }
}

export const createDeployment: CreateAPIHandler = ({ post }) => {
  return post("/deployments", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);
    const body = req.ctx.body;

    if (!body) {
      throw boom(400, "Request body is required");
    }

    const project = auth.project;

    const [pullRequest] = await Promise.all([
      body.prNumber && project.githubRepositoryId
        ? await getOrCreatePullRequest({
            githubRepositoryId: project.githubRepositoryId,
            number: body.prNumber,
          })
        : null,
      project.$fetchGraph("account"),
    ]);

    invariant(project.account, "Account relation is not loaded");

    // Create the deployment row in PostgreSQL
    const deployment = await Deployment.query().insertAndFetch({
      projectId: project.id,
      status: "pending",
      environment: body.environment,
      branch: body.branch,
      commitSha: body.commit,
      slug: generateDeploymentSlug({
        accountSlug: project.account.slug,
        projectName: project.name,
      }),
      githubPullRequestId: pullRequest?.id ?? null,
    });

    // Insert all files into DynamoDB deployment_files table
    await writeDeploymentFiles(deployment.id, body.files);

    // Check which files already exist in the files table
    const uniqueHashes = new Set(body.files.map((f) => f.hash));
    const existingHashes = await getExistingHashes(uniqueHashes);

    // Deduplicate by hash for upload URLs
    const seenHashes = new Set<string>();
    const filesToUpload = body.files.filter((f) => {
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
          Key: `content/${file.hash}`,
          ContentType: file.contentType,
          CacheControl: "public, max-age=31536000, immutable",
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
