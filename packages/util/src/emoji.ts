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
 * (1F44D FE0F) where 18 gives "👍" (1F44D). Such a sequence is not part of the
 * RGI set, so when dropping its variation selectors yields an RGI emoji, that
 * is the form returned. An RGI emoji that needs its selector, like "❤️", and a
 * value that is not an emoji are returned unchanged.
 */
export function normalizeEmoji(value: string): string {
  if (EMOJI_REGEX.test(value)) {
    return value;
  }
  const stripped = value.replaceAll(VARIATION_SELECTOR_16, "");
  return EMOJI_REGEX.test(stripped) ? stripped : value;
}

/**
 * Check that a value is a single emoji, once normalized by
 * {@link normalizeEmoji}.
 */
export function isValidEmoji(value: unknown): value is string {
  return typeof value === "string" && EMOJI_REGEX.test(normalizeEmoji(value));
}
