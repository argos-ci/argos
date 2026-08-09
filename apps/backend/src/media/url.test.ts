import { describe, expect, it } from "vitest";

import { getMediaMarkdown, getMediaTableMarkdown } from "./url";

const shareUrl = "https://app.argos-ci.dev/m/abc123";
const posterUrl = "https://files.example.com/poster.webp";

describe("getMediaMarkdown", () => {
  it("embeds an image directly", () => {
    expect(
      getMediaMarkdown({
        name: "before.png",
        shareUrl,
        posterUrl: null,
        isVideo: false,
      }),
    ).toBe(`![before.png](${shareUrl})`);
  });

  it("wraps a video's poster in a link to the share page", () => {
    // GitHub renders an inline player only for media it hosts, so a video has to
    // embed as a clickable still. Getting this wrong is what makes the feature
    // look broken.
    expect(
      getMediaMarkdown({
        name: "checkout.mp4",
        shareUrl,
        posterUrl,
        isVideo: true,
      }),
    ).toBe(`[![checkout.mp4](${posterUrl})](${shareUrl})`);
  });

  it("degrades a video with no poster yet to a plain link", () => {
    // Better than an image tag pointing at a poster that does not exist: that
    // renders as a broken-image icon in the comment.
    expect(
      getMediaMarkdown({
        name: "checkout.mp4",
        shareUrl,
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
        posterUrl: null,
        isVideo: false,
      }),
    ).toBe(`![before \\[v2\\].png](${shareUrl})`);
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
            posterUrl: null,
            isVideo: false,
          },
          after: {
            name: "checkout.png",
            shareUrl: "https://app/m/after",
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toBe(
      [
        "| Name | Before | After | Notes |",
        "| --- | --- | --- | --- |",
        "| checkout.png | ![checkout.png](https://app/m/before) | ![checkout.png](https://app/m/after) | Checkout after the spacing fix. |",
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
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toBe(
      [
        "| Name | Preview |",
        "| --- | --- |",
        `| dashboard.png | ![dashboard.png](${shareUrl}) |`,
      ].join("\n"),
    );
  });

  it("escapes pipes so a name cannot break out of its cell", () => {
    expect(
      getMediaTableMarkdown([
        {
          name: "a|b.png",
          description: null,
          before: null,
          after: { name: "a|b.png", shareUrl, posterUrl: null, isVideo: false },
        },
      ]),
    ).toBe(
      [
        "| Name | Preview |",
        "| --- | --- |",
        // Both cells: the pipe is escaped in the name column and again inside
        // the embed's alt text, which is a cell of its own.
        `| a\\|b.png | ![a\\|b.png](${shareUrl}) |`,
      ].join("\n"),
    );
  });

  it("escapes a trailing backslash so it cannot escape the pipe escape", () => {
    // `a\` + `|` naively escaped gives `a\\|`, which renders a literal backslash
    // followed by a live pipe — a new column, from a file name.
    expect(
      getMediaTableMarkdown([
        {
          name: "a\\|b.png",
          description: null,
          before: null,
          after: {
            name: "dashboard.png",
            shareUrl,
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toContain("| a\\\\\\|b.png |");
  });

  it("collapses a lone carriage return, which also ends a row", () => {
    // CommonMark and GFM treat a bare `\r` as a line ending, so matching only
    // `\r?\n` leaves it to end the row and drop the rest into the comment as
    // top-level Markdown.
    expect(
      getMediaTableMarkdown([
        {
          name: "dashboard.png",
          description: "First.\rSecond.",
          before: null,
          after: {
            name: "dashboard.png",
            shareUrl,
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toContain("| First.<br>Second. |");
  });

  it("collapses a newline in a name, which sits inside the embed", () => {
    // The alt text is a cell of its own that `escapeTableCell` cannot reach, so
    // a raw newline there ends the row mid-embed and leaks the rest as body
    // text — the break the cell escaping exists to stop.
    const table = getMediaTableMarkdown([
      {
        name: "a\nb.png",
        description: null,
        before: null,
        after: { name: "a\nb.png", shareUrl, posterUrl: null, isVideo: false },
      },
    ]);

    expect(table).toBe(
      [
        "| Name | Preview |",
        "| --- | --- |",
        `| a<br>b.png | ![a<br>b.png](${shareUrl}) |`,
      ].join("\n"),
    );
    // One row per group, whatever the name contains.
    expect(table.split("\n")).toHaveLength(3);
  });

  it("turns a newline in a note into a line break instead of a new row", () => {
    expect(
      getMediaTableMarkdown([
        {
          name: "dashboard.png",
          description: "First line.\nSecond line.",
          before: null,
          after: {
            name: "dashboard.png",
            shareUrl,
            posterUrl: null,
            isVideo: false,
          },
        },
      ]),
    ).toContain("| First line.<br>Second line. |");
  });
});
