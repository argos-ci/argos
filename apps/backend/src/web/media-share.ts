import type { Router } from "express";
import { z } from "zod";

import config from "@/config";
import { getMediaOEmbed } from "@/media/oembed";
import {
  getPublicMediaShareMeta,
  type MediaShareMeta,
} from "@/media/share-meta";

import { asyncHandler } from "./util";

/** Where a consumer asks what a share URL embeds as. */
const OEMBED_PATH = "/oembed";

/**
 * Serve share links so they unfurl.
 *
 * The share page is a single-page app: its `<head>` is written by React once the
 * bundle has run, and no unfurler runs JavaScript. Slack, GitHub, Discord,
 * Notion and every other consumer fetch the HTML and read what is in it — so a
 * link to a screenshot pastes as a bare URL unless the tags are already in the
 * bytes the server sends. That is what this does: the same shell as always, with
 * the media's OpenGraph tags injected for the crawler, plus the oEmbed endpoint
 * the richer consumers ask for after finding its discovery link.
 *
 * Public media only, and {@link getPublicMediaShareMeta} owns why.
 */
export function installMediaShareRoutes(
  router: Router,
  options: {
    /**
     * The built SPA shell to inject into, or `null` in development — where Vite
     * serves its own `index.html` and there is nothing here to rewrite. Sharing
     * a `localhost` link is not a thing anyone does, so the route simply falls
     * through to the SPA.
     */
    shell: string | null;
  },
) {
  const { shell } = options;

  router.get(
    OEMBED_PATH,
    asyncHandler(async (req, res) => {
      const params = OEmbedQuerySchema.safeParse(req.query);

      if (!params.success) {
        res.status(400).json({ error: "Invalid oEmbed request" });
        return;
      }

      const { url, format, maxwidth, maxheight } = params.data;

      // The spec's own answer for a format we do not produce. Only JSON is
      // produced: XML exists in the spec for consumers written before JSON was
      // universal, and none of them are asking.
      if (format === "xml") {
        res.status(501).json({ error: "Only the json format is supported" });
        return;
      }

      const shareToken = readShareToken(url);
      const meta = shareToken
        ? await getPublicMediaShareMeta(shareToken)
        : null;

      if (!meta) {
        // Not "forbidden": a 404 is the only answer that does not tell an
        // anonymous caller whether a private media is behind the token.
        res.status(404).json({ error: "Not found" });
        return;
      }

      // Public data, no credentials, so any origin may read it — a browser-side
      // consumer would otherwise need a proxy to ask a question whose answer is
      // already public.
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(
        getMediaOEmbed(meta, {
          maxWidth: maxwidth ?? null,
          maxHeight: maxheight ?? null,
        }),
      );
    }),
  );

  router.get(
    "/m/:shareToken",
    asyncHandler(async (req, res, next) => {
      if (!shell) {
        next();
        return;
      }

      const { shareToken } = req.params;
      const meta =
        typeof shareToken === "string"
          ? await getPublicMediaShareMeta(shareToken)
          : null;

      if (!meta) {
        // Team-only, expired, or never a token at all: the SPA answers, and its
        // own "unavailable or sign in" state is the right one.
        next();
        return;
      }

      // Same caching rule as the plain shell: it names content-hashed assets.
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Vary", "Accept-Encoding");
      res.type("html").send(injectShareMeta(shell, meta));
    }),
  );
}

/**
 * `maxwidth` / `maxheight` are the consumer's bounds, and the spec sends them as
 * strings. Coerced rather than parsed by hand, and floored at 1 so a `0` or a
 * negative cannot ask the CDN for a zero-width image.
 */
const OEmbedDimension = z.coerce.number().int().min(1).max(10_000).optional();

const OEmbedQuerySchema = z.object({
  url: z.string(),
  format: z.enum(["json", "xml"]).default("json"),
  maxwidth: OEmbedDimension,
  maxheight: OEmbedDimension,
});

