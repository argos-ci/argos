/**
 * Minimal typing of the Discord embed subset we produce.
 * @see https://discord.com/developers/docs/resources/message#embed-object
 */

export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  author?: { name: string };
  fields?: DiscordEmbedField[];
  footer?: { text: string };
};

/**
 * Body expected by `POST /api/webhooks/:id/:token`.
 *
 * `username` overrides the name the webhook was created with, so the message
 * reads as coming from Argos whatever the user called the webhook in Discord.
 */
export type DiscordWebhookMessage = {
  username: string;
  embeds: DiscordEmbed[];
};

/**
 * Colour of the embed's left border. Radix `violet-9`, the Argos accent.
 * Discord takes it as a decimal integer, not a CSS string.
 */
export const EMBED_COLOR = 0x6e56cf;

/**
 * Per-field length limits Discord enforces.
 *
 * Going over any of them fails the *whole* request with a 400, so a long PR
 * title would silently stop notifications rather than being trimmed.
 * @see https://discord.com/developers/docs/resources/message#embed-object-embed-limits
 */
export const EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  authorName: 256,
  footerText: 2048,
} as const;

/**
 * Wrap an embed into the message body expected by a Discord webhook.
 */
export function buildWebhookMessage(
  embed: DiscordEmbed,
): DiscordWebhookMessage {
  return { username: "Argos", embeds: [embed] };
}

/**
 * Clamp text to `maxLength`, marking the cut with an ellipsis.
 *
 * Apply it to raw labels, before escaping or wrapping them in a link: cutting
 * rendered Markdown would leave a dangling `[` or a truncated href.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

/**
 * Escape text interpolated into an embed description or field value.
 *
 * Those render Markdown, so user-controlled text (project names, branches, PR
 * titles) must not be able to inject emphasis, spoilers or links.
 *
 * Only the characters that are meaningful *inline* are escaped. Block-level
 * markers (`#`, `-`, `>`) are left alone: they are inert mid-line, and escaping
 * them would surface literal backslashes in common text like `#99`.
 */
export function escapeDiscordText(text: string): string {
  return text.replace(/([\\`*_~[\]|])/g, "\\$1");
}

/**
 * Build a Markdown link for use in a description or field value, escaping the
 * label.
 *
 * Embed titles, author names and footers render as plain text — a link there
 * has to go through the embed's own `url` field instead.
 *
 * Parentheses in the destination are percent-encoded: Git allows `(` and `)` in
 * branch names, and a raw `)` would close the link early, truncating the href
 * and spilling the rest as literal text.
 */
export function link(label: string, url: string): string {
  const safeUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${escapeDiscordText(label)}](${safeUrl})`;
}
