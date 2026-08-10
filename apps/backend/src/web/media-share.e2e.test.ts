import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import config from "@/config";
import { factory, setupDatabase } from "@/database/testing";

import { installMediaShareRoutes } from "./media-share";

/**
 * A stand-in for the built SPA shell. The real one is read off disk at startup
 * and is not present in a test run; all this code does to it is splice tags in
 * before `</head>`, so a minimal head is enough to assert on.
 */
const SHELL = "<!doctype html><html><head><title>Argos</title></head><body>";

/** The shell as served when the route declines to handle a request. */
const FALLTHROUGH = "fell through to the SPA";

function createApp() {
  const app = express();
  installMediaShareRoutes(app, { shell: SHELL });
  // Stands in for the SPA catch-all the real router mounts after this one.
  app.use((_req, res) => {
    res.status(200).type("html").send(FALLTHROUGH);
  });
  return request(app);
}

async function createPublicMedia(attributes?: {
  name?: string;
  description?: string | null;
}) {
  const { media } = await factory.createMediaWithVersion({
    media: {
      name: attributes?.name ?? "checkout.png",
      description: attributes?.description ?? null,
      visibility: "public",
    },
    version: { mimeType: "image/webp", width: 800, height: 600 },
  });
  return media;
}

describe("share page unfurling", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("serves OpenGraph tags in the HTML, where an unfurler can read them", async () => {
    // No unfurler runs JavaScript, so tags the React app sets on mount are tags
    // nobody sees. This is the whole point of the route.
    const media = await createPublicMedia({
      description: "Checkout after the spacing fix.",
    });

    const res = await createApp().get(`/m/${media.shareToken}`).expect(200);

    expect(res.text).toContain(
      '<meta property="og:title" content="checkout.png" />',
    );
    expect(res.text).toContain(
      '<meta property="og:description" content="Checkout after the spacing fix." />',
    );
    expect(res.text).toContain(
      `<meta property="og:url" content="${media.url}" />`,
    );
    expect(res.text).toContain('<meta property="og:image:width" content="800"');
    expect(res.text).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    );
    // The tags land inside the head, not after the document.
    expect(res.text).toContain("</head>");
    expect(res.text.indexOf("og:title")).toBeLessThan(
      res.text.indexOf("</head>"),
    );
  });

  it("advertises the oEmbed endpoint for consumers that would rather ask", async () => {
    const media = await createPublicMedia();

    const res = await createApp().get(`/m/${media.shareToken}`).expect(200);

    expect(res.text).toContain('type="application/json+oembed"');
    // The discovery link points back at this media, url-encoded into the query.
    expect(res.text).toContain(`/oembed?url=${encodeURIComponent(media.url)}`);
    expect(res.text).toContain("format=json");
  });

  it("escapes a file name so it cannot break out of the attribute", async () => {
    // A media's name is caller-controlled and lands in the page head verbatim.
    // A bare `"` closes the attribute and `<` opens a tag — both are ordinary
    // characters in a file name.
    const media = await createPublicMedia({
      name: '"><script>alert(1)</script>.png',
    });

    const res = await createApp().get(`/m/${media.shareToken}`).expect(200);

    expect(res.text).not.toContain("<script>alert(1)</script>");
    expect(res.text).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("keeps a team media out of the tags entirely", async () => {
    // The tags are served to anyone who asks. A team-only media's name is
    // exactly the thing its link was kept private for.
    const { media } = await factory.createMediaWithVersion({
      media: { name: "unreleased-pricing.png", visibility: "team" },
    });

    const res = await createApp().get(`/m/${media.shareToken}`).expect(200);

    expect(res.text).toBe(FALLTHROUGH);
    expect(res.text).not.toContain("unreleased-pricing.png");
  });

  it("leaves an unknown token to the SPA", async () => {
    const res = await createApp().get("/m/not-a-token").expect(200);

    expect(res.text).toBe(FALLTHROUGH);
  });
});

describe("oEmbed endpoint", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("answers for a public share URL", async () => {
    const media = await createPublicMedia();

    const res = await createApp()
      .get("/oembed")
      .query({ url: media.url })
      .expect(200);

    expect(res.body).toMatchObject({
      version: "1.0",
      type: "photo",
      title: "checkout.png",
      provider_name: "Argos",
      width: 800,
      height: 600,
    });
  });

  it("honours maxwidth", async () => {
    const media = await createPublicMedia();

    const res = await createApp()
      .get("/oembed")
      .query({ url: media.url, maxwidth: "400" })
      .expect(200);

    expect(res.body).toMatchObject({ width: 400, height: 300 });
  });

  it("refuses a URL on another host", async () => {
    // `url` is caller-controlled. Answering for someone else's host would let
    // any site claim our media as its own oEmbed content.
    const media = await createPublicMedia();
    const foreign = new URL(media.url);

    const res = await createApp()
      .get("/oembed")
      .query({ url: `https://evil.example${foreign.pathname}` });

    expect(res.status).toBe(404);
  });

  it("refuses a team media the same way it refuses a missing one", async () => {
    // Same 404 for both: telling them apart tells an anonymous caller that a
    // private media is behind the token.
    const { media } = await factory.createMediaWithVersion({
      media: { visibility: "team" },
    });

    const team = await createApp().get("/oembed").query({ url: media.url });
    const missing = await createApp()
      .get("/oembed")
      .query({ url: new URL("/m/not-a-token", config.get("server.url")).href });

    expect(team.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("rejects a request with no url at all", async () => {
    const res = await createApp().get("/oembed");

    expect(res.status).toBe(400);
  });

  it("reports the xml format as not implemented, as the spec asks", async () => {
    const media = await createPublicMedia();

    const res = await createApp()
      .get("/oembed")
      .query({ url: media.url, format: "xml" });

    expect(res.status).toBe(501);
  });
});
