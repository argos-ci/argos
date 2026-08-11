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
 * Tallest a preview is allowed to render, in CSS pixels.
 *
 * Applied by constraining the **width**, never the height: GitHub styles embedded
 * images with `max-width: 100%` and no `height: auto`, so a fixed height attribute
 * survives on a wide screen and stretches the image on a narrow one.
 */
const MAX_PREVIEW_HEIGHT = 700;

/**
 * Roughly how wide a pull request comment renders, and the only reason the cap
 * can be applied at all: an embed's height on screen is not the file's height,
 * it is the file's height after `max-width: 100%` has scaled it down to fit.
 *
 * Deliberately an estimate — GitHub's body width is responsive and we render one
 * Markdown string for every reader. Erring low is the safe direction: it can only
 * make the cap trigger on an image that would have been slightly under it.
 */
const COMMENT_WIDTH = 800;

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
  /** Pixel size of the bytes, when it could be read off them. */
  width: number | null;
  height: number | null;
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

/** One block of the media list: a pair's two halves, or a lone media. */
export type MediaMarkdownGroup = {
  name: string;
  /** What the uploader said the media shows. Belongs to the pair, not to a half. */
  description: string | null;
  /**
   * Version of the media on show. Badged from 2 up — that a first upload is its
   * own first version is not worth a reader's attention.
   */
  versionNumber: number;
  /**
   * Whether opening the **share page** needs a session. The embedded bytes are
   * served unauthenticated whatever this says (see `getMediaFileUrl`), so this
   * is the one thing a reader cannot infer from the comment: the picture renders
   * for everyone, the page behind it does not.
   */
  teamOnly: boolean;
  before: MediaEmbedArgs | null;
  after: MediaEmbedArgs | null;
};

/**
 * The media list presented as blocks, one per media, joined by a blank line.
 *
 * One rendering shared by the managed pull request comment and by the share
 * page's copyable snippet, so what a reviewer pastes by hand shows up exactly
 * like what the bot posts.
 */
export function getMediaListMarkdown(groups: MediaMarkdownGroup[]): string {
  return groups.map(getMediaBlockMarkdown).join("\n\n");
}

/**
 * One media, as a heading carrying its name and badges, the description it was
 * uploaded with, and the preview.
 *
 * Name and description are lines of prose rather than table columns, which is
 * what lets the picture have the comment's full width: a table sizes its columns
 * from their content, and an image cell is intrinsically far wider than a
 * sentence, so text columns collapse onto their longest word while the preview
 * gets squeezed all the same. A table is kept for the one thing it is actually
 * for — putting a pair's two halves side by side to be compared.
 */
export function getMediaBlockMarkdown(group: MediaMarkdownGroup): string {
  const heading = getBlockHeading(group);
  const description = group.description
    ? `<br>\n${collapseLineBreaks(group.description)}`
    : "";
  return `${heading}${description}\n\n${getBlockPreview(group)}`;
}

/**
 * The heading line: the name, then the badges.
 *
 * A lone media links its name to its share page. A pair does not — it has two
 * share pages and no reason to prefer one, and its halves carry the links in the
 * table headers right below.
 */
