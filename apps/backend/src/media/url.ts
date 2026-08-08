import config from "@/config";

/**
 * The share page URL for a media, the one that gets embedded in a pull request.
 *
 * Keyed on the unguessable share token rather than the row id: a public share URL
 * must not expose a sequential identifier, and the token can be rotated without
 * re-uploading the bytes.
 */
export function getMediaShareUrl(shareToken: string): string {
  return new URL(`/m/${shareToken}`, config.get("server.url")).href;
}

/**
 * Markdown ready to paste into a pull request comment.
 *
 * Images embed directly. Videos embed their **poster frame** wrapped in a link to
 * the share page, because GitHub only renders an inline video player for media it
 * hosts itself — an `<video>` tag or a bare `.mp4` link pointing at Argos would
 * render as a dead link. A video whose poster hasn't been extracted yet
 * degrades to a plain link rather than an image that 404s.
 */
export function getMediaMarkdown(args: {
  name: string;
  shareUrl: string;
  posterUrl: string | null;
  isVideo: boolean;
}): string {
  const { name, shareUrl, posterUrl, isVideo } = args;
  const alt = escapeMarkdownText(name);

  if (!isVideo) {
    return `![${alt}](${shareUrl})`;
  }

  if (posterUrl) {
    return `[![${alt}](${posterUrl})](${shareUrl})`;
  }

  return `[▶ ${alt}](${shareUrl})`;
}

/**
 * Escape the characters that would break out of a Markdown link label. File names
 * are caller-controlled, and `]` alone is enough to truncate the label and leak
 * the rest as body text.
 */
function escapeMarkdownText(value: string): string {
  return value.replace(/([[\]\\])/g, "\\$1");
}
