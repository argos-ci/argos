import sharp from "sharp";

import { MediaVersion } from "@/database/models";
import { getRedisClient } from "@/util/redis/client";

import { getMediaPosterSourceUrl } from "./serve";

/**
 * How long a request for a poster gives the CDN before answering without the
 * frame. Well under what an image proxy waits for us: GitHub's gave up on
 * ImageKit's 15-second "being prepared" answer with a 504, which is what broke
 * the pull request comment on 2026-10-29.
 */
const POSTER_REQUEST_TIMEOUT_MS = 4_000;

/**
 * At most one request for a given poster asks the CDN per this interval, across
 * every web process. The rest answer from what is known, so a burst of views of
 * a pull request while the CDN is stalled costs the CDN one request.
 */
const POSTER_PROBE_INTERVAL_MS = 10_000;

type PosterFrame = {
  bytes: Buffer;
  contentType: string;
  width: number | null;
  height: number | null;
};

/**
 * Ask the CDN for a video's poster frame, and mark it ready once the answer is
 * an image. Returns the frame, or `null` while the CDN has none.
 *
 * The frame also gives the video its dimensions, which the upload check cannot
 * read: they live in a `moov` atom that may sit at the end of the file.
 */
export async function probeMediaPoster(
  version: MediaVersion,
  options: { timeout: number },
): Promise<PosterFrame | null> {
  const frame = await fetchPosterFrame(
    getMediaPosterSourceUrl(version),
    options.timeout,
  );
  if (!frame) {
    return null;
  }

  await MediaVersion.query()
    .findById(version.id)
    .whereNull("posterReadyAt")
    .patch({
      posterReadyAt: new Date().toISOString(),
      width: frame.width,
      height: frame.height,
    });

  return frame;
}

/**
 * {@link probeMediaPoster} for a request: `null` without asking when another
 * request for the same poster asked within the interval.
 */
export async function probeMediaPosterForRequest(
  version: MediaVersion,
): Promise<PosterFrame | null> {
  const redis = await getRedisClient();
  const claimed = await redis.set(`media-poster-probe.${version.id}`, "1", {
    expiration: { type: "PX", value: POSTER_PROBE_INTERVAL_MS },
    condition: "NX",
  });
  if (claimed !== "OK") {
    return null;
  }
  return probeMediaPoster(version, { timeout: POSTER_REQUEST_TIMEOUT_MS });
}

let placeholder: Promise<Buffer> | null = null;

/**
 * What an embed shows while the CDN has no frame yet: a play button on a
 * neutral ground, so a pull request reads "a video goes here" rather than
 * "something broke".
 *
 * A JPEG like the frame it stands in for, so an unfurl can declare one content
 * type for both. Shapes only — no text, which would need fonts the image does
 * not ship. Rendered once per process.
 */
export function getMediaPosterPlaceholder(): Promise<Buffer> {
  placeholder ??= sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
        <rect width="1280" height="720" fill="#2b2d31"/>
        <circle cx="640" cy="360" r="72" fill="#ffffff" fill-opacity="0.9"/>
        <path d="M618 322 L618 398 L680 360 Z" fill="#2b2d31"/>
      </svg>`,
    ),
  )
    .jpeg({ quality: 80 })
    .toBuffer();
  return placeholder;
}

/**
 * Fetch a poster frame, or `null` while the CDN has none. A timeout is the CDN
 * stalling seen from our side: not an error, the frame just isn't there yet.
 */
async function fetchPosterFrame(
  url: string,
  timeout: number,
): Promise<PosterFrame | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
    });
    return await readPosterFrame(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return null;
    }
    throw error;
  }
}

/**
 * The frame, when the CDN answered with one; `null` otherwise.
 *
 * Only a `200` carrying an image counts. ImageKit's "being prepared" answer is
 * a `202` with an HTML body, and its answer for a file it cannot take a frame
 * from is a `400` with one.
 */
export async function readPosterFrame(
  response: Response,
): Promise<PosterFrame | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 200 || !contentType.startsWith("image/")) {
    await response.body?.cancel();
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  return {
    bytes,
    contentType,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}
