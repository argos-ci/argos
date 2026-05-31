import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import {
  Account,
  Comment,
  CommentMention,
  Project,
  ProjectUser,
  TeamUser,
} from "@/database/models";

/**
 * Collect the ids carried by `mention` nodes in a comment document. The id is
 * the public GraphQL id of the mentioned user's personal account (what the
 * editor stores), not a database user id — see {@link resolveMentionedUserIds}.
 *
 * The value is treated as untrusted: it comes straight from the request body,
 * so callers must validate the resolved users against the mentionable set.
 */
export function extractMentionedAccountIds(content: unknown): string[] {
  const ids = new Set<string>();
  visit(content as JSONContent | null | undefined, ids);
  return [...ids];
}

function visit(node: JSONContent | null | undefined, ids: Set<string>): void {
  if (!node || typeof node !== "object") {
    return;
  }
  if (node.type === "mention") {
    const id = node.attrs?.["id"];
    if (typeof id === "string" && id.length > 0) {
      ids.add(id);
    }
  }
  for (const child of node.content ?? []) {
    visit(child, ids);
  }
}

/**
 * Get the database ids of every user who has at least "view" access to the
 * project, i.e. the users that may legitimately be mentioned in a comment on
 * one of its builds. Mirrors the "view" branch of {@link Project.getPermissions}.
 */
export async function getMentionableUserIds(
  project: Project,
): Promise<string[]> {
  await project.$fetchGraph("account", { skipFetched: true });
  invariant(project.account, "Project account not found");
  const { account } = project;

  // Personal project: only the owner can access it.
  if (account.type === "user") {
    return account.userId ? [account.userId] : [];
  }

  const { teamId } = account;
  invariant(teamId, "Team account without teamId");

  const teamUsers = await TeamUser.query()
    .where("teamId", teamId)
    .select("userId", "userLevel");

  const userIds = new Set<string>();
  const contributorIds: string[] = [];
  for (const teamUser of teamUsers) {
    if (teamUser.userLevel === "contributor") {
      contributorIds.push(teamUser.userId);
    } else {
      // Owners and members always have access.
      userIds.add(teamUser.userId);
    }
  }

  if (contributorIds.length > 0) {
    if (project.defaultUserLevel) {
      // Every contributor inherits at least the project's default level, which
      // always grants "view".
      contributorIds.forEach((id) => userIds.add(id));
    } else {
      // Otherwise only contributors with an explicit project-level access.
      const projectUsers = await ProjectUser.query()
        .where("projectId", project.id)
        .whereIn("userId", contributorIds)
        .whereNotNull("userLevel")
        .select("userId");
      projectUsers.forEach((projectUser) => userIds.add(projectUser.userId));
    }
  }

  return [...userIds];
}

/**
 * Resolve the mention ids stored in a comment to the database ids of users who
 * are actually allowed to be mentioned on the comment's project. Any mention
 * that doesn't resolve to a mentionable user (unknown id, a non-user account,
 * or someone without access) is silently dropped — this is the server-side
 * enforcement of "you can only mention members of the current team".
 */
async function resolveMentionedUserIds(input: {
  accountIds: string[];
  project: Project;
}): Promise<string[]> {
  const { accountIds, project } = input;
  if (accountIds.length === 0) {
    return [];
  }
  const [accounts, mentionableUserIds] = await Promise.all([
    Account.query()
      .findByIds(accountIds)
      .whereNotNull("userId")
      .select("userId"),
    getMentionableUserIds(project).then((ids) => new Set(ids)),
  ]);
  const userIds = new Set<string>();
  for (const account of accounts) {
    if (account.userId && mentionableUserIds.has(account.userId)) {
      userIds.add(account.userId);
    }
  }
  return [...userIds];
}

/**
 * Get the database ids of the users currently recorded as mentioned in a
 * comment.
 */
export async function getCommentMentionedUserIds(
  commentId: string,
): Promise<string[]> {
  const mentions = await CommentMention.query()
    .where({ commentId, type: "user" })
    .whereNotNull("mentionedUserId")
    .select("mentionedUserId");
  return mentions
    .map((mention) => mention.mentionedUserId)
    .filter((id): id is string => id != null);
}

/**
 * Reconcile the `comment_mentions` rows for a comment with the user mentions
 * found in its content, and return the database ids of the mentioned users.
 *
 * Used both on creation and on edit, so it inserts new mentions and removes
 * ones that no longer appear in the (edited) content.
 */
export async function syncCommentMentions(input: {
  comment: Comment;
  project: Project;
}): Promise<string[]> {
  const { comment, project } = input;

  const mentionedUserIds = await resolveMentionedUserIds({
    accountIds: extractMentionedAccountIds(comment.content),
    project,
  });

  const existing = await CommentMention.query()
    .where({ commentId: comment.id, type: "user" })
    .select("mentionedUserId");
  const existingIds = new Set(
    existing
      .map((mention) => mention.mentionedUserId)
      .filter((id): id is string => id != null),
  );
  const desiredIds = new Set(mentionedUserIds);

  const toInsert = mentionedUserIds.filter((id) => !existingIds.has(id));
  const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));

  await Promise.all([
    toInsert.length > 0
      ? CommentMention.query().insert(
          toInsert.map((mentionedUserId) => ({
            commentId: comment.id,
            type: "user" as const,
            mentionedUserId,
          })),
        )
      : null,
    toDelete.length > 0
      ? CommentMention.query()
          .delete()
          .where({ commentId: comment.id, type: "user" })
          .whereIn("mentionedUserId", toDelete)
      : null,
  ]);

  return mentionedUserIds;
}
