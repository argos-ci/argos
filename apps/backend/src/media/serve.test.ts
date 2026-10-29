import { describe, expect, it } from "vitest";

import config from "@/config";
import { MediaVersion } from "@/database/models";

import {
  getMediaFileUrl,
  getMediaPosterSourceUrl,
  getMediaPosterUrl,
} from "./serve";

/** The CDN base carries an environment segment, so it comes from config. */
const CDN = config.get("s3.publicImageBaseUrl");

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
  it("serves a video's poster once the CDN has produced it", () => {
    expect(
      getMediaPosterUrl(
        media({
          key: "media/1/clip.mp4",
          mimeType: "video/mp4",
          posterReadyAt: "2026-10-29T10:00:00.000Z",
        }),
      ),
    ).toBe(`${CDN}media/1/clip.mp4/ik-thumbnail.jpg?tr=so-1`);
  });

  it("holds the poster back until then", () => {
    // Until then the CDN answers with an HTML page: a broken image in a pull
    // request, and a player collapsed to 0×0 on the share page.
    expect(
      getMediaPosterUrl(
        media({ key: "media/1/clip.mp4", mimeType: "video/mp4" }),
      ),
    ).toBeNull();
  });

  it("returns null for an image", () => {
    expect(
      getMediaPosterUrl(
        media({ key: "media/1/abc.png", mimeType: "image/png" }),
      ),
    ).toBeNull();
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
