import { assertNever } from "@argos/util/assertNever";

import type {
  NormalizedPoint,
  NormalizedRect,
} from "@/containers/Build/projection";
import { graphql, type DocumentType } from "@/gql";
import type { CommentAnchorInput } from "@/gql/graphql";
import { clampFraction } from "@/util/fraction";

const _CommentAnchorFragment = graphql(`
  fragment ImageAnchor_CommentAnchor on CommentAnchor {
    __typename
    ... on CommentPointAnchor {
      x
      y
    }
    ... on CommentAreaAnchor {
      x
      y
      width
      height
    }
  }
`);

/** Where on an image a comment points: a spot, or an area. */
export type ImageAnchor =
  | ({ type: "point" } & NormalizedPoint)
  | ({ type: "area" } & NormalizedRect);

/** The image anchor of a queried comment, null when it points elsewhere. */
export function getImageAnchor(
  anchor: DocumentType<typeof _CommentAnchorFragment> | null | undefined,
): ImageAnchor | null {
  switch (anchor?.__typename) {
    case "CommentPointAnchor":
      return { type: "point", x: anchor.x, y: anchor.y };
    case "CommentAreaAnchor":
      return {
        type: "area",
        x: anchor.x,
        y: anchor.y,
        width: anchor.width,
        height: anchor.height,
      };
    default:
      return null;
  }
}

export function toCommentAnchorInput(anchor: ImageAnchor): CommentAnchorInput {
  switch (anchor.type) {
    case "point":
      return { point: { x: anchor.x, y: anchor.y } };
    case "area":
      return {
        area: {
          x: anchor.x,
          y: anchor.y,
          width: anchor.width,
          height: anchor.height,
        },
      };
    default:
      assertNever(anchor);
  }
}

/**
 * Where the pin's tip goes. An area's pin sits on its top-right corner, so it
 * stands outside the area instead of covering what the comment is about.
 */
export function getAnchorPinPoint(anchor: ImageAnchor): NormalizedPoint {
  switch (anchor.type) {
    case "point":
      return { x: anchor.x, y: anchor.y };
    case "area":
      return { x: anchor.x + anchor.width, y: anchor.y };
    default:
      assertNever(anchor);
  }
}

/**
 * The rectangle two opposite corners span, cut to the image. Null when nothing
 * of it is left, e.g. a drag made entirely beside the image.
 */
export function getRectInImage(
  a: NormalizedPoint,
  b: NormalizedPoint,
): NormalizedRect | null {
  const left = clampFraction(Math.min(a.x, b.x));
  const right = clampFraction(Math.max(a.x, b.x));
  const top = clampFraction(Math.min(a.y, b.y));
  const bottom = clampFraction(Math.max(a.y, b.y));
  if (right <= left || bottom <= top) {
    return null;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
