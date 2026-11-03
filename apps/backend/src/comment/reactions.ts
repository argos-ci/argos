import { normalizeEmoji } from "@argos/util/emoji";

import type { CommentReaction } from "@/database/models";

/**
 * Reactions of a single emoji on a comment, with the list of users who reacted
 * with it. This is the shape exposed by the `Comment.reactions` GraphQL field.
 */
export type CommentReactionGroup = {
  emoji: string;
  userIds: string[];
};

/**
 * Group a flat list of reactions by emoji, preserving the order in which each
 * emoji was first used (callers pass reactions ordered by creation date).
 *
 * Spellings of the same emoji are merged, and a user who reacted with both
 * counts once: the migration that normalized reactions runs before the
 * rollout, so rows the previous release wrote in between keep the emojibase 17
 * spelling ("👍️").
 */
export function groupCommentReactions(
  reactions: CommentReaction[],
): CommentReactionGroup[] {
  const groups = new Map<string, CommentReactionGroup>();
  for (const reaction of reactions) {
    const emoji = normalizeEmoji(reaction.emoji);
    let group = groups.get(emoji);
    if (!group) {
      group = { emoji, userIds: [] };
      groups.set(emoji, group);
    }
    if (!group.userIds.includes(reaction.userId)) {
      group.userIds.push(reaction.userId);
    }
  }
  return Array.from(groups.values());
}
