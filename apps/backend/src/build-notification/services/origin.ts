import type { OriginRepository } from "@/database/models";
import { postOriginComment } from "@/git-platform/origin";
// Imported from the modules rather than the `@/origin` barrel: the barrel
// re-exports the webhook events, which reach back into `@/build-notification`
// through `@/origin-pull-request` and close an import cycle.
import type { OriginApi } from "@/origin/api";
import { postOriginCheckRun } from "@/origin/check-run";
import { getInstallationOriginApi } from "@/origin/client";

import type { SendNotificationContext } from "../context";
import type { NotificationPayload } from "../notification";

export type SendOriginNotificationContext = SendNotificationContext & {
  api: OriginApi;
  originRepository: OriginRepository;
};

/**
 * Get a context for sending Cursor Origin notifications.
 */
export async function getOriginNotificationContext(
  ctx: SendNotificationContext,
): Promise<SendOriginNotificationContext | null> {
  const { project } = ctx;

  const { originRepository } = project;

  if (!originRepository) {
    return null;
  }

  const { installation } = originRepository;

  if (!installation || installation.deleted) {
    return null;
  }

  const api = await getInstallationOriginApi(installation);

  if (!api) {
    return null;
  }

  return { ...ctx, api, originRepository };
}

/**
 * Post the Origin pull request comment.
 */
export async function postOriginNotificationComment(
  ctx: SendOriginNotificationContext,
) {
  const { build, compareScreenshotBucket, api, originRepository } = ctx;

  if (!build.originPullRequestId) {
    return;
  }

  await postOriginComment({
    originPullRequestId: build.originPullRequestId,
    commit: compareScreenshotBucket.commit,
    api,
    owner: originRepository.ownerSlug,
    repo: originRepository.name,
  });
}

/**
 * Report the notification as a check run on the commit.
 */
export async function postOriginNotificationCheckRun(
  ctx: SendOriginNotificationContext,
  notification: NotificationPayload,
  identity: { externalId: string; startedAt: string | null },
) {
  const { commit, api, originRepository } = ctx;

  await postOriginCheckRun(api, {
    owner: originRepository.ownerSlug,
    repo: originRepository.name,
    sha: commit,
    context: notification.context,
    externalId: identity.externalId,
    status: notification.origin.status,
    conclusion: notification.origin.conclusion,
    description: notification.description,
    detailsUrl: notification.url,
    startedAt: identity.startedAt,
  });
}
