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
 * Matches a string that is *exactly* one emoji and nothing else. `\p{RGI_Emoji}`
 * (requires the `v` flag) matches a whole recommended-for-interchange emoji,
 * including multi-code-point ones (skin-tone modifiers, ZWJ sequences like
 * 👨‍👩‍👧‍👦). Anchoring with `^…$` rejects embedded text such as "👍lgtm" and
 * multi-emoji strings, so only a single emoji can be stored as a reaction.
 */
const EMOJI_REGEX = /^\p{RGI_Emoji}$/v;

/**
 * Check that a value is a single emoji that can be stored as a reaction.
 */
export function isValidEmoji(emoji: unknown): emoji is string {
  return typeof emoji === "string" && EMOJI_REGEX.test(emoji);
}

/**
 * Group a flat list of reactions by emoji, preserving the order in which each
 * emoji was first used (callers pass reactions ordered by creation date).
 */
export function groupCommentReactions(
  reactions: CommentReaction[],
): CommentReactionGroup[] {
  const groups = new Map<string, CommentReactionGroup>();
  for (const reaction of reactions) {
    let group = groups.get(reaction.emoji);
    if (!group) {
      group = { emoji: reaction.emoji, userIds: [] };
      groups.set(reaction.emoji, group);
    }
    group.userIds.push(reaction.userId);
  }
  return Array.from(groups.values());
}
