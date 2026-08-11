import { describe, expect, it } from "vitest";

import { Media, MediaVersion } from "@/database/models";

import { buildCommentBody } from "./pull-request-comment";

/**
 * Rows built in memory rather than through the factory: the body is a pure
 * render, and everything it reads is on the two models.
 */
function createMedia(props: Partial<Media> = {}): Media {
  return Media.fromJson(
    {
      id: "1",
      projectId: "1",
      name: "dashboard.png",
      visibility: "public",
      shareToken: "tok1",
      ...props,
    },
    { skipValidation: true },
  );
}

function createVersion(props: Partial<MediaVersion> = {}): MediaVersion {
  return MediaVersion.fromJson(
    {
      id: "1",
      mediaId: "1",
      number: 1,
      key: "media/1/a.png",
      mimeType: "image/png",
      sizeBytes: "1024",
      width: 1440,
      height: 900,
      expiresAt: null,
      ...props,
    },
    { skipValidation: true },
  );
}

function buildBody(
  pairs: { media: Media; version: MediaVersion }[],
  args: { total?: number } = {},
): string {
  return buildCommentBody(
    pairs.map((pair) => pair.media),
    new Map(pairs.map((pair) => [pair.media.id, pair.version])),
    { total: args.total ?? pairs.length },
  );
}

describe("buildCommentBody", () => {
  it("spends the first line on what the comment holds", () => {
    // The only line that survives into an email notification and into the
    // collapsed view of a long thread.
    const body = buildBody([
      { media: createMedia({ id: "1" }), version: createVersion({ id: "1" }) },
      { media: createMedia({ id: "2" }), version: createVersion({ id: "2" }) },
    ]);

    expect(body.split("\n")[0]).toBe("**2 screenshots uploaded by Argos**");
  });

  it("counts recordings apart from screenshots", () => {
    const body = buildBody([
      { media: createMedia({ id: "1" }), version: createVersion({ id: "1" }) },
      {
        media: createMedia({ id: "2" }),
        version: createVersion({ id: "2", mimeType: "video/mp4" }),
      },
    ]);

    expect(body.split("\n")[0]).toBe(
      "**1 screenshot and 1 recording uploaded by Argos**",
    );
  });

  it("says when the list is not the whole list", () => {
    // A truncated list that does not announce itself reads as a complete one,
    // and a reviewer trusts it.
    const body = buildBody(
      [{ media: createMedia(), version: createVersion() }],
      { total: 26 },
    );

    expect(body).toContain("Showing the 1 most recent of 26 media.");
  });

  it("stays quiet when it is showing everything", () => {
    const body = buildBody([
      { media: createMedia(), version: createVersion() },
    ]);

    expect(body).not.toContain("most recent of");
  });

  it("dates the expiry from the media that dies first", () => {
    // Retention is stamped per version at upload, so a comment holding uploads
    // from different weeks loses its pictures one by one — the first date is
    // when it starts being wrong.
    const body = buildBody([
      {
        media: createMedia({ id: "1" }),
        version: createVersion({
          id: "1",
          expiresAt: "2026-10-02T00:00:00.000Z",
        }),
      },
      {
        media: createMedia({ id: "2" }),
        version: createVersion({
          id: "2",
          expiresAt: "2026-09-10T00:00:00.000Z",
        }),
      },
    ]);

    expect(body).toContain("Media expire on September 10, 2026.");
  });

  it("promises no expiry it has no date for", () => {
    const body = buildBody([
      { media: createMedia(), version: createVersion() },
    ]);

    expect(body).not.toContain("Media expire on");
  });

  it("collapses a before/after pair into one block", () => {
    const body = buildBody([
      {
        media: createMedia({ id: "1", state: "before", shareToken: "before" }),
        version: createVersion({ id: "1" }),
      },
      {
        media: createMedia({ id: "2", state: "after", shareToken: "after" }),
        version: createVersion({ id: "2" }),
      },
    ]);

    expect(body.split("\n")[0]).toBe("**1 screenshot uploaded by Argos**");
    expect(body).toContain("| [Before ↗](");
  });

  it("badges a media the share page will not open for everyone", () => {
    // The bytes render for any reader whatever the visibility, so nothing else
    // in the comment hints that the page behind them needs a session.
    const body = buildBody([
      { media: createMedia({ visibility: "team" }), version: createVersion() },
    ]);

    expect(body).toContain("`Team-only`");
  });
});