function getBlockHeading(group: MediaMarkdownGroup): string {
  const solo =
    group.before && group.after ? null : (group.after ?? group.before);
  const name = escapeMarkdownText(group.name);
  const label = solo ? `**[${name}](${solo.shareUrl})**` : `**${name}**`;
  const badges = getBlockBadges(group);
  if (badges.length === 0) {
    return label;
  }
  return `${label} · ${badges.map((badge) => `\`${badge}\``).join(" · ")}`;
}

/**
 * The badges, in the order a reader needs them.
 *
 * Every one of them is a fact Argos holds, and every one is conditional. Both
 * halves of that matter: a badge nobody can contradict is worth glancing at, and
 * a badge that only shows up when it has something to say stays worth glancing
 * at. The moment badges become decoration — always there, or filled with
 * whatever the uploader typed — the heading stops being scannable and the
 * description is where the reading was supposed to happen anyway.
 */
function getBlockBadges(group: MediaMarkdownGroup): string[] {
  const primary = group.after ?? group.before;
  const badges: string[] = [];
  if (primary?.width && primary.height) {
    badges.push(`${primary.width} × ${primary.height}`);
  }
  if (primary?.isVideo) {
    // A poster frame is indistinguishable from a screenshot, so nothing else in
    // the comment says there is something to play.
    badges.push("video");
  }
  if (group.versionNumber > 1) {
    badges.push(`v${group.versionNumber}`);
  }
  if (group.teamOnly) {
    badges.push("Team-only");
  }
  return badges;
}

/** The pair's table, or the lone media's framed preview. */
function getBlockPreview(group: MediaMarkdownGroup): string {
  const { before, after } = group;
  if (before && after) {
    const headers = [
      `[Before ↗](${before.shareUrl})`,
      `[After ↗](${after.shareUrl})`,
    ];
    return [
      `| ${headers.join(" | ")} |`,
      "| --- | --- |",
      `| ${getCellEmbed(before, prefixAlt("Before", group))} | ${getCellEmbed(after, prefixAlt("After", group))} |`,
    ].join("\n");
  }

  const solo = after ?? before;
  if (!solo) {
    return "";
  }
  const previewUrl = getPreviewUrl(solo);
  if (!previewUrl) {
    return getPosterlessMarkdown(solo);
  }
  return frame(getEmbedHtml(solo, previewUrl, group.description ?? solo.name));
}

/**
 * Wrap a preview in a one-cell table.
 *
 * Purely for the border GitHub draws around a table, which is the only way to
 * give an embed an edge: a light screenshot on a light comment background has
 * none of its own, and a reader cannot tell where the image starts. A pair gets
 * this for free from the table it is already in.
 *
 * The content has to be HTML, and the cell has to hold no blank line: Markdown
 * is not parsed inside an HTML block, so an image written as `![]()` in there
 * would render as its own source text.
 */
function frame(html: string): string {
  return `<table><tr><td>\n${html}\n</td></tr></table>`;
}

/**
 * The picture to show for a media: the file itself for an image, the poster frame
 * for a video, and `null` for a video whose poster hasn't been extracted yet.
 */
function getPreviewUrl(embed: MediaEmbedArgs): string | null {
  return embed.isVideo ? embed.posterUrl : embed.fileUrl;
}

/** What stands in for a video that has no poster: a link, never a broken image. */
function getPosterlessMarkdown(embed: MediaEmbedArgs): string {
  return `[▶ ${escapeMarkdownText(embed.name)}](${embed.shareUrl})`;
}

/**
 * The clickable picture as HTML, which is the only form a framed preview can
 * take: Markdown is not parsed inside an HTML block, so `![]()` in a `<td>`
 * renders as its own source text.
 */
function getEmbedHtml(
  embed: MediaEmbedArgs,
  previewUrl: string,
  alt: string,
): string {
  const width = getPreviewWidth(embed);
  return [
    `<a href="${escapeHtmlAttribute(embed.shareUrl)}">`,
    `<img src="${escapeHtmlAttribute(previewUrl)}"`,
    ` alt="${escapeHtmlAttribute(alt)}"`,
    width === null ? "" : ` width="${width}"`,
    "></a>",
  ].join("");
}

/**
 * The clickable picture for a pair's cell: Markdown when nothing needs
 * constraining, HTML when the preview has to be capped — `width` is an
 * attribute, and Markdown has no way to spell one. Both parse inside a table
 * cell, which unlike a framed preview is still Markdown.
 */
function getCellEmbed(embed: MediaEmbedArgs, alt: string): string {
  const previewUrl = getPreviewUrl(embed);
  if (!previewUrl) {
    return getPosterlessMarkdown(embed);
  }
  if (getPreviewWidth(embed) === null) {
    return `[![${escapeMarkdownText(alt)}](${previewUrl})](${embed.shareUrl})`;
  }
  return getEmbedHtml(embed, previewUrl, alt);
}

/**
 * The width that brings a preview back under {@link MAX_PREVIEW_HEIGHT}, or
 * `null` when it already is — or when the bytes never gave up their size, in
 * which case constraining on a guess would be worse than leaving it alone.
 *
 * A landscape screenshot is wider than the comment, so it arrives already scaled
 * down and is never touched: a 1440×900 lands around 500px tall. What is left is
 * the two shapes that otherwise take over the thread — a phone capture, narrow
 * enough to render at its full height, and a full-page capture, tall enough that
 * even scaled to the comment's width it runs to thousands of pixels.
 */
function getPreviewWidth(embed: MediaEmbedArgs): number | null {
  const { width, height } = embed;
  if (!width || !height) {
    return null;
  }
  const renderedHeight = (height * Math.min(width, COMMENT_WIDTH)) / width;
  if (renderedHeight <= MAX_PREVIEW_HEIGHT) {
    return null;
  }
  return Math.max(1, Math.round((MAX_PREVIEW_HEIGHT * width) / height));
}

/**
 * Alt text for one half of a pair. The description covers the pair as a whole,
 * so the half it belongs to has to be said, or a screen reader hears the same
 * sentence twice with nothing telling the two pictures apart.
 */
function prefixAlt(state: string, group: MediaMarkdownGroup): string {
  return `${state} — ${group.description ?? group.name}`;
}

/**
 * Escape a value so it stays inside an HTML attribute.
 *
 * `&` goes first, for the same reason the backslash does when escaping a table
 * cell: escaping introduces `&`-prefixed entities, so escaping it last would
 * mangle the ones the earlier passes just wrote.
 */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace every line ending with the `<br>` GitHub renders one with.
 *
 * All three forms, not just `\n`: CommonMark and GFM treat a lone carriage
 * return as a line ending too. In a table cell a raw line ending would end the
 * row outright and drop the rest into the comment as top-level Markdown; in the
 * description it would split a block in two.
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
 * anything to a link: these labels are also rendered into table cells, where a raw
 * pipe opens a column mid-embed and a raw newline ends the row outright. The
 * cell has no escaping of its own to fall back on — by then the label is glued to
 * a URL that must not be escaped — so it has to arrive already safe.
 */
function escapeMarkdownText(value: string): string {
  return collapseLineBreaks(value.replace(/([[\]\\|])/g, "\\$1"));
}
