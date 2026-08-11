import { describe, expect, it } from "vitest";

import { getMediaMarkdown, getMediaTableMarkdown } from "./url";

const shareUrl = "https://app.argos-ci.dev/m/abc123";
const fileUrl = "https://files.example.com/media/abc123.webp";
const posterUrl = "https://files.example.com/poster.webp";

describe("getMediaMarkdown", () => {
  it("embeds the file and links it to the share page", () => {
    // The embed must point at the bytes, not at the share page: `![](page)`
    // renders as a broken image everywhere it is pasted, which is exactly what
    // it used to do.
    expect(
      getMediaMarkdown({
        name: "before.png",
        shareUrl,
        fileUrl,
        posterUrl: null,
        isVideo: false,
      }),
    ).toBe(`[![before.png](${fileUrl})](${shareUrl})`);
  });

  it("never points an image embed at the share page", () => {
    const markdown = getMediaMarkdown({
      name: "before.png",
      shareUrl,
      fileUrl,
      posterUrl: null,
      isVideo: false,
    });

    expect(markdown).not.toContain(`![before.png](${shareUrl})`);
  });

  it("wraps a video's poster in a link to the share page", () => {
    // GitHub renders an inline player only for media it hosts, so a video has to
    // embed as a clickable still. Getting this wrong is what makes the feature
    // look broken.
    expect(
      getMediaMarkdown({
        name: "checkout.mp4",
        shareUrl,
        fileUrl,
        posterUrl,
        isVideo: true,
      }),
    ).toBe(`[![checkout.mp4](${posterUrl})](${shareUrl})`);
  });

  it("degrades a video with no poster yet to a plain link", () => {
    // Better than an image tag pointing at the video file: that renders as a
    // broken-image icon in the comment.
    expect(
      getMediaMarkdown({
        name: "checkout.mp4",
        shareUrl,
        fileUrl,
        posterUrl: null,
        isVideo: true,
      }),
    ).toBe(`[▶ checkout.mp4](${shareUrl})`);
  });

  it("escapes brackets in a file name so they cannot truncate the label", () => {
    expect(
      getMediaMarkdown({
        name: "before [v2].png",
        shareUrl,
        fileUrl,
        posterUrl: null,
        isVideo: false,
      }),
    ).toBe(`[![before \\[v2\\].png](${fileUrl})](${shareUrl})`);
  });
});

