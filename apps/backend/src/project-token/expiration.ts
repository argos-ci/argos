import { PROJECT_TOKEN_EXPIRY_WARNING_MS } from "@argos/schemas/project-token";
import { invariant } from "@argos/util/invariant";

import { ProjectToken } from "@/database/models";
import { getProjectTokenProjects } from "@/database/services/project-token";
import logger from "@/logger";
import { sendNotification } from "@/notification";

/**
 * Email the administrators of an account about each of its tokens that expires
 * within the warning window, once per token: CI fails as soon as the token
 * expires, and nothing else tells them beforehand.
 */
export async function warnExpiringProjectTokens(now: Date) {
  const tokens = await ProjectToken.query()
    .select("id")
    .whereNull("expiryWarnedAt")
    .where("expireAt", ">", now.toISOString())
    .where(
      "expireAt",
      "<=",
      new Date(now.getTime() + PROJECT_TOKEN_EXPIRY_WARNING_MS).toISOString(),
    )
    .orderBy("expireAt");

  for (const { id } of tokens) {
    try {
      await warnExpiringProjectToken({ id, now });
    } catch (error) {
      logger.error(
        { error, projectTokenId: id },
        "Failed to warn about an expiring project token",
      );
    }
  }
}

async function warnExpiringProjectToken(args: { id: string; now: Date }) {
  const { id, now } = args;
  // Only the run that sets the flag sends: a concurrent one updates nothing.
  const [projectToken] = await ProjectToken.query()
    .patch({ expiryWarnedAt: now.toISOString() })
    .where("id", id)
    .whereNull("expiryWarnedAt")
    .returning("*");
  if (!projectToken) {
    return;
  }

  try {
    await notifyExpiringProjectToken(projectToken);
  } catch (error) {
    // Released so the next run tries again. A transaction around the send
    // would deadlock a busy pool instead: it holds a connection while
    // `sendNotification` opens another.
    await ProjectToken.query().findById(id).patch({ expiryWarnedAt: null });
    throw error;
  }
}

async function notifyExpiringProjectToken(projectToken: ProjectToken) {
  invariant(projectToken.expireAt, "An expiring token has an expireAt");
  const [account, projects] = await Promise.all([
    projectToken.$relatedQuery("account"),
    getProjectTokenProjects(projectToken),
  ]);
  invariant(account, "Project token account not found");

  // A token that reaches no project anymore breaks no CI.
  if (projects.length === 0) {
    return;
  }

  await sendNotification({
    type: "project_token_expiration",
    data: {
      accountSlug: account.slug,
      tokenName: projectToken.name,
      projectNames: projects.map((project) => project.name),
      expireAt: new Date(projectToken.expireAt).toISOString(),
    },
    recipients: await account.$getOwnerIds(),
  });
}
