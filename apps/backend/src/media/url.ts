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

/** What embedding a media in Markdown needs to know about it. */
export type MediaEmbedArgs = {
  name: string;
  shareUrl: string;
  /**
   * CDN URL of the bytes. This — never the share URL — is what an image embed
   * points at: the share URL is an HTML page, and `![](page)` renders as a
   * broken image everywhere it is pasted.
   */
  fileUrl: string;
  posterUrl: string | null;
  isVideo: boolean;
};

/**
 * Markdown ready to paste into a pull request comment.
 *
 * A picture wrapped in a link to the share page: the embed shows the media
 * inline, and clicking it lands on the page where it can be compared, versioned
 * and commented on.
 *
 * The picture is the file itself for an image, and the **poster frame** for a
 * video — GitHub only renders an inline player for media it hosts itself, so a
 * `<video>` tag or a bare `.mp4` link pointing at Argos renders as a dead link.
 * Both come from the image CDN, which serves them unauthenticated: GitHub
 * fetches embedded images server-side through its camo proxy, carrying no
 * session of ours, so an embed that needed one could not render at all.
 *
 * A video whose poster hasn't been extracted yet degrades to a plain link rather
 * than an image that 404s.
 */
export function getMediaMarkdown(args: MediaEmbedArgs): string {
  const { name, shareUrl, fileUrl, posterUrl, isVideo } = args;
  const alt = escapeMarkdownText(name);
  const previewUrl = isVideo ? posterUrl : fileUrl;

  if (!previewUrl) {
    return `[▶ ${alt}](${shareUrl})`;
  }

  return `[![${alt}](${previewUrl})](${shareUrl})`;
}

/** One row of the media table: a pair's two halves, or a lone media. */
export type MediaMarkdownGroup = {
  name: string;
  /** The pair's note — shown in a Notes column when any group has one. */
  description: string | null;
  before: MediaEmbedArgs | null;
  after: MediaEmbedArgs | null;
};

/**
 * The Markdown table presenting media, a before/after pair side by side in one
 * row. One rendering shared by the managed pull request comment and by the
 * share page's copyable snippet, so what a reviewer pastes by hand shows up
 * exactly like what the bot posts.
 */
export function getMediaTableMarkdown(groups: MediaMarkdownGroup[]): string {
  const hasPairs = groups.some((group) => group.before && group.after);
  const hasNotes = groups.some((group) => group.description);

  const rows = groups.flatMap((group) => {
    const solo = group.after ?? group.before;
    if (!solo) {
      return [];
    }
    const cells = hasPairs
      ? [
          escapeTableCell(group.name),
          group.before ? getMediaMarkdown(group.before) : "",
          group.after ? getMediaMarkdown(group.after) : "",
        ]
      : [escapeTableCell(group.name), getMediaMarkdown(solo)];
    if (group.description) {
      cells.push(escapeTableCell(group.description));
    } else if (hasNotes) {
      cells.push("");
    }
    return [`| ${cells.join(" | ")} |`];
  });

  const headers = hasPairs ? ["Name", "Before", "After"] : ["Name", "Preview"];
  if (hasNotes) {
    headers.push("Notes");
  }

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows,
  ].join("\n");
}

/**
 * Escape a value so it stays inside its table cell.
 *
 * Backslashes go first, and skipping them is not cosmetic: escaping turns `|`
 * into `\|`, so a value already ending in a backslash would have that backslash
 * escaped by ours and let the pipe through — the very break this prevents. A
 * newline has no escape at all, since it ends the row outright, so it becomes the
 * `<br>` GitHub renders a line break with inside a cell.
 */
function escapeTableCell(value: string): string {
  return collapseLineBreaks(value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|"));
}

/**
 * Replace every line ending with the `<br>` GitHub renders one with inside a
 * cell.
 *
 * All three forms, not just `\n`: CommonMark and GFM treat a lone carriage
 * return as a line ending too, so matching `\r?\n` alone leaves `\r` to end the
 * row and drop everything after it into the comment as top-level Markdown.
 */
function collapseLineBreaks(value: string): string {
  return value.replace(/\r\n|[\r\n]/g, "<br>");
}

/**
 * Escape the characters that would break out of a Markdown link label. File names
 * are caller-controlled, and `]` alone is enough to truncate the label and leak
 * the rest as body text.
 *
 * `|` is in the set, and line endings are collapsed, even though neither means
 * anything to a link: these labels are rendered into table cells, where a raw
 * pipe opens a column mid-embed and a raw newline ends the row outright. The
 * cell escaping cannot reach them — by then the label is glued to a URL that
 * must not be escaped — so the label has to arrive already safe.
 */
function escapeMarkdownText(value: string): string {
  return collapseLineBreaks(value.replace(/([[\]\\|])/g, "\\$1"));
}
