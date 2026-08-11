import { describe, expect, it } from "vitest";

import {
  getMediaBlockMarkdown,
  getMediaListMarkdown,
  getMediaMarkdown,
  type MediaEmbedArgs,
  type MediaMarkdownGroup,
} from "./url";

const shareUrl = "https://app.argos-ci.dev/m/abc123";
const fileUrl = "https://files.example.com/media/abc123.webp";
const posterUrl = "https://files.example.com/poster.webp";

/** A landscape screenshot: wider than a comment, so never capped. */
function embed(overrides: Partial<MediaEmbedArgs> = {}): MediaEmbedArgs {
  return {
    name: "dashboard.png",
    shareUrl,
    fileUrl,
    posterUrl: null,
    isVideo: false,
    width: 1440,
    height: 900,
    ...overrides,
  };
}

function group(
  overrides: Partial<MediaMarkdownGroup> = {},
): MediaMarkdownGroup {
  return {
    name: "dashboard.png",
    description: null,
    versionNumber: 1,
    teamOnly: false,
    before: null,
    after: embed(),
    ...overrides,
  };
}

describe("getMediaMarkdown", () => {
  it("embeds the file and links it to the share page", () => {
    // The embed must point at the bytes, not at the share page: `![](page)`
    // renders as a broken image everywhere it is pasted, which is exactly what
    // it used to do.
    expect(getMediaMarkdown(embed({ name: "before.png" }))).toBe(
      `[![before.png](${fileUrl})](${shareUrl})`,
    );
  });

  it("never points an image embed at the share page", () => {
    const markdown = getMediaMarkdown(embed({ name: "before.png" }));

    expect(markdown).not.toContain(`![before.png](${shareUrl})`);
  });

  it("wraps a video's poster in a link to the share page", () => {
    // GitHub renders an inline player only for media it hosts, so a video has to
    // embed as a clickable still. Getting this wrong is what makes the feature
    // look broken.
    expect(
      getMediaMarkdown(
        embed({ name: "checkout.mp4", posterUrl, isVideo: true }),
      ),
    ).toBe(`[![checkout.mp4](${posterUrl})](${shareUrl})`);
  });

  it("degrades a video with no poster yet to a plain link", () => {
    // Better than an image tag pointing at the video file: that renders as a
    // broken-image icon in the comment.
    expect(
      getMediaMarkdown(embed({ name: "checkout.mp4", isVideo: true })),
    ).toBe(`[▶ checkout.mp4](${shareUrl})`);
  });

  it("escapes brackets in a file name so they cannot truncate the label", () => {
    expect(getMediaMarkdown(embed({ name: "before [v2].png" }))).toBe(
      `[![before \\[v2\\].png](${fileUrl})](${shareUrl})`,
    );
  });
});

