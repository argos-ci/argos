import type {
  CommentAnchor,
  CommentAnchorSide,
} from "@/database/models/Comment";
import { boom } from "@/util/error";

const SIDES: CommentAnchorSide[] = ["baseline", "compare"];

/** A normalized coordinate must sit within the image, i.e. in [0, 1]. */
function isNormalizedCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Validate an anchor's shape and bounds, throwing a 400 when it doesn't hold.
 * Callers build the anchor from the request input, so its values are untrusted.
 */
export function validateCommentAnchor(anchor: CommentAnchor): void {
  switch (anchor.type) {
    case "point": {
      if (!SIDES.includes(anchor.side)) {
        throw boom(400, "Invalid comment anchor side");
      }
      if (
        !isNormalizedCoordinate(anchor.x) ||
        !isNormalizedCoordinate(anchor.y)
      ) {
        throw boom(400, "Comment anchor coordinates must be between 0 and 1");
      }
      return;
    }
    case "lines": {
      if (!isPositiveInteger(anchor.from) || !isPositiveInteger(anchor.to)) {
        throw boom(400, "Comment anchor lines must be positive integers");
      }
      if (anchor.to < anchor.from) {
        throw boom(400, "Comment anchor line range is inverted");
      }
      return;
    }
    default:
      throw boom(400, "Invalid comment anchor type");
  }
}
