/**
 * Matches a string that is *exactly* one emoji and nothing else. `\p{RGI_Emoji}`
 * (requires the `v` flag) matches a whole recommended-for-interchange emoji,
 * including multi-code-point ones (skin-tone modifiers, ZWJ sequences like
 * 👨‍👩‍👧‍👦). Anchoring with `^…$` rejects embedded text such as "👍lgtm" and
 * multi-emoji strings.
 *
 * Built with the constructor because the frontend type-checks against ES2016,
 * which rejects the `v` flag on a literal.
 */
const EMOJI_REGEX = new RegExp(String.raw`^\p{RGI_Emoji}$`, "v");

/** Variation Selector-16 (U+FE0F), which requests emoji (vs. text) presentation. */
const VARIATION_SELECTOR_16 = "\u{FE0F}";

/**
 * Bring an emoji to a single form, so that two spellings of the same emoji
 * compare equal.
 *
 * Some emoji sources "fully-qualify" emoji by appending VS16 (U+FE0F) even when
 * the base code point already has emoji presentation — emojibase 17 gave "👍️"
 * (1F44D FE0F) where 18 gives "👍" (1F44D). Selectors are only dropped when
 * that yields an RGI emoji: "❤️" needs its selector and keeps it.
 */
export function normalizeEmoji(value: string): string {
  if (EMOJI_REGEX.test(value)) {
    return value;
  }
  const stripped = value.replaceAll(VARIATION_SELECTOR_16, "");
  return EMOJI_REGEX.test(stripped) ? stripped : value;
}

/**
 * The {@link normalizeEmoji | normalized} form of a value that is a single
 * emoji, or null when it is not one.
 */
export function parseEmoji(value: string): string | null {
  const emoji = normalizeEmoji(value);
  return EMOJI_REGEX.test(emoji) ? emoji : null;
}
