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
  posterUrl: string | null;
  isVideo: boolean;
};

/**
 * Markdown ready to paste into a pull request comment.
 *
 * Images embed directly. Videos embed their **poster frame** wrapped in a link to
 * the share page, because GitHub only renders an inline video player for media it
 * hosts itself — an `<video>` tag or a bare `.mp4` link pointing at Argos would
 * render as a dead link. A video whose poster hasn't been extracted yet
 * degrades to a plain link rather than an image that 404s.
 */
export function getMediaMarkdown(args: MediaEmbedArgs): string {
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
 * `|` is in the set even though it means nothing to a link, because these labels
 * are rendered into table cells and a raw pipe there opens a column mid-embed.
 * The cell escaping cannot do it: by then the label is glued to a URL that must
 * not be escaped.
 */
function escapeMarkdownText(value: string): string {
  return value.replace(/([[\]\\|])/g, "\\$1");
}
