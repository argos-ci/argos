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
 * Upper bound on the stored emoji length. A single emoji can be several code
 * points long (skin-tone modifiers, ZWJ sequences like 👨‍👩‍👧‍👦), so we allow
 * some room while still rejecting arbitrary text.
 */
const MAX_EMOJI_LENGTH = 64;

/**
 * Matches at least one pictographic code point. Anyone can craft a request
 * directly, so this guards against storing plain text or digits as a reaction.
 */
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

/**
 * Check that a value is a valid emoji that can be stored as a reaction.
 */
export function isValidEmoji(emoji: unknown): emoji is string {
  return (
    typeof emoji === "string" &&
    emoji.length > 0 &&
    emoji.length <= MAX_EMOJI_LENGTH &&
    EMOJI_REGEX.test(emoji)
  );
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