describe("getMediaBlockMarkdown", () => {
  it("gives a lone media the whole width, under a heading linked to its page", () => {
    expect(getMediaBlockMarkdown(group())).toBe(
      [
        `**[dashboard.png](${shareUrl})** · \`1440 × 900\``,
        "",
        "<table><tr><td>",
        `<a href="${shareUrl}"><img src="${fileUrl}" alt="dashboard.png"></a>`,
        "</td></tr></table>",
      ].join("\n"),
    );
  });

  it("shows a pair side by side, each half linked from its header", () => {
    // The one thing a table is for. Name and description stay out of it: a table
    // sizes its columns from their content, and a text column next to an image
    // column collapses onto its longest word.
    expect(
      getMediaBlockMarkdown(
        group({
          name: "checkout.png",
          description: "Checkout after the spacing fix.",
          before: embed({ shareUrl: "https://app/m/before" }),
          after: embed({ shareUrl: "https://app/m/after" }),
        }),
      ),
    ).toBe(
      [
        "**checkout.png** · `1440 × 900`<br>",
        "Checkout after the spacing fix.",
        "",
        "| [Before ↗](https://app/m/before) | [After ↗](https://app/m/after) |",
        "| --- | --- |",
        `| [![Before — Checkout after the spacing fix.](${fileUrl})](https://app/m/before) | [![After — Checkout after the spacing fix.](${fileUrl})](https://app/m/after) |`,
      ].join("\n"),
    );
  });

  it("does not link a pair's name, which would have to pick a half", () => {
    const markdown = getMediaBlockMarkdown(
      group({ before: embed(), after: embed() }),
    );

    expect(markdown).toContain("**dashboard.png**");
    expect(markdown).not.toContain(`**[dashboard.png](${shareUrl})**`);
  });

  it("describes the media with the badges it can prove", () => {
    expect(
      getMediaBlockMarkdown(
        group({
          versionNumber: 3,
          teamOnly: true,
          after: embed({ posterUrl, isVideo: true }),
        }),
      ),
    ).toContain("· `1440 × 900` · `video` · `v3` · `Team-only`");
  });

  it("badges nothing it has nothing to say about", () => {
    // A badge that is always there stops being worth a glance, and the heading
    // stops being the scannable layer it exists to be.
    const heading = getMediaBlockMarkdown(
      group({ after: embed({ width: null, height: null }) }),
    ).split("\n")[0];

    expect(heading).toBe(`**[dashboard.png](${shareUrl})**`);
  });

  it("uses the description as alt text, which says more than a file name", () => {
    expect(
      getMediaBlockMarkdown(group({ description: "The empty dashboard." })),
    ).toContain('alt="The empty dashboard."');
  });

  it("caps a phone screenshot, which would otherwise render at full height", () => {
    // 375 wide is narrower than a comment, so nothing scales it down and its
    // 1086 pixels of height land in the thread whole.
    expect(
      getMediaBlockMarkdown(
        group({ after: embed({ width: 375, height: 1086 }) }),
      ),
    ).toContain('width="242"');
  });

  it("leaves a landscape screenshot alone", () => {
    // It is wider than the comment, so it arrives already scaled to about 500
    // pixels tall — capping it would shrink a preview that reads fine.
    expect(getMediaBlockMarkdown(group())).not.toContain("width=");
  });

  it("caps nothing when the bytes never gave up their size", () => {
    expect(
      getMediaBlockMarkdown(
        group({ after: embed({ width: null, height: null }) }),
      ),
    ).not.toContain("width=");
  });

  it("leaves a posterless video unframed, since a frame cannot hold Markdown", () => {
    // Markdown is not parsed inside an HTML block, so the link fallback has to
    // stay outside the one-cell table the other previews get.
    expect(
      getMediaBlockMarkdown(
        group({
          name: "checkout.mp4",
          after: embed({ name: "checkout.mp4", isVideo: true }),
        }),
      ),
    ).toBe(
      [
        `**[checkout.mp4](${shareUrl})** · \`1440 × 900\` · \`video\``,
        "",
        `[▶ checkout.mp4](${shareUrl})`,
      ].join("\n"),
    );
  });

  it("escapes an HTML attribute so a name cannot close it", () => {
    // The name reaches an `alt` attribute, where a quote ends the attribute and
    // everything after it becomes markup GitHub is happy to keep.
    expect(
      getMediaBlockMarkdown(
        group({
          name: '" onerror="x',
          after: embed({ name: '" onerror="x', width: 375, height: 1086 }),
        }),
      ),
    ).toContain('alt="&quot; onerror=&quot;x"');
  });

  it("escapes an ampersand before the entities it writes itself", () => {
    // Escaping `&` last would turn the `&quot;` the quote pass just wrote into
    // `&amp;quot;`, printing the entity instead of the character.
    expect(
      getMediaBlockMarkdown(
        group({
          name: '&"',
          after: embed({ name: '&"', width: 375, height: 1086 }),
        }),
      ),
    ).toContain('alt="&amp;&quot;"');
  });

  it("escapes pipes so a name cannot break out of a pair's cell", () => {
    expect(
      getMediaBlockMarkdown(
        group({ name: "a|b.png", before: embed(), after: embed() }),
      ),
    ).toContain("| [![Before — a\\|b.png]");
  });

  it("escapes a trailing backslash so it cannot escape the pipe escape", () => {
    // `a\` + `|` naively escaped gives `a\\|`, which renders a literal backslash
    // followed by a live pipe — a new column, from a file name.
    expect(
      getMediaBlockMarkdown(
        group({ name: "a\\|b.png", before: embed(), after: embed() }),
      ),
    ).toContain("Before — a\\\\\\|b.png");
  });

  it("collapses a lone carriage return in a description", () => {
    // CommonMark and GFM treat a bare `\r` as a line ending, so matching only
    // `\r?\n` leaves it to split the block in two.
    expect(
      getMediaBlockMarkdown(group({ description: "First.\rSecond." })),
    ).toContain("First.<br>Second.");
  });

  it("turns a newline in a description into a line break", () => {
    expect(
      getMediaBlockMarkdown(
        group({ description: "First line.\nSecond line." }),
      ),
    ).toContain("First line.<br>Second line.");
  });
});

describe("getMediaListMarkdown", () => {
  it("separates blocks with a blank line", () => {
    const list = getMediaListMarkdown([
      group({ name: "one.png" }),
      group({ name: "two.png" }),
    ]);

    expect(list).toBe(
      `${getMediaBlockMarkdown(group({ name: "one.png" }))}\n\n${getMediaBlockMarkdown(group({ name: "two.png" }))}`,
    );
  });
});