describe("getMediaTableMarkdown", () => {
  it("shows a pair side by side — the pull request comment's own rendering", () => {
    expect(
      getMediaTableMarkdown([
        {
          name: "checkout.png",
          description: "Checkout after the spacing fix.",
          before: {
            name: "checkout.png",
            shareUrl: "https://app/m/before",
            fileUrl: "https://files/before.webp",
            posterUrl: null,
            isVideo: false,
          },
          after: {
            name: "checkout.png",
            shareUrl: "https://app/m/after",
            fileUrl: "https://files/after.webp",
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toBe(
      [
        "<table>",
        "<thead>",
        "<tr><th>Name</th><th>Before</th><th>After</th></tr>",
        "</thead>",
        "<tbody>",
        "<tr>",
        "<td><strong>checkout.png</strong><br>Checkout after the spacing fix.</td>",
        '<td><a href="https://app/m/before"><img src="https://files/before.webp" alt="checkout.png"></a></td>',
        '<td><a href="https://app/m/after"><img src="https://files/after.webp" alt="checkout.png"></a></td>',
        "</tr>",
        "</tbody>",
        "</table>",
      ].join("\n"),
    );
  });

  it("keeps a lone media to a single preview column", () => {
    expect(
      getMediaTableMarkdown([
        {
          name: "dashboard.png",
          description: null,
          before: null,
          after: {
            name: "dashboard.png",
            shareUrl,
            fileUrl,
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toBe(
      [
        "<table>",
        "<thead>",
        "<tr><th>Name</th><th>Preview</th></tr>",
        "</thead>",
        "<tbody>",
        "<tr>",
        "<td><strong>dashboard.png</strong></td>",
        `<td><a href="${shareUrl}"><img src="${fileUrl}" alt="dashboard.png"></a></td>`,
        "</tr>",
        "</tbody>",
        "</table>",
      ].join("\n"),
    );
  });

  it("spans a lone media across both columns of a table that has pairs", () => {
    // Without the colspan the lone media sits in one column with a hole beside
    // it, reading as a pair whose other half went missing.
    const table = getMediaTableMarkdown([
      {
        name: "checkout.png",
        description: null,
        before: {
          name: "checkout.png",
          shareUrl: "https://app/m/before",
          fileUrl: "https://files/before.webp",
          posterUrl: null,
          isVideo: false,
        },
        after: {
          name: "checkout.png",
          shareUrl: "https://app/m/after",
          fileUrl: "https://files/after.webp",
          posterUrl: null,
          isVideo: false,
        },
      },
      {
        name: "dashboard.png",
        description: null,
        before: null,
        after: {
          name: "dashboard.png",
          shareUrl,
          fileUrl,
          posterUrl: null,
          isVideo: false,
        },
      },
    ]);

    expect(table).toContain(
      `<td colspan="2"><a href="${shareUrl}"><img src="${fileUrl}" alt="dashboard.png"></a></td>`,
    );
  });

  it("escapes a name so it cannot inject markup into the table", () => {
    // The whole table is raw HTML to GitHub, so an unescaped name is markup —
    // in the label as a tag, in the alt attribute by closing the quote.
    const table = getMediaTableMarkdown([
      {
        name: '<img src=x> "b.png',
        description: null,
        before: null,
        after: {
          name: '<img src=x> "b.png',
          shareUrl,
          fileUrl,
          posterUrl: null,
          isVideo: false,
        },
      },
    ]);

    expect(table).toContain(
      "<td><strong>&lt;img src=x&gt; &quot;b.png</strong></td>",
    );
    expect(table).toContain('alt="&lt;img src=x&gt; &quot;b.png"');
    expect(table).not.toContain("<img src=x>");
  });

  it("keeps a blank line in a note from ending the HTML block", () => {
    // GFM resumes Markdown parsing after a blank line inside an HTML block, so
    // an unescaped one dumps the rest of the table into the comment as text.
    const table = getMediaTableMarkdown([
      {
        name: "dashboard.png",
        description: "First.\n\nSecond.",
        before: null,
        after: {
          name: "dashboard.png",
          shareUrl,
          fileUrl,
          posterUrl: null,
          isVideo: false,
        },
      },
    ]);

    expect(table).toContain("First.<br><br>Second.");
    expect(table).not.toContain("\n\n");
  });

  it("collapses a lone carriage return, which is also a line ending", () => {
    // CommonMark and GFM treat a bare `\r` as a line ending too, so matching
    // only `\r?\n` leaves it able to form the blank line that ends the block.
    expect(
      getMediaTableMarkdown([
        {
          name: "dashboard.png",
          description: "First.\rSecond.",
          before: null,
          after: {
            name: "dashboard.png",
            shareUrl,
            fileUrl,
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toContain("First.<br>Second.");
  });

  it("collapses a newline in a name, in the label and in the alt attribute", () => {
    const table = getMediaTableMarkdown([
      {
        name: "a\nb.png",
        description: null,
        before: null,
        after: {
          name: "a\nb.png",
          shareUrl,
          fileUrl,
          posterUrl: null,
          isVideo: false,
        },
      },
    ]);

    expect(table).toContain("<td><strong>a<br>b.png</strong></td>");
    // A `<br>` means nothing inside an attribute, so there the newline becomes
    // a space instead.
    expect(table).toContain('alt="a b.png"');
  });

  it("degrades a poster-less video cell to a plain link", () => {
    expect(
      getMediaTableMarkdown([
        {
          name: "checkout.mp4",
          description: null,
          before: null,
          after: {
            name: "checkout.mp4",
            shareUrl,
            fileUrl,
            posterUrl: null,
            isVideo: true,
          },
        },
      ]),
    ).toContain(`<td><a href="${shareUrl}">▶ checkout.mp4</a></td>`);
  });
});