/**
 * The share token in a URL a consumer handed us, or `null` when the URL is not
 * one of ours.
 *
 * The host is checked, not just the path: `url` is caller-controlled, and
 * answering for `https://evil.example/m/<token>` would let any site claim our
 * media as its own oEmbed content.
 */
function readShareToken(url: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const serverUrl = new URL(config.get("server.url"));

  if (parsed.host !== serverUrl.host) {
    return null;
  }

  const match = /^\/m\/([^/]+)\/?$/.exec(parsed.pathname);
  return match?.[1] ?? null;
}

/**
 * Splice the unfurl tags into the shell's `<head>`.
 *
 * Appended at the end of the head so they win over the static shell's generic
 * Argos description, which describes the product rather than this picture.
 */
function injectShareMeta(shell: string, meta: MediaShareMeta): string {
  return shell.replace("</head>", `${renderShareMeta(meta)}</head>`);
}

/**
 * The tags themselves: OpenGraph for most consumers, the Twitter card set for
 * the ones that only read those, and the oEmbed discovery link for the ones that
 * would rather ask.
 *
 * `og:image` is a picture in both cases — the file for an image, the poster
 * frame for a video — because a consumer that cannot play the video still
 * renders the card, and one with no image renders as a bare link.
 */
function renderShareMeta(meta: MediaShareMeta): string {
  const description = meta.description ?? `Shared with Argos · ${meta.name}`;

  // OpenGraph is addressed by `property`, the Twitter card set by `name`. Most
  // parsers forgive the wrong one; Twitter's does not.
  const properties: [string, string][] = [
    ["og:type", meta.video ? "video.other" : "website"],
    ["og:site_name", "Argos"],
    ["og:title", meta.name],
    ["og:description", description],
    ["og:url", meta.shareUrl],
    ["og:image", meta.image.url],
    ["og:image:type", meta.image.contentType],
    ["og:image:alt", meta.name],
    // A card with an image but no dimensions is laid out at a guessed shape and
    // reflows once the bytes arrive.
    ...numericTags("og:image:width", meta.image.width),
    ...numericTags("og:image:height", meta.image.height),
    ...(meta.video
      ? ([
          ["og:video", meta.video.url],
          ["og:video:secure_url", meta.video.url],
          ["og:video:type", meta.video.contentType],
        ] satisfies [string, string][])
      : []),
  ];

  const names: [string, string][] = [
    // `summary_large_image` for both: a video would want `player`, which needs a
    // frameable player URL, and the app refuses to be framed.
    ["twitter:card", "summary_large_image"],
    ["twitter:title", meta.name],
    ["twitter:description", description],
    ["twitter:image", meta.image.url],
    ["twitter:image:alt", meta.name],
    // Restated here rather than left to the static shell's `noindex`: this
    // response *is* the shell, and the two would otherwise have to agree by
    // accident. `/m/` is crawlable (see `robots.txt`) precisely so this is read.
    ["robots", "noindex, nofollow"],
  ];

  const oembedUrl = new URL(OEMBED_PATH, config.get("server.url"));
  oembedUrl.searchParams.set("url", meta.shareUrl);
  oembedUrl.searchParams.set("format", "json");

  return [
    ...properties.map(
      ([property, content]) =>
        `<meta property="${escapeHtmlAttribute(property)}" content="${escapeHtmlAttribute(content)}" />`,
    ),
    ...names.map(
      ([name, content]) =>
        `<meta name="${escapeHtmlAttribute(name)}" content="${escapeHtmlAttribute(content)}" />`,
    ),
    `<link rel="alternate" type="application/json+oembed" href="${escapeHtmlAttribute(oembedUrl.href)}" title="${escapeHtmlAttribute(meta.name)}" />`,
  ].join("");
}

function numericTags(
  property: string,
  value: number | null,
): [string, string][] {
  return value === null ? [] : [[property, String(value)]];
}

/**
 * Escape a value for an HTML double-quoted attribute.
 *
 * A media's name and description are caller-controlled and land in the page's
 * `<head>` as-is: a `"` alone closes the attribute, and `<` opens a tag. Both
 * are ordinary characters in a file name.
 */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
