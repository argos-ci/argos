import config from "@/config";

import { resizePreview, type MediaShareMeta } from "./share-meta";

/** What every oEmbed response carries, whatever its type. */
type OEmbedBase = {
  version: "1.0";
  title: string;
  provider_name: string;
  provider_url: string;
};

/**
 * An oEmbed response, as
 * [the spec](https://oembed.com/#section2.3) defines it.
 *
 * Two of the four types are used. An image answers as `photo`, which is what
 * lets a consumer render the picture itself at a size it chooses. A video
 * answers as `link` with a thumbnail rather than as `video`: the `video` type
 * requires an `html` payload, which means an iframe, and the app sends
 * `frame-ancestors 'none'` — a player nobody may frame is a promise the
 * response cannot keep, and a consumer that believes it renders an empty box.
 */
export type OEmbedResponse =
  | (OEmbedBase & {
      type: "photo";
      url: string;
      width: number;
      height: number;
    })
  | (OEmbedBase & {
      type: "link";
      thumbnail_url: string;
      thumbnail_width?: number;
      thumbnail_height?: number;
    });

/** Consumer-supplied bounds on the returned photo. */
export type OEmbedConstraints = {
  maxWidth: number | null;
  maxHeight: number | null;
};

/**
 * Build the oEmbed answer for a share link.
 *
 * `maxwidth` / `maxheight` are honoured by asking the CDN for a smaller
 * rendition, not by reporting a smaller size for the same bytes: a consumer
 * that asked for 400px is telling us what it is willing to download, and
 * answering with a 4K file scaled down in CSS wastes exactly what it was trying
 * to avoid.
 */
export function getMediaOEmbed(
  meta: MediaShareMeta,
  constraints: OEmbedConstraints,
): OEmbedResponse {
  const base: OEmbedBase = {
    version: "1.0",
    title: meta.name,
    provider_name: "Argos",
    provider_url: config.get("server.url"),
  };

  const image = constrainImage(meta.image, constraints);

  // A video is a link with a still. Also the fallback for an upload whose
  // dimensions were never recorded: `photo` requires them, and inventing a size
  // makes every consumer lay the image out at the wrong shape.
  if (meta.video || !image.width || !image.height) {
    return {
      ...base,
      type: "link",
      thumbnail_url: image.url,
      ...(image.width && image.height
        ? { thumbnail_width: image.width, thumbnail_height: image.height }
        : null),
    };
  }

  return {
    ...base,
    type: "photo",
    url: image.url,
    width: image.width,
    height: image.height,
  };
}

/**
 * Apply the consumer's bounds.
 *
 * `maxheight` is turned into the width that produces it, because that is the
 * only dimension the CDN transformation takes here — resizing on width keeps
 * the ratio, which is the point of both bounds.
 */
function constrainImage(
  image: MediaShareMeta["image"],
  constraints: OEmbedConstraints,
): MediaShareMeta["image"] {
  const { width, height } = image;
  const bounds: number[] = [];

  if (constraints.maxWidth) {
    bounds.push(constraints.maxWidth);
  }

  if (constraints.maxHeight && width && height) {
    bounds.push((constraints.maxHeight * width) / height);
  }

  if (bounds.length === 0) {
    return image;
  }

  return resizePreview(image, Math.floor(Math.min(...bounds)));
}
