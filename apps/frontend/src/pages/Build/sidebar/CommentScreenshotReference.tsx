import { invariant } from "@argos/util/invariant";
import { useSetAtom } from "jotai/react";
import { MapPinIcon, SquareDashedIcon } from "lucide-react";

import {
  commentsVisibleAtom,
  requestedScreenshotCommentIdAtom,
} from "@/containers/Build/CommentTool";
import { getImageAnchor } from "@/containers/Comment/imageAnchor";
import { DocumentType, graphql } from "@/gql";

import { useBuildDiffState } from "../BuildDiffState";
import { ScreenshotDiffThumbnail } from "./ScreenshotDiffThumbnail";

const _ScreenshotDiffFragment = graphql(`
  fragment CommentScreenshotReference_ScreenshotDiff on ScreenshotDiff {
    id
    name
    ...ScreenshotDiffThumbnail_ScreenshotDiff
  }
`);

type ScreenshotDiff = DocumentType<typeof _ScreenshotDiffFragment>;

const _CommentAnchorFragment = graphql(`
  fragment CommentScreenshotReference_CommentAnchor on CommentAnchor {
    ...ImageAnchor_CommentAnchor
    ... on CommentLinesAnchor {
      from
      to
    }
  }
`);

type CommentAnchor = DocumentType<typeof _CommentAnchorFragment>;

/** Short human label for a comment on a line range. */
function getLinesLabel(anchor: CommentAnchor | null): string | null {
  if (anchor?.__typename !== "CommentLinesAnchor") {
    return null;
  }
  return anchor.from === anchor.to
    ? `Line ${anchor.from}`
    : `Lines ${anchor.from}-${anchor.to}`;
}

/**
 * Navigate to the diff a comment is anchored to, or `null` when the comment
 * has no linked snapshot. The diff may not be in the current list (filtered
 * out, or not yet loaded), in which case the callback leaves the view
 * untouched.
 */
export function useGoToCommentDiff(input: {
  commentId: string;
  screenshotDiff: ScreenshotDiff | null;
  anchor: CommentAnchor | null;
}): (() => void) | null {
  const { commentId, screenshotDiff, anchor } = input;
  const { allDiffs, setActiveDiff } = useBuildDiffState();
  const setCommentsVisible = useSetAtom(commentsVisibleAtom);
  const requestOpenComment = useSetAtom(requestedScreenshotCommentIdAtom);
  const isOnImage = getImageAnchor(anchor) !== null;

  if (!screenshotDiff) {
    return null;
  }

  return () => {
    const diff = allDiffs.find(
      (candidate) => candidate.id === screenshotDiff.id,
    );
    if (!diff) {
      return;
    }
    setActiveDiff(diff, true);
    // A comment on a point or an area lives as a marker on the image: reveal
    // comments and ask the screenshot layer to open this one's thread once its
    // diff is shown. (Line-anchored comments render inline on the diff, so
    // navigating there already surfaces them.)
    if (isOnImage) {
      setCommentsVisible(true);
      requestOpenComment(commentId);
    }
  };
}

/**
 * A quote of the screenshot a comment is anchored to, shown at the top of the
 * comment thread. Clicking it navigates to that diff in the viewer; the whole
 * card shares that behavior (see {@link useGoToCommentDiff} in `CommentCard`),
 * this button remains the keyboard-accessible control for it.
 */
export function CommentScreenshotReference(props: {
  commentId: string;
  screenshotDiff: ScreenshotDiff;
  anchor: CommentAnchor | null;
}) {
  const { commentId, screenshotDiff, anchor } = props;
  const goToDiff = useGoToCommentDiff({ commentId, screenshotDiff, anchor });
  invariant(goToDiff, "always navigable: screenshotDiff is provided");
  const linesLabel = getLinesLabel(anchor);
  const imageAnchorType = getImageAnchor(anchor)?.type;

  return (
    <button
      type="button"
      onClick={goToDiff}
      aria-label={`Go to snapshot ${screenshotDiff.name}`}
      // No hover style or default cursor of its own: the surrounding card
      // shares this button's navigation and carries the hover affordance.
      className="text-low focus-ring flex w-full cursor-pointer items-center gap-2 rounded-t-md px-2 py-1.5 text-left text-xs select-none"
    >
      <ScreenshotDiffThumbnail
        screenshotDiff={screenshotDiff}
        className="size-6"
        iconClassName="size-4"
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {screenshotDiff.name}
      </span>
      {imageAnchorType === "point" ? (
        <MapPinIcon className="size-3.5 shrink-0" aria-label="Pinned comment" />
      ) : null}
      {imageAnchorType === "area" ? (
        <SquareDashedIcon
          className="size-3.5 shrink-0"
          aria-label="Comment on an area"
        />
      ) : null}
      {linesLabel ? (
        <span className="shrink-0 tabular-nums">{linesLabel}</span>
      ) : null}
    </button>
  );
}
