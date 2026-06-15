import type { JSONContent } from "@tiptap/core";

import { Account, Comment, CommentMention, Project } from "@/database/models";
import { getProjectMemberIds } from "@/project/members";

import { renderCommentHtml } from "./html";

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
  // `content` comes straight from an untrusted request body, so it may be any
  // shape — only recurse when it's actually an array of child nodes.
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      visit(child, ids);
    }
  }
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
    getProjectMemberIds(project).then((ids) => new Set(ids)),
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
 * Build the map used to render a comment's mentions, keyed by the account id
 * the `mention` nodes store and pointing at the display label to show after
 * `@`. Resolved from the persisted `comment_mentions` rows so it matches what
 * the frontend renders (only validated mentions get a name). Used server-side
 * when rendering a comment to HTML (e.g. notification emails).
 */
export async function getCommentMentionLabels(
  commentId: string,
): Promise<Map<string, string>> {
  const userIds = await getCommentMentionedUserIds(commentId);
  if (userIds.length === 0) {
    return new Map();
  }
  const accounts = await Account.query()
    .whereIn("userId", userIds)
    .select("id", "name", "slug");
  const labels = new Map<string, string>();
  for (const account of accounts) {
    labels.set(account.id, account.name || account.slug);
  }
  return labels;
}

/**
 * Render a stored comment to HTML with its persisted mentions resolved to their
 * current display labels. Combines the mention-label lookup and the HTML
 * rendering that every comment notification needs, so callers don't have to
 * repeat the two-step dance (or forget to pass the labels).
 */
export async function renderCommentHtmlWithMentions(
  comment: Comment,
): Promise<string> {
  const mentionLabels = await getCommentMentionLabels(comment.id);
  return renderCommentHtml(comment.content as JSONContent, { mentionLabels });
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
