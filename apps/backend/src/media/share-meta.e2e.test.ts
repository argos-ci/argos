import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { getPublicMediaShareMeta } from "./share-meta";

describe("getPublicMediaShareMeta", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("describes a public image so it can unfurl", async () => {
    const { media, version } = await factory.createMediaWithVersion({
      media: {
        name: "checkout.png",
        description: "Checkout after the spacing fix.",
        visibility: "public",
      },
      version: { mimeType: "image/webp", width: 800, height: 600 },
    });

    const meta = await getPublicMediaShareMeta(media.shareToken);

    expect(meta).toMatchObject({
      name: "checkout.png",
      description: "Checkout after the spacing fix.",
      shareUrl: media.url,
      image: { width: 800, height: 600, contentType: "image/webp" },
      // An image is not a video, and saying otherwise makes a consumer render a
      // player over a still.
      video: null,
    });
    expect(meta?.image.url).toContain(version.key);
  });

  it("refuses a team media, whose name alone is private", async () => {
    // Unfurl metadata is served to a crawler, which carries no session — so
    // everything in it is public to anyone holding the link. A `team` media's
    // link is exactly the one that must not answer.
    const { media } = await factory.createMediaWithVersion({
      media: { name: "unreleased-pricing.png", visibility: "team" },
    });

    await expect(getPublicMediaShareMeta(media.shareToken)).resolves.toBeNull();
  });

  it("refuses a media whose bytes never landed", async () => {
    // An unfurl advertising an image that 404s is worse than no unfurl.
    const media = await factory.Media.create({ visibility: "public" });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 1,
      uploadedAt: null,
      billedUnits: 0,
    });

    await expect(getPublicMediaShareMeta(media.shareToken)).resolves.toBeNull();
  });

  it("refuses an unknown token without saying so", async () => {
    await expect(getPublicMediaShareMeta("not-a-token")).resolves.toBeNull();
  });

  it("shows a video's poster frame, and offers the file itself", async () => {
    const { media } = await factory.createMediaWithVersion({
      media: { name: "checkout.mp4", visibility: "public" },
      version: {
        key: "media/test/clip.mp4",
        mimeType: "video/mp4",
        width: 1280,
        height: 720,
      },
    });

    const meta = await getPublicMediaShareMeta(media.shareToken);

    // The card shows a still: a consumer that cannot play the video still
    // renders one, and a card with no image renders as a bare link.
    expect(meta?.image.url).toContain("ik-thumbnail.jpg");
    expect(meta?.image.contentType).toBe("image/jpeg");
    expect(meta?.video).toMatchObject({ contentType: "video/mp4" });
  });

  it("caps an oversized preview at the CDN rather than sending 4K to a crawler", async () => {
    // Twitter drops an image over 5 MB, so an uncapped screenshot unfurls with
    // no image at all.
    const { media } = await factory.createMediaWithVersion({
      media: { visibility: "public" },
      version: { width: 3840, height: 2160 },
    });

    const meta = await getPublicMediaShareMeta(media.shareToken);

    expect(meta?.image.url).toContain("tr=w-1200");
    // The declared size has to describe the bytes that are actually served.
    expect(meta?.image).toMatchObject({ width: 1200, height: 675 });
  });

  it("keeps the poster's frame selection when it also has to resize it", async () => {
    // The poster arrives with `tr=so-1` on it; overwriting that asks the CDN to
    // resize the whole video instead of the frame, and gets back nothing.
    const { media } = await factory.createMediaWithVersion({
      media: { visibility: "public" },
      version: {
        key: "media/test/clip.mp4",
        mimeType: "video/mp4",
        width: 3840,
        height: 2160,
      },
    });

    const meta = await getPublicMediaShareMeta(media.shareToken);

    expect(meta?.image.url).toContain("tr=so-1%2Cw-1200");
  });

  it("leaves a preview alone when it already fits", async () => {
    const { media } = await factory.createMediaWithVersion({
      media: { visibility: "public" },
      version: { width: 800, height: 600 },
    });

    const meta = await getPublicMediaShareMeta(media.shareToken);

    expect(meta?.image.url).not.toContain("tr=");
  });
});
