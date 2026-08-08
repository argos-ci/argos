import { describe, expect, it } from "vitest";

import { getMediaMarkdown } from "./url";

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
