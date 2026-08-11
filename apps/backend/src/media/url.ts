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
  /** The pair's note — shown under the name in the Name cell. */
  description: string | null;
  before: MediaEmbedArgs | null;
  after: MediaEmbedArgs | null;
};

/**
 * The table presenting media, a before/after pair side by side in one row. One
 * rendering shared by the managed pull request comment and by the share page's
 * copyable snippet, so what a reviewer pastes by hand shows up exactly like
 * what the bot posts.
 *
 * An HTML table rather than a pipe table, for two things Markdown cannot say:
 * the description sits under the name in the same cell instead of in a Notes
 * column at the far end, and a lone media in a table that has pairs spans both
 * columns with `colspan` instead of leaving a hole. GitHub does not process
 * Markdown inside an HTML block, so every cell — embeds included — is written
 * as HTML.
 */
export function getMediaTableMarkdown(groups: MediaMarkdownGroup[]): string {
  const hasPairs = groups.some((group) => group.before && group.after);

  const rows = groups.flatMap((group) => {
    const solo = group.after ?? group.before;
    if (!solo) {
      return [];
    }
    const name = `<strong>${escapeHtmlText(group.name)}</strong>`;
    const label = group.description
      ? `${name}<br>${escapeHtmlText(group.description)}`
      : name;
    const cells =
      group.before && group.after
        ? [
            `<td>${getMediaCellHtml(group.before)}</td>`,
            `<td>${getMediaCellHtml(group.after)}</td>`,
          ]
        : [
            hasPairs
              ? `<td colspan="2">${getMediaCellHtml(solo)}</td>`
              : `<td>${getMediaCellHtml(solo)}</td>`,
          ];
    return [["<tr>", `<td>${label}</td>`, ...cells, "</tr>"].join("\n")];
  });

  const headers = hasPairs
    ? "<tr><th>Name</th><th>Before</th><th>After</th></tr>"
    : "<tr><th>Name</th><th>Preview</th></tr>";

  return [
    "<table>",
    "<thead>",
    headers,
    "</thead>",
    "<tbody>",
    ...rows,
    "</tbody>",
    "</table>",
  ].join("\n");
}

/**
 * The embed for one table cell: the picture linked to its share page, mirroring
 * {@link getMediaMarkdown} — same preview choice (the file for an image, the
 * poster frame for a video, a plain link for a video with no poster yet) —
 * spelled as HTML because Markdown is inert inside the table.
 */
function getMediaCellHtml(args: MediaEmbedArgs): string {
  const { name, shareUrl, fileUrl, posterUrl, isVideo } = args;
  const previewUrl = isVideo ? posterUrl : fileUrl;
  const href = escapeHtmlAttribute(shareUrl);

  if (!previewUrl) {
    return `<a href="${href}">▶ ${escapeHtmlText(name)}</a>`;
  }

  return `<a href="${href}"><img src="${escapeHtmlAttribute(previewUrl)}" alt="${escapeHtmlAttribute(name)}"></a>`;
}

/**
 * Escape the characters HTML assigns meaning to. `"` is in the set so the same
 * escaping is safe inside double-quoted attribute values, where a stray quote
 * would close the attribute and let a file name inject markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape a value for a cell's text content. Line endings become `<br>`: a
 * blank line anywhere inside the table ends the HTML block — GFM resumes
 * Markdown parsing after one — and dumps the rest of the table into the
 * comment as body text.
 */
function escapeHtmlText(value: string): string {
  return collapseLineBreaks(escapeHtml(value));
}

/**
 * Escape a value for an attribute. Line endings become spaces rather than
 * `<br>` — a tag means nothing inside `alt="…"` — but they still have to go,
 * because a blank line ends the HTML block even mid-attribute.
 */
function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/\r\n|[\r\n]/g, " ");
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
 * anything to a link: this snippet exists to be pasted, and a pipe-table cell
 * is one of the places it lands — where a raw pipe opens a column mid-embed
 * and a raw newline ends the row outright — so the label has to arrive
 * already safe.
 */
function escapeMarkdownText(value: string): string {
  return collapseLineBreaks(value.replace(/([[\]\\|])/g, "\\$1"));
}
