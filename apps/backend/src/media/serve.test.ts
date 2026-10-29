import { describe, expect, it } from "vitest";

import config from "@/config";
import { MediaVersion } from "@/database/models";

import {
  getMediaEmbedPosterUrl,
  getMediaFileUrl,
  getMediaPosterSourceUrl,
  getMediaPosterUrl,
} from "./serve";

/** The CDN base carries an environment segment, so it comes from config. */
const CDN = config.get("s3.publicImageBaseUrl");

const SHARE_URL = "https://app.argos-ci.com/m/abc123";

function media(attributes: {
  key: string;
  mimeType: string;
  posterReadyAt?: string;
}): MediaVersion {
  return MediaVersion.fromJson({
    mediaId: "1",
    number: 1,
    sizeBytes: "1024",
    ...attributes,
  });
}

describe("getMediaFileUrl", () => {
  it("serves from the image CDN, unsigned", () => {
    // Unauthenticated on purpose: GitHub fetches an embedded image server-side
    // with no session of ours, so a URL that required auth could not be embedded
    // in a pull request at all.
    const url = getMediaFileUrl(
      media({ key: "media/1/abc.png", mimeType: "image/png" }),
    );

    expect(url).toBe(`${CDN}media/1/abc.png`);
    expect(url).not.toContain("X-Amz-Signature");
  });
});

describe("getMediaPosterUrl", () => {
  it("serves a ready poster straight from the CDN", () => {
    expect(
      getMediaPosterUrl(
        media({
          key: "media/1/clip.mp4",
          mimeType: "video/mp4",
          posterReadyAt: "2026-10-29T10:00:00.000Z",
        }),
        SHARE_URL,
      ),
    ).toBe(`${CDN}media/1/clip.mp4/ik-thumbnail.jpg?tr=so-1`);
  });

  it("goes through Argos, with no placeholder, until then", () => {
    // Until then the CDN answers with an HTML page, and a player given it as
    // its poster lays out at 0×0.
    expect(
      getMediaPosterUrl(
        media({ key: "media/1/clip.mp4", mimeType: "video/mp4" }),
        SHARE_URL,
      ),
    ).toBe(`${SHARE_URL}/poster/1.jpg?fallback=none`);
  });

  it("returns null for an image", () => {
    expect(
      getMediaPosterUrl(
        media({ key: "media/1/abc.png", mimeType: "image/png" }),
        SHARE_URL,
      ),
    ).toBeNull();
  });
});

describe("getMediaEmbedPosterUrl", () => {
  it("embeds a poster that is not ready yet through Argos", () => {
    // An embed is written once: it cannot wait for the frame, so it points at
    // the endpoint that serves a placeholder until the frame exists.
    expect(
      getMediaEmbedPosterUrl(
        media({ key: "media/1/clip.mp4", mimeType: "video/mp4" }),
        SHARE_URL,
      ),
    ).toBe(`${SHARE_URL}/poster/1.jpg`);
  });

  it("embeds a ready poster from the CDN", () => {
    expect(
      getMediaEmbedPosterUrl(
        media({
          key: "media/1/clip.mp4",
          mimeType: "video/mp4",
          posterReadyAt: "2026-10-29T10:00:00.000Z",
        }),
        SHARE_URL,
      ),
    ).toBe(`${CDN}media/1/clip.mp4/ik-thumbnail.jpg?tr=so-1`);
  });
});

describe("getMediaPosterSourceUrl", () => {
  it("derives a video poster from the CDN rather than storing one", () => {
    expect(
      getMediaPosterSourceUrl(
        media({ key: "media/1/clip.mp4", mimeType: "video/mp4" }),
      ),
    ).toBe(`${CDN}media/1/clip.mp4/ik-thumbnail.jpg?tr=so-1`);
  });

  it("seeks past the first frame, which is often blank", () => {
    const url = getMediaPosterSourceUrl(
      media({ key: "media/1/clip.webm", mimeType: "video/webm" }),
    );
    expect(url).toContain("tr=so-1");
  });
});
