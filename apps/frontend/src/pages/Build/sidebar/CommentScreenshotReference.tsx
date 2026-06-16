import { ImageIcon, MapPinIcon } from "lucide-react";
import { Button } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState } from "../BuildDiffState";

const _ScreenshotDiffFragment = graphql(`
  fragment CommentScreenshotReference_ScreenshotDiff on ScreenshotDiff {
    id
    name
    compareScreenshot {
      id
      url
    }
    baseScreenshot {
      id
      url
    }
  }
`);

type ScreenshotDiff = DocumentType<typeof _ScreenshotDiffFragment>;

/**
 * The comment's anchor as queried on the `Comment.anchor` union. Kept
 * structural (rather than importing a generated type) so the reference renders
 * the same way wherever the union is selected.
 */
export type CommentAnchor =
  | { __typename: "CommentPointAnchor"; x: number; y: number }
  | { __typename: "CommentLinesAnchor"; from: number; to: number };

/** Short human label describing where on the diff a comment points. */
function getAnchorLabel(anchor: CommentAnchor | null): string | null {
  if (!anchor) {
    return null;
  }
  switch (anchor.__typename) {
    case "CommentLinesAnchor":
      return anchor.from === anchor.to
        ? `Line ${anchor.from}`
        : `Lines ${anchor.from}–${anchor.to}`;
    case "CommentPointAnchor":
      return null;
    default:
      return null;
  }
}

/**
 * A quote of the screenshot a comment is anchored to, shown at the top of the
 * comment thread. Clicking it navigates to that diff in the viewer.
 */
export function CommentScreenshotReference(props: {
  screenshotDiff: ScreenshotDiff;
  anchor: CommentAnchor | null;
}) {
  const { screenshotDiff, anchor } = props;
  const { allDiffs, setActiveDiff } = useBuildDiffState();
  const thumbnailUrl =
    screenshotDiff.compareScreenshot?.url ??
    screenshotDiff.baseScreenshot?.url ??
    null;
  const linesLabel = getAnchorLabel(anchor);
  const isPoint = anchor?.__typename === "CommentPointAnchor";

  // Jump to the referenced diff. It may not be in the current list (filtered
  // out, or not yet loaded), in which case we leave the view untouched.
  const goToDiff = () => {
    const diff = allDiffs.find(
      (candidate) => candidate.id === screenshotDiff.id,
    );
    if (diff) {
      setActiveDiff(diff, true);
    }
  };

  return (
    <Tooltip content="Go to this snapshot">
      <Button
        onPress={goToDiff}
        aria-label={`Go to snapshot ${screenshotDiff.name}`}
        className="text-low hover:bg-hover hover:text-default rac-focus flex w-full items-center gap-2 rounded-t-md px-2 py-1.5 text-left text-xs transition select-none"
      >
        {thumbnailUrl ? (
          <span className="block size-6 shrink-0 overflow-hidden rounded-sm border bg-white">
            <ImageKitPicture
              src={thumbnailUrl}
              transformations={["w-32", "h-32", "c-at_max"]}
              className="size-full object-contain"
              alt=""
            />
          </span>
        ) : (
          <ImageIcon className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {screenshotDiff.name}
        </span>
        {isPoint ? (
          <MapPinIcon
            className="size-3.5 shrink-0"
            aria-label="Pinned comment"
          />
        ) : null}
        {linesLabel ? (
          <span className="shrink-0 tabular-nums">{linesLabel}</span>
        ) : null}
      </Button>
    </Tooltip>
  );
}
