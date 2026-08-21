import { z } from "zod";

import { getPendingCommentBody } from "@/database";
import { OriginPullRequest, OriginRepository } from "@/database/models";
import parentLogger from "@/logger";
import {
  attachHeadBuildsToOriginPullRequest,
  getOrCreateOriginPullRequest,
  parseOriginPullRequestData,
} from "@/origin-pull-request";

import { OriginApiPullRequestSchema } from "./api";
import { getInstallationOriginApi } from "./client";
import { commentOriginPr } from "./comment";
import { upsertOriginInstallation } from "./synchronize";
import { originInstallationSyncJob } from "./synchronize-job";
import type { OriginWebhookDelivery } from "./webhook";

const InstallationEventPayloadSchema = z.object({
  installation: z.object({
    id: z.string(),
    target: z.object({ slug: z.string(), id: z.string() }),
    repoSelectionMode: z.enum(["all", "selected"]).default("all"),
    scopes: z.array(z.string()).default([]),
    deletedAt: z.string().optional(),
  }),
});

const PullRequestEventPayloadSchema = z.object({
  pullRequest: OriginApiPullRequestSchema,
  repository: z.object({
    id: z.string(),
    name: z.string().optional(),
    owner: z.object({ slug: z.string(), id: z.string() }).optional(),
  }),
});

const PULL_REQUEST_EVENTS = new Set([
  "pull_request.created",
  "pull_request.reopened",
  "pull_request.head_ref.pushed",
  "pull_request.base_ref.updated",
  "pull_request.metadata.updated",
  "pull_request.closed",
  "pull_request.merged",
  "pull_request.published",
]);

/**
 * Handle a verified webhook delivery from Origin.
 */
export async function handleOriginEvent(delivery: OriginWebhookDelivery) {
  const { type, payload } = delivery.event;
  const logger = parentLogger.child({ module: "origin-event", type });

  switch (type) {
    case "installation.created":
    case "installation.updated": {
      const { installation } = InstallationEventPayloadSchema.parse(payload);
      const local = await upsertOriginInstallation({
        ...installation,
        deleted: false,
      });
      await originInstallationSyncJob.push(local.id);
      return;
    }
    case "installation.deleted": {
      const { installation } = InstallationEventPayloadSchema.parse(payload);
      const local = await upsertOriginInstallation({
        ...installation,
        deleted: true,
      });
      await originInstallationSyncJob.push(local.id);
      return;
    }
    default: {
      if (PULL_REQUEST_EVENTS.has(type)) {
        await handlePullRequestEvent(type, payload);
        return;
      }
      logger.info("Ignored Origin event");
    }
  }
}

async function handlePullRequestEvent(type: string, payload: unknown) {
  const { pullRequest: data, repository: repositoryRef } =
    PullRequestEventPayloadSchema.parse(payload);

  const repository = await OriginRepository.query().findOne({
    originId: repositoryRef.id,
  });

  if (!repository) {
    return;
  }

  // Opening is the one case where Argos has no row yet; every other event
  // bails below when it finds none. Through `getOrCreateOriginPullRequest` so a
  // concurrent build upload resolves to the same row, and the fetch job still
  // runs for whatever the payload does not carry.
  if (type === "pull_request.created" || type === "pull_request.reopened") {
    const opened = await getOrCreateOriginPullRequest({
      originRepositoryId: repository.id,
      number: data.number,
    });
    const updated = await opened
      .$clone()
      .$query()
      .patchAndFetch(parseOriginPullRequestData(data));
    await attachHeadBuildsToOriginPullRequest(updated, data.head.sha);
    return;
  }

  const pullRequest = await OriginPullRequest.query().findOne({
    originRepositoryId: repository.id,
    number: data.number,
  });

  if (!pullRequest) {
    return;
  }

  await pullRequest.$clone().$query().patch(parseOriginPullRequestData(data));

  // New commits on the head: the comment lists builds of the previous commit,
  // tell readers a build is coming, as GitHub's `synchronize` does.
  if (type === "pull_request.head_ref.pushed" && pullRequest.commentId) {
    await repository.$fetchGraph("installation");
    const { installation } = repository;
    if (!installation || installation.deleted) {
      return;
    }
    const api = await getInstallationOriginApi(installation);
    if (!api) {
      return;
    }
    await commentOriginPr({
      owner: repository.ownerSlug,
      repo: repository.name,
      api,
      body: getPendingCommentBody(),
      pullRequestId: pullRequest.id,
    });
  }
}
