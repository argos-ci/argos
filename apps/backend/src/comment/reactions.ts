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

/** Variation Selector-16 (U+FE0F), which requests emoji (vs. text) presentation. */
const VARIATION_SELECTOR_16 = String.fromCodePoint(0xfe0f);

/**
 * Check that a value is a single emoji that can be stored as a reaction.
 *
 * Some emoji sources (e.g. emojibase) "fully-qualify" emoji by appending a
 * VS16 variation selector (U+FE0F) even when the base code point already has
 * emoji presentation — e.g. "✅️" instead of "✅". Those sequences are not
 * part of the RGI set, so we also accept a string that becomes a valid single
 * emoji once such variation selectors are dropped. We only validate here and
 * never mutate the value, so whatever the client sent is stored verbatim.
 */
export function isValidEmoji(emoji: unknown): emoji is string {
  if (typeof emoji !== "string") {
    return false;
  }
  return (
    EMOJI_REGEX.test(emoji) ||
    EMOJI_REGEX.test(emoji.split(VARIATION_SELECTOR_16).join(""))
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
