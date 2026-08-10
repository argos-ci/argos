import { describe, expect, it } from "vitest";

import { getMediaOEmbed } from "./oembed";
import type { MediaShareMeta } from "./share-meta";

const NO_CONSTRAINTS = { maxWidth: null, maxHeight: null };

function meta(overrides?: Partial<MediaShareMeta>): MediaShareMeta {
  return {
    name: "checkout.png",
    description: null,
    shareUrl: "https://app.argos-ci.dev/m/abc123",
    image: {
      url: "https://ik.example.com/media/1/abc.webp",
      width: 800,
      height: 600,
      contentType: "image/webp",
    },
    video: null,
    ...overrides,
  };
}

describe("getMediaOEmbed", () => {
  it("answers for an image as a photo, which is what a consumer renders", () => {
    expect(getMediaOEmbed(meta(), NO_CONSTRAINTS)).toMatchObject({
      version: "1.0",
      type: "photo",
      title: "checkout.png",
      provider_name: "Argos",
      url: "https://ik.example.com/media/1/abc.webp",
      width: 800,
      height: 600,
    });
  });

  it("answers for a video as a link with a still", () => {
    // The `video` type requires an `html` iframe payload, and the app sends
    // `frame-ancestors 'none'` — claiming a player nobody may frame renders as
    // an empty box.
    const response = getMediaOEmbed(
      meta({
        name: "checkout.mp4",
        video: {
          url: "https://ik.example.com/media/1/clip.mp4",
          contentType: "video/mp4",
        },
      }),
      NO_CONSTRAINTS,
    );

    expect(response).toMatchObject({
      type: "link",
      thumbnail_url: "https://ik.example.com/media/1/abc.webp",
      thumbnail_width: 800,
      thumbnail_height: 600,
    });
    expect(response).not.toHaveProperty("html");
  });

  it("falls back to a link when the dimensions were never recorded", () => {
    // `photo` requires them, and inventing a size lays the image out at the
    // wrong shape in every consumer.
    expect(
      getMediaOEmbed(
        meta({
          image: {
            url: "https://ik.example.com/media/1/abc.webp",
            width: null,
            height: null,
            contentType: "image/webp",
          },
        }),
        NO_CONSTRAINTS,
      ),
    ).toMatchObject({ type: "link" });
  });

  it("honours maxwidth by asking the CDN for smaller bytes", () => {
    // A consumer asking for 400px is saying what it will download. Reporting a
    // smaller size for the same file wastes exactly what it was avoiding.
    expect(
      getMediaOEmbed(meta(), { maxWidth: 400, maxHeight: null }),
    ).toMatchObject({
      type: "photo",
      url: "https://ik.example.com/media/1/abc.webp?tr=w-400",
      width: 400,
      height: 300,
    });
  });

  it("turns maxheight into the width that produces it", () => {
    // 300px tall on a 4:3 image is 400px wide, and width is the dimension the
    // transformation takes — resizing on it keeps the ratio either way.
    expect(
      getMediaOEmbed(meta(), { maxWidth: null, maxHeight: 300 }),
    ).toMatchObject({ width: 400, height: 300 });
  });

  it("respects whichever bound binds first", () => {
    expect(
      getMediaOEmbed(meta(), { maxWidth: 600, maxHeight: 300 }),
    ).toMatchObject({ width: 400, height: 300 });
  });

  it("leaves an image alone when it already fits the bounds", () => {
    expect(
      getMediaOEmbed(meta(), { maxWidth: 2000, maxHeight: 2000 }),
    ).toMatchObject({
      url: "https://ik.example.com/media/1/abc.webp",
      width: 800,
      height: 600,
    });
  });
});
