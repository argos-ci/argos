const EMOJI_REGEX = /^\p{RGI_Emoji}$/v;
const VARIATION_SELECTOR_16 = "\u{FE0F}";

/**
 * Emojibase 18 no longer appends a variation selector (U+FE0F) to emoji that
 * already have emoji presentation, so the picker sends "👍" where it sent
 * "👍️". Reactions are now stored in the form `normalizeEmoji`
 * (`@argos/util/emoji`) gives; rewrite the existing rows to match. A user who
 * reacted with both spellings keeps the normalized row.
 *
 * The normalization is copied rather than imported, so this migration keeps
 * doing what it did when it ran.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  const rows = await knex("comment_reactions")
    .distinct("emoji")
    .whereRaw("strpos(emoji, ?) > 0", [VARIATION_SELECTOR_16]);

  for (const { emoji } of rows) {
    if (EMOJI_REGEX.test(emoji)) {
      continue;
    }
    const normalized = emoji.replaceAll(VARIATION_SELECTOR_16, "");
    if (!EMOJI_REGEX.test(normalized)) {
      continue;
    }
    await knex.raw(
      `DELETE FROM comment_reactions legacy
      USING comment_reactions normalized
      WHERE legacy.emoji = ?
        AND normalized.emoji = ?
        AND normalized."commentId" = legacy."commentId"
        AND normalized."userId" = legacy."userId"`,
      [emoji, normalized],
    );
    await knex("comment_reactions")
      .where({ emoji })
      .update({ emoji: normalized });
  }
};

/**
 * Both spellings name the same emoji, and the normalized one is what the app
 * stores, so there is nothing to put back.
 */
export const down = async () => {};
